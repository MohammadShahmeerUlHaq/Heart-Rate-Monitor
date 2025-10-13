const Ant = require("ant-plus");
const { EventEmitter } = require("events");
const { MockHRMService } = require("./mock-hrm-service");
const fs = require("fs");
const path = require("path");

class AntPlusService extends EventEmitter {
  constructor({ mockMode = false } = {}) {
    super();
    this.stick = null;
    this.devices = new Map();
    this.sensors = {};
    this.deviceChannelMap = new Map(); // deviceId -> channel
    this.channelSensorMap = new Map(); // channel -> sensor
    this.deviceChannelMapPath = path.join(__dirname, "device-channel-map.json");
    // load persisted mapping if available
    try {
      if (fs.existsSync(this.deviceChannelMapPath)) {
        const raw = fs.readFileSync(this.deviceChannelMapPath, "utf8");
        const obj = JSON.parse(raw || "{}");
        for (const [k, v] of Object.entries(obj)) {
          this.deviceChannelMap.set(k, v);
        }
        if (process.env.DEBUG_ANT)
          console.log(
            "Loaded deviceChannelMap from disk:",
            Object.entries(obj),
          );
      }
    } catch (e) {
      console.error("Failed to load device-channel map:", e);
    }
    this.activeDevices = new Set();
    this.hrSensors = [];
    this.isScanning = false;
    this.calorieTracking = new Map(); // Track calories per device
    this.updateInterval = null;
    this.isShuttingDown = false;
    this.mockMode = mockMode;
    this.mockService = mockMode ? new MockHRMService() : null;

    // Connection stability tracking
    this.lastConnectionChange = new Map(); // Track last connection change time per device
    this.connectionDebounceMs = 2000; // Debounce connection status changes for 2 seconds
  }

