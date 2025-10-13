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
    this.deviceChannelMap = new Map();
    this.channelSensorMap = new Map();
    this.deviceChannelMapPath = path.join(__dirname, "device-channel-map.json");

    try {
      if (fs.existsSync(this.deviceChannelMapPath)) {
        const raw = fs.readFileSync(this.deviceChannelMapPath, "utf8");
        const obj = JSON.parse(raw || "{}");
        for (const [k, v] of Object.entries(obj)) {
          this.deviceChannelMap.set(k, v);
        }
      }
    } catch (e) {
      console.error("Failed to load device-channel map:", e);
    }
    this.activeDevices = new Set();
    this.hrSensors = [];
    this.isScanning = false;
    this.calorieTracking = new Map();
    this.updateInterval = null;
    this.isShuttingDown = false;
    this.mockMode = mockMode;
    this.mockService = mockMode ? new MockHRMService() : null;

    this.lastConnectionChange = new Map();
    this.connectionDebounceMs = 2000;
  }

  async startScanning() {
    if (this.isScanning) {
      return { success: true };
    }
    if (this.mockMode && this.mockService) {
      this.mockService.on("heartRateData", (data) =>
        this.emit("heartRateData", data)
      );
      this.mockService.on("deviceConnected", (device) =>
        this.emit("deviceConnected", device)
      );
      this.mockService.on("deviceDisconnected", (deviceId) =>
        this.emit("deviceDisconnected", deviceId)
      );

      this.mockService.startMocking();
      this.isScanning = true;
      return { success: true, mock: true };
    }
    try {
      this.stick = new Ant.GarminStick2();

      this.stick.on("data", (data) => {
        const eventId = data.toString("hex");
        this.handleRawAntEvent(eventId);
      });
      this.stick.on("startup", () => {
        this.isScanning = true;
        for (let i = 0; i < 8; i++) {
          this.addHRSensor(i);
        }
        this.startPeriodicUpdates();
      });
      this.stick.on("shutdown", () => {
        this.isScanning = false;
      });
      const opened = this.stick.open();
      if (!opened) {
        throw new Error("ANT_DEVICE_NOT_CONNECTED");
      }
      return { success: true };
    } catch (error) {
      if (this.mockMode) {
        this.startMockData();
        this.isScanning = true;
        return { success: true, mock: true };
      }

      if (error.message === "ANT_DEVICE_NOT_CONNECTED") {
        throw new Error(
          "ANT+ USB dongle not found! Please ensure it is connected."
        );
      }
      throw new Error(`ANT+ initialization failed: ${error.message}`);
    }
  }

  handleRawAntEvent(eventId) {
    const knownEvents = [
      "a40340010109ee",
      "a40340030109ec",
      "a403400101",
      "a403400301"
    ];

    const isKnownEvent = knownEvents.some((known) => eventId.startsWith(known));
  }

  addHRSensor(channel) {
    const hrSensor = new Ant.HeartRateSensor(this.stick);

    hrSensor.on("hbdata", async (data) => {
      if (!data || typeof data.DeviceID === "undefined") return;

      if (
        data.DeviceID !== 0 &&
        !this.activeDevices.has(data.DeviceID.toString())
      ) {
        const idStr = data.DeviceID.toString();
        this.activeDevices.add(idStr);
        try {
          const knownChannel = this.deviceChannelMap.get(idStr);
          if (typeof knownChannel !== "undefined" && knownChannel !== channel) {
            const rebound = await this.attachWithRetry(
              knownChannel,
              parseInt(idStr, 10)
            );
            if (rebound) {
              this.channelSensorMap.set(
                knownChannel,
                this.channelSensorMap.get(knownChannel) || hrSensor
              );
              this.deviceChannelMap.set(idStr, knownChannel);
              try {
                fs.writeFileSync(
                  this.deviceChannelMapPath,
                  JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                  "utf8"
                );
              } catch (e) {
                console.error("Failed to save device-channel map:", e);
              }
            } else {
              try {
                hrSensor.detach();
                hrSensor.attach(channel, data.DeviceID);
              } catch (e) {
                console.error("Failed to reattach HR sensor:", e);
              }
              this.deviceChannelMap.set(idStr, channel);
              this.channelSensorMap.set(channel, hrSensor);
              try {
                fs.writeFileSync(
                  this.deviceChannelMapPath,
                  JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                  "utf8"
                );
              } catch (e) {}
            }
          } else {
            try {
              hrSensor.detach();
              hrSensor.attach(channel, data.DeviceID);
            } catch (e) {
              console.error("Failed to reattach HR sensor:", e);
            }
            this.deviceChannelMap.set(idStr, channel);
            this.channelSensorMap.set(channel, hrSensor);
            try {
              fs.writeFileSync(
                this.deviceChannelMapPath,
                JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                "utf8"
              );
            } catch (e) {
              console.error("Failed to save device-channel map:", e);
            }
          }
        } catch (e) {
          console.error("Failed to update device-channel map:", e);
        }
      }

      if (data.DeviceID !== 0) {
        this.handleHeartRateData(data);
      }
    });

    hrSensor.on("error", (error) => {});

    hrSensor.on("attached", (data) => {});

    hrSensor.on("detached", (data) => {
      let deviceId = data?.DeviceID?.toString();
      if (!deviceId) {
        for (const [devId, ch] of this.deviceChannelMap.entries()) {
          if (ch === channel) {
            deviceId = devId;
            break;
          }
        }
      }

      if (deviceId) {
        this.handleDeviceDetached(deviceId);
      } else {
        try {
          hrSensor.attach(channel, 0);
          this.channelSensorMap.set(channel, hrSensor);
        } catch (e) {
          console.error("Failed to reattach HR sensor:", e);
          this.channelSensorMap.delete(channel);
        }
      }
    });

    try {
      hrSensor.attach(channel, 0);
      this.hrSensors.push(hrSensor);
      this.channelSensorMap.set(channel, hrSensor);
    } catch (error) {
      console.error(`Failed to attach HR sensor on channel ${channel}:`, error);
    }
  }

  handleHeartRateData(data) {
    if (!data || typeof data.DeviceID === "undefined") return;
    const heartRate = data.ComputedHeartRate || 0;
    const deviceId = data.DeviceID.toString();
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
      this.calorieTracking.set(deviceId, {
        lastUpdate: Date.now(),
        totalCalories: 0
      });
      this.debouncedEmitConnectionChange("deviceConnected", device);

      const knownChannel = this.deviceChannelMap.get(deviceId);
      if (typeof knownChannel !== "undefined") {
        this.activeDevices.add(deviceId);
      }
    }

    const now = Date.now();
    const lastUpdate = this.calorieTracking.get(deviceId)?.lastUpdate || now;
    const timeDiffMinutes = (now - lastUpdate) / (1000 * 60);

    const caloriesPerMinute = this.calculateCaloriesPerMinute(heartRate);
    const additionalCalories = caloriesPerMinute * timeDiffMinutes;

    device.connected = true;
    device.heartRate = heartRate;
    device.lastUpdate = new Date();
    device.calories += additionalCalories;
    device.zone = this.calculateHeartRateZone(heartRate);

    if (
      !this.deviceChannelMap.has(deviceId) &&
      (data.channel !== undefined || data.channelId !== undefined)
    ) {
      const ch = data.channel !== undefined ? data.channel : data.channelId;
      this.deviceChannelMap.set(deviceId, ch);
    }

    this.calorieTracking.set(deviceId, {
      lastUpdate: now,
      totalCalories: device.calories
    });

    this.sensors[deviceId] = heartRate;

    const heartRateData = {
      deviceId,
      heartRate,
      timestamp: new Date()
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
  }

  debouncedEmitConnectionChange(eventType, deviceIdOrDevice) {
    const now = Date.now();
    const deviceId =
      typeof deviceIdOrDevice === "string"
        ? deviceIdOrDevice
        : deviceIdOrDevice.id;
    const lastChange = this.lastConnectionChange.get(deviceId) || 0;

    if (now - lastChange > this.connectionDebounceMs) {
      this.lastConnectionChange.set(deviceId, now);
      this.emit(eventType, deviceIdOrDevice);
    }
  }

  rebindChannelForDevice(deviceId) {
    if (!deviceId) return;
    const channel = this.deviceChannelMap.get(deviceId);
    if (typeof channel === "undefined") return;

    const sensor = this.channelSensorMap.get(channel);
    if (!sensor) {
      this.deviceChannelMap.delete(deviceId);
      this.channelSensorMap.delete(channel);
      return;
    }

    try {
      sensor.detach();
      setTimeout(async () => {
        try {
          const ok = await this.attachWithRetry(channel, 0);
          if (ok) {
            this.deviceChannelMap.delete(deviceId);

            this.channelSensorMap.set(channel, sensor);
            try {
              fs.writeFileSync(
                this.deviceChannelMapPath,
                JSON.stringify(Object.fromEntries(this.deviceChannelMap)),
                "utf8"
              );
            } catch (e) {
              console.error("Failed to save device-channel map:", e);
            }
          }
        } catch (e) {
          console.error("Failed to rebind channel:", e);
        }
      }, 500);
    } catch (e) {
      console.error("Failed to detach sensor for rebinding:", e);
    }
  }

  attachWithRetry(channel, deviceId, maxRetries = 3) {
    return new Promise((resolve) => {
      let attempt = 0;
      const tryAttach = () => {
        attempt++;
        try {
          const sensor = this.channelSensorMap.get(channel);
          if (!sensor) return resolve(false);
          sensor.attach(channel, deviceId);
          sensor.detach();

          return resolve(true);
        } catch (err) {
          if (attempt >= maxRetries) return resolve(false);
          const delay = 200 * Math.pow(2, attempt - 1);
          setTimeout(tryAttach, delay);
        }
      };
      tryAttach();
    });
  }

  calculateCaloriesPerMinute(heartRate) {
    if (heartRate < 100) return 3;
    if (heartRate < 130) return 6;
    if (heartRate < 160) return 10;
    return 15;
  }

  calculateHeartRateZone(heartRate) {
    if (heartRate < 100) return 1;
    if (heartRate < 130) return 2;
    if (heartRate < 160) return 3;
    return 4;
  }

  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      if (this.isShuttingDown) return;

      const output = Object.entries(this.sensors)
        .map(([id, hr]) => `${id}:${hr}`)
        .join(", ");

      const now = Date.now();
      for (const [deviceId, device] of this.devices.entries()) {
        if (device.connected && now - device.lastUpdate.getTime() > 15000) {
          const lastChange = this.lastConnectionChange.get(deviceId) || 0;
          if (now - lastChange > 10000) {
            device.connected = false;
            this.debouncedEmitConnectionChange("deviceDisconnected", deviceId);
          }
        }
      }
    }, 1000);
  }

  async stopScanning() {
    this.isScanning = false;
    this.isShuttingDown = true;
    if (this.mockMode && this.mockService) {
      this.mockService.stopMocking();
      return;
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    const detachPromises = this.hrSensors.map(async (sensor, index) => {
      try {
        await new Promise((resolve) => {
          try {
            sensor.detach();
            resolve();
          } catch (error) {
            resolve();
          }
        });
      } catch (e) {
        console.error("Failed to detach sensor:", e);
      }
    });
    await Promise.all(detachPromises);
    this.hrSensors.length = 0;
    this.sensors = {};
    this.activeDevices.clear();
    if (this.stick) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 200));
        this.stick.close();
      } catch (error) {}
      this.stick = null;
    }
    this.isShuttingDown = false;
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
