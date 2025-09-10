const Ant = require("ant-plus");
const { EventEmitter } = require("events");
const { MockHRMService } = require("./mock-hrm-service");

class AntPlusService extends EventEmitter {
  constructor({ mockMode = false } = {}) {
    super();
    this.stick = null;
    this.devices = new Map();
    this.sensors = {};
    this.activeDevices = new Set();
    this.hrSensors = [];
    this.isScanning = false;
    this.calorieTracking = new Map(); // Track calories per device
    this.updateInterval = null;
    this.isShuttingDown = false;
    this.mockMode = mockMode;
    this.mockService = mockMode ? new MockHRMService() : null;
  }

  async startScanning() {
    if (this.isScanning) {
      return { success: true };
    }
    if (this.mockMode && this.mockService) {
      // Forward all events from mock service
      this.mockService.on("heartRateData", (data) => this.emit("heartRateData", data));
      this.mockService.on("deviceConnected", (device) => this.emit("deviceConnected", device));
      this.mockService.on("deviceDisconnected", (deviceId) =>
        this.emit("deviceDisconnected", deviceId)
      );

      this.mockService.startMocking();
      this.isScanning = true;
      return { success: true, mock: true };
    }
    try {
      console.log("Initializing ANT+ stick...");
      this.stick = new Ant.GarminStick2();

      this.stick.on("data", (data) => {
        const eventId = data.toString("hex");
        if (process.env.DEBUG_ANT) {
          console.log("Raw ANT+ event:", eventId);
        }
        this.handleRawAntEvent(eventId);
      });
      this.stick.on("startup", () => {
        console.log("ANT+ Dongle started");
        this.isScanning = true;
        for (let i = 0; i < 8; i++) {
          this.addHRSensor(i);
        }
        this.startPeriodicUpdates();
      });
      this.stick.on("shutdown", () => {
        console.log("ANT+ stick shutdown");
        this.isScanning = false;
      });
      const opened = this.stick.open();
      if (!opened) {
        // In non-mock mode, throw error as before
        throw new Error("ANT_DEVICE_NOT_CONNECTED");
      }
      return { success: true };
    } catch (error) {
      // Only throw error if not in mock mode
      if (this.mockMode) {
        // Never throw hardware errors in mock mode
        this.startMockData();
        this.isScanning = true;
        return { success: true, mock: true };
      }
      console.error("Failed to initialize ANT+ stick:", error);
      if (error.message === "ANT_DEVICE_NOT_CONNECTED") {
        throw new Error("ANT+ USB dongle not found! Please ensure it is connected.");
      }
      throw new Error(`ANT+ initialization failed: ${error.message}`);
    }
  }

  handleRawAntEvent(eventId) {
    // Handle known events without logging to reduce noise
    const knownEvents = [
      "a40340010109ee", // Device scan event
      "a40340030109ec", // Device connection event
      "a403400101", // Common heartbeat events
      "a403400301" // Common data events
    ];

    const isKnownEvent = knownEvents.some((known) => eventId.startsWith(known));

    // Only log unknown events if debugging is enabled
    if (!isKnownEvent && process.env.DEBUG_ANT) {
      console.log("Unknown ANT+ event:", eventId);
    }
  }

  addHRSensor(channel) {
    const hrSensor = new Ant.HeartRateSensor(this.stick);

    hrSensor.on("hbdata", (data) => {
      // ✅ Defensive check to avoid crashes
      if (!data || typeof data.DeviceID === "undefined") {
        if (process.env.DEBUG_ANT) {
          console.warn(`Invalid hbdata received on channel ${channel}:`, data);
        }
        return;
      }

      // First time we see a real DeviceID on a wildcard (0), rebind it
      if (data.DeviceID !== 0 && !this.activeDevices.has(data.DeviceID)) {
        console.log(`Locking channel ${channel} to device ${data.DeviceID}`);
        this.activeDevices.add(data.DeviceID);
        try {
          hrSensor.detach(); // Detach wildcard
          hrSensor.attach(channel, data.DeviceID); // Lock to real device
        } catch (e) {
          console.error(`Failed to rebind channel ${channel}:`, e);
        }
      }

      if (data.DeviceID !== 0) {
        this.handleHeartRateData(data);
      }
    });

    hrSensor.on("error", (error) => {
      console.error(`Error on HR sensor channel ${channel}:`, error);
    });

    hrSensor.on("attached", (data) => {
      console.log(`Heart rate sensor attached on channel ${channel}:`, data);
    });

    hrSensor.on("detached", (data) => {
      console.log(`Heart rate sensor detached from channel ${channel}:`, data);
      if (data?.DeviceID) {
        this.handleDeviceDetached(data.DeviceID);
      }
    });

    // Start in wildcard mode
    try {
      hrSensor.attach(channel, 0);
      this.hrSensors.push(hrSensor);
    } catch (error) {
      console.error(`Failed to attach HR sensor on channel ${channel}:`, error);
    }
  }