  async startScanning() {
    if (this.isScanning) {
      return { success: true };
    }
    if (this.mockMode && this.mockService) {
      // Forward all events from mock service
      this.mockService.on("heartRateData", (data) =>
        this.emit("heartRateData", data),
      );
      this.mockService.on("deviceConnected", (device) =>
        this.emit("deviceConnected", device),
      );
      this.mockService.on("deviceDisconnected", (deviceId) =>
        this.emit("deviceDisconnected", deviceId),
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
        throw new Error(
          "ANT+ USB dongle not found! Please ensure it is connected.",
        );
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
      "a403400301", // Common data events
    ];

    const isKnownEvent = knownEvents.some((known) => eventId.startsWith(known));

    // Only log unknown events if debugging is enabled
    if (!isKnownEvent && process.env.DEBUG_ANT) {
      console.log("Unknown ANT+ event:", eventId);
    }
  }

  addHRSensor(channel) {
    const hrSensor = new Ant.HeartRateSensor(this.stick);

    hrSensor.on("hbdata", async (data) => {
      // ✅ Defensive check to avoid crashes
      if (!data || typeof data.DeviceID === "undefined") {
        if (process.env.DEBUG_ANT) {
          console.warn(`Invalid hbdata received on channel ${channel}:`, data);
        }
        return;
      }

      if (process.env.DEBUG_ANT) {
        console.log(
          `hbdata chan=${channel} DeviceID=${data.DeviceID} ComputedHR=${data.ComputedHeartRate} payload=`,
          data,
        );
        console.log("activeDevices:", Array.from(this.activeDevices));
        console.log(
          "deviceChannelMap:",
          Array.from(this.deviceChannelMap.entries()),
        );
      }

      // First time we see a real DeviceID on a wildcard (0), or when a device shows up again, bind it
      if (
        data.DeviceID !== 0 &&
        !this.activeDevices.has(data.DeviceID.toString())
      ) {
        const idStr = data.DeviceID.toString();
        console.log(`hbdata: discovered device ${idStr} on channel ${channel}`);
        this.activeDevices.add(idStr);
        try {
          const knownChannel = this.deviceChannelMap.get(idStr);
          if (typeof knownChannel !== "undefined" && knownChannel !== channel) {
            // Prefer remembered channel
            if (process.env.DEBUG_ANT)
              console.log(
                `hbdata: device ${idStr} has remembered channel ${knownChannel}; attempting rebind there first`,
              );
            const rebound = await this.attachWithRetry(
              knownChannel,
              parseInt(idStr, 10),
            );
            if (rebound) {
              // update mappings
              this.channelSensorMap.set(
                knownChannel,
                this.channelSensorMap.get(knownChannel) || hrSensor,
              );
              this.deviceChannelMap.set(idStr, knownChannel);
              try {
                fs.writeFileSync(
                  this.deviceChannelMapPath,
                  JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                  "utf8",
                );
              } catch (e) {}
              if (process.env.DEBUG_ANT)
                console.log(
                  `hbdata: rebound device ${idStr} to remembered channel ${knownChannel}`,
                );
            } else {
              if (process.env.DEBUG_ANT)
                console.log(
                  `hbdata: failed to bind to remembered channel ${knownChannel}, falling back to current channel ${channel}`,
                );
              try {
                hrSensor.detach();
                hrSensor.attach(channel, data.DeviceID);
              } catch (e) {
                if (process.env.DEBUG_ANT)
                  console.error("hbdata: fallback attach failed", e);
              }
              this.deviceChannelMap.set(idStr, channel);
              this.channelSensorMap.set(channel, hrSensor);
              try {
                fs.writeFileSync(
                  this.deviceChannelMapPath,
                  JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                  "utf8",
                );
              } catch (e) {}
            }
          } else {
            // No remembered channel or already on that channel - bind current
            try {
              hrSensor.detach();
              hrSensor.attach(channel, data.DeviceID);
            } catch (e) {
              if (process.env.DEBUG_ANT)
                console.error("hbdata: attach failed", e);
            }
            this.deviceChannelMap.set(idStr, channel);
            this.channelSensorMap.set(channel, hrSensor);
            try {
              fs.writeFileSync(
                this.deviceChannelMapPath,
                JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                "utf8",
              );
            } catch (e) {}
            if (process.env.DEBUG_ANT)
              console.log(
                `hbdata: mapped device ${idStr} -> channel ${channel}`,
              );
          }
        } catch (e) {
          console.error(
            `hbdata: Failed to bind channel ${channel} for device ${idStr}:`,
            e,
          );
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
      if (process.env.DEBUG_ANT)
        console.log(
          `Heart rate sensor detached from channel ${channel}:`,
          data,
        );
      // Some detach events don't include DeviceID; find the mapped device for this channel
      let deviceId = data?.DeviceID?.toString();
      if (!deviceId) {
        // find device that mapped to this channel
        for (const [devId, ch] of this.deviceChannelMap.entries()) {
          if (ch === channel) {
            deviceId = devId;
            break;
          }
        }
      }

      if (deviceId) {
        if (process.env.DEBUG_ANT)
          console.log(
            `Detached event maps to device ${deviceId}, handling detach.`,
          );
        this.handleDeviceDetached(deviceId);
      } else {
        // If no device mapping, try to reattach this sensor as wildcard so the channel continues scanning
        if (process.env.DEBUG_ANT)
          console.log(
            `No device mapping for channel ${channel}; re-attaching as wildcard.`,
          );
        try {
          // Use the hrSensor instance to reattach to wildcard
          hrSensor.attach(channel, 0);
          this.channelSensorMap.set(channel, hrSensor);
        } catch (e) {
          if (process.env.DEBUG_ANT)
            console.error(
              `Failed to reattach sensor ${channel} to wildcard after detached:`,
              e,
            );
          // ensure mapping cleaned up so future attach can recreate
          this.channelSensorMap.delete(channel);
        }
      }
    });

    // Start in wildcard mode
    try {
      hrSensor.attach(channel, 0);
      this.hrSensors.push(hrSensor);
      this.channelSensorMap.set(channel, hrSensor);
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
        zone: 1,
      };
      this.devices.set(deviceId, device);
      this.calorieTracking.set(deviceId, {
        lastUpdate: Date.now(),
        totalCalories: 0,
      });
      this.debouncedEmitConnectionChange("deviceConnected", device);
      // device.connected = true;
      // If this device was previously known to have a channel mapping, just track it
      const knownChannel = this.deviceChannelMap.get(deviceId);
      if (typeof knownChannel !== "undefined") {
        // Just ensure the device is in active devices, don't rebind unnecessarily
        this.activeDevices.add(deviceId);
        if (process.env.DEBUG_ANT)
          console.log(
            `Device ${deviceId} reconnected on known channel ${knownChannel}`,
          );
      }
    }
    // else if (!device.connected) {
    //   // Device was previously disconnected but is now sending data again
    //   device.connected = true;
    //   console.log(`Device ${deviceId} (${device.name}) reconnected`);
    //   this.emit("deviceConnected", device);
    // }

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

    // If we have a channel mapping, ensure it's pointing correctly
    if (
      !this.deviceChannelMap.has(deviceId) &&
      (data.channel !== undefined || data.channelId !== undefined)
    ) {
      // prefer explicit channel from data if present
      const ch = data.channel !== undefined ? data.channel : data.channelId;
      this.deviceChannelMap.set(deviceId, ch);
      if (process.env.DEBUG_ANT)
        console.log(`Mapping device ${deviceId} -> channel ${ch}`);
    }

    if (process.env.DEBUG_ANT) {
      console.log(
        `handleHeartRateData: device=${deviceId} hr=${heartRate} lastUpdate=${device.lastUpdate} connected=${device.connected}`,
      );
      console.log(
        "deviceChannelMap now:",
        Array.from(this.deviceChannelMap.entries()),
      );
      console.log(
        "channelSensorMap keys:",
        Array.from(this.channelSensorMap.keys()),
      );
    }

    // Update calorie tracking
    this.calorieTracking.set(deviceId, {
      lastUpdate: now,
      totalCalories: device.calories,
    });

    // Store in sensors object for compatibility
    this.sensors[deviceId] = heartRate;

    const heartRateData = {
      deviceId,
      heartRate,
      timestamp: new Date(),
    };

    this.emit("heartRateData", heartRateData);
  }

  handleDeviceDetached(deviceId) {
    const idStr = deviceId?.toString();
    const device = this.devices.get(idStr);
    if (device) {
      device.connected = false;
      this.debouncedEmitConnectionChange("deviceDisconnected", idStr);
    }
    this.activeDevices.delete(idStr);

    // Don't immediately rebind - let the normal scanning handle reconnection
    // This prevents the aggressive detach/attach cycle that causes flickering
    if (process.env.DEBUG_ANT)
      console.log(
        `Device ${idStr} detached, will be rediscovered through normal scanning`,
      );
  }

  // Debounced connection status change to prevent flickering
  debouncedEmitConnectionChange(eventType, deviceIdOrDevice) {
    const now = Date.now();
    const deviceId =
      typeof deviceIdOrDevice === "string"
        ? deviceIdOrDevice
        : deviceIdOrDevice.id;
    const lastChange = this.lastConnectionChange.get(deviceId) || 0;

    // Only emit if enough time has passed since last change
    if (now - lastChange > this.connectionDebounceMs) {
      this.lastConnectionChange.set(deviceId, now);
      this.emit(eventType, deviceIdOrDevice);
      if (process.env.DEBUG_ANT)
        console.log(`Emitted ${eventType} for device ${deviceId}`);
    } else {
      if (process.env.DEBUG_ANT)
        console.log(
          `Debounced ${eventType} for device ${deviceId} (too soon since last change)`,
        );
    }
  }

  // Rebind the sensor channel to wildcard (0) so the channel can rediscover devices when they come back
  rebindChannelForDevice(deviceId) {
    if (!deviceId) return;
    const channel = this.deviceChannelMap.get(deviceId);
    if (typeof channel === "undefined") return;

    const sensor = this.channelSensorMap.get(channel);
    if (!sensor) {
      // remove stale mapping
      this.deviceChannelMap.delete(deviceId);
      this.channelSensorMap.delete(channel);
      return;
    }

    try {
      // Detach the sensor from the specific device and reattach as wildcard for rediscovery
      sensor.detach();
      // small delay to ensure detach completes
      setTimeout(async () => {
        try {
          const ok = await this.attachWithRetry(channel, 0);
          if (ok) {
            // remove device->channel mapping since channel is now wildcard
            this.deviceChannelMap.delete(deviceId);
            // keep channelSensorMap pointing to sensor
            this.channelSensorMap.set(channel, sensor);
            try {
              fs.writeFileSync(
                this.deviceChannelMapPath,
                JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                "utf8",
              );
            } catch (e) {}
            if (process.env.DEBUG_ANT)
              console.log(
                `Rebound channel ${channel} to wildcard for device ${deviceId}`,
              );
          } else {
            if (process.env.DEBUG_ANT)
              console.error(
                `attachWithRetry failed to reattach channel ${channel} to wildcard`,
              );
          }
        } catch (e) {
          if (process.env.DEBUG_ANT)
            console.error(
              `Failed to reattach sensor ${channel} to wildcard:`,
              e,
            );
        }
      }, 500);
    } catch (e) {
      if (process.env.DEBUG_ANT)
        console.error(`Error detaching sensor for device ${deviceId}:`, e);
    }
  }

  // Attempt to attach to a channel with retries
  attachWithRetry(channel, deviceId, maxRetries = 3) {
    return new Promise((resolve) => {
      let attempt = 0;
      const tryAttach = () => {
        attempt++;
        try {
          const sensor = this.channelSensorMap.get(channel);
          if (!sensor) {
            if (process.env.DEBUG_ANT)
              console.log(`attachWithRetry: no sensor for channel ${channel}`);
            return resolve(false);
          }
          if (process.env.DEBUG_ANT)
            console.log(
              `attachWithRetry attempt ${attempt} channel=${channel} deviceId=${deviceId}`,
            );
          sensor.detach();
          sensor.attach(channel, deviceId);
          // success
          return resolve(true);
        } catch (err) {
          if (process.env.DEBUG_ANT)
            console.error(
              `attachWithRetry attempt ${attempt} failed for channel ${channel}:`,
              err,
            );
          if (attempt >= maxRetries) return resolve(false);
          // exponential backoff
          const delay = 200 * Math.pow(2, attempt - 1);
          setTimeout(tryAttach, delay);
        }
      };
      tryAttach();
    });
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

      // Check for stale devices (no update in 15 seconds for more stable detection)
      const now = Date.now();
      for (const [deviceId, device] of this.devices.entries()) {
        if (device.connected && now - device.lastUpdate.getTime() > 15000) {
          // Only mark as disconnected if we haven't recently changed its status
          const lastChange = this.lastConnectionChange.get(deviceId) || 0;
          if (now - lastChange > 10000) {
            // Only if no recent status change
            console.log(
              `Device ${deviceId} (${device.name}) marked as disconnected due to stale data`,
            );
            device.connected = false;
            this.debouncedEmitConnectionChange("deviceDisconnected", deviceId);
          }
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