  handleHeartRateData(data) {
    if (!data || typeof data.DeviceID === "undefined") {
      if (process.env.DEBUG_ANT) {
        console.warn("Received invalid heart rate data:", data);
      }
      return;
    }

    const deviceId = data.DeviceID.toString();
    const heartRate = data.ComputedHeartRate || 0;

    if (heartRate === 0) return;

    let device = this.devices.get(deviceId);

    if (!device) {
      device = {
        id: deviceId,
        name: `Participant ${this.devices.size + 1}`,
        heartRate: 0,
        lastUpdate: new Date(),
        connected: true,
        calories: 0,
        zone: 1
      };
      this.devices.set(deviceId, device);
      this.calorieTracking.set(deviceId, { lastUpdate: Date.now(), totalCalories: 0 });
      this.emit("deviceConnected", device);
    }

    // Update device data
    const now = Date.now();
    const lastUpdate = this.calorieTracking.get(deviceId)?.lastUpdate || now;
    const timeDiffMinutes = (now - lastUpdate) / (1000 * 60);

    // Simple calorie calculation based on heart rate
    const caloriesPerMinute = this.calculateCaloriesPerMinute(heartRate);
    const additionalCalories = caloriesPerMinute * timeDiffMinutes;

    device.heartRate = heartRate;
    device.lastUpdate = new Date();
    device.connected = true;
    device.zone = this.calculateHeartRateZone(heartRate);
    device.calories += additionalCalories;

    // Update calorie tracking
    this.calorieTracking.set(deviceId, {
      lastUpdate: now,
      totalCalories: device.calories
    });

    // Store in sensors object for compatibility
    this.sensors[deviceId] = heartRate;

    const heartRateData = {
      deviceId,
      heartRate,
      timestamp: new Date()
    };

    this.emit("heartRateData", heartRateData);
  }

  handleDeviceDetached(deviceId) {
    const device = this.devices.get(deviceId.toString());
    if (device) {
      device.connected = false;
      this.emit("deviceDisconnected", deviceId.toString());
    }
    this.activeDevices.delete(deviceId);
  }

  calculateCaloriesPerMinute(heartRate) {
    // Basic calorie estimation - can be improved with user weight/age
    if (heartRate < 100) return 3;
    if (heartRate < 130) return 6;
    if (heartRate < 160) return 10;
    return 15;
  }

  calculateHeartRateZone(heartRate) {
    if (heartRate < 100) return 1; // Warm-up (blue)
    if (heartRate < 130) return 2; // Fat burn (green)
    if (heartRate < 160) return 3; // Cardio (orange)
    return 4; // Peak (red)
  }

  startPeriodicUpdates() {
    // Clear any existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    // Send updates every second
    this.updateInterval = setInterval(() => {
      if (this.isShuttingDown) return;

      const output = Object.entries(this.sensors)
        .map(([id, hr]) => `${id}:${hr}`)
        .join(", ");
      if (output) {
        console.log("Active devices:", output);
      }

      // Check for stale devices (no update in 10 seconds)
      const now = Date.now();
      for (const [deviceId, device] of this.devices.entries()) {
        if (device.connected && now - device.lastUpdate.getTime() > 10000) {
          device.connected = false;
          this.emit("deviceDisconnected", deviceId);
        }
      }
    }, 1000);
  }

  async stopScanning() {
    console.log("Stopping ANT+ scanning...");
    this.isScanning = false;
    this.isShuttingDown = true;
    if (this.mockMode && this.mockService) {
      this.mockService.stopMocking();
      console.log("Stopped mock heart rate data");
      return;
    }
    // Clear the update interval first
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const detachPromises = this.hrSensors.map(async (sensor, index) => {
      try {
        console.log(`Detaching sensor ${index}...`);
        await new Promise((resolve) => {
          try {
            sensor.detach();
            resolve();
          } catch (error) {
            console.error(`Error detaching sensor ${index}:`, error);
            resolve();
          }
        });
      } catch (error) {
        console.error(`Failed to detach sensor ${index}:`, error);
      }
    });
    await Promise.all(detachPromises);
    this.hrSensors.length = 0;
    this.sensors = {};
    this.activeDevices.clear();
    if (this.stick) {
      try {
        console.log("Closing ANT+ stick...");
        await new Promise((resolve) => setTimeout(resolve, 200));
        this.stick.close();
        console.log("ANT+ stick closed successfully");
      } catch (error) {
        console.error("Error closing ANT+ stick:", error);
      }
      this.stick = null;
    }
    this.isShuttingDown = false;
    console.log("ANT+ scanning stopped successfully");
  }

  getDevices() {
    if (this.mockMode && this.mockService) {
      return this.mockService.getDevices();
    }
    return Array.from(this.devices.values());
  }

  updateDeviceName(deviceId, name) {
    if (this.mockMode && this.mockService) {
      this.mockService.updateDeviceName(deviceId, name);
      return;
    }
    const device = this.devices.get(deviceId);
    if (device) {
      device.name = name;
    }
  }
}

module.exports = { AntPlusService };
