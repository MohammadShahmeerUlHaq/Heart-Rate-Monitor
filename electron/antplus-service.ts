import { EventEmitter } from "events";
// import * as Ant from 'ant-plus';
const Ant = require("ant-plus");

export interface HeartRateDevice {
  id: string;
  name: string;
  heartRate: number;
  lastUpdate: Date;
  connected: boolean;
  calories: number;
  zone: number;
}

export interface HeartRateData {
  deviceId: string;
  heartRate: number;
  timestamp: Date;
}

export class AntPlusService extends EventEmitter {
  private stick: any = null;
  private devices: Map<string, HeartRateDevice> = new Map();
  private sensors: Map<string, any> = new Map();
  private isScanning = false;

  constructor() {
    super();
  }

  async startScanning(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      // Initialize ANT+ USB stick
      const stickOptions = {
        debug: false,
      };

      this.stick = new Ant.GarminStick3(stickOptions);

      this.stick.on("startup", () => {
        console.log("ANT+ stick initialized successfully");
        this.scanForDevices();
      });

      this.stick.on("shutdown", () => {
        console.log("ANT+ stick shutdown");
        this.isScanning = false;
      });

      this.isScanning = true;
    } catch (error: unknown) {
      console.error("Failed to initialize ANT+ stick:", error);
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`ANT+ initialization failed: ${message}`);
    }
  }

  async stopScanning(): Promise<void> {
    this.isScanning = false;

    // Close all sensors
    for (const sensor of this.sensors.values()) {
      try {
        sensor.detach();
      } catch (error) {
        console.error("Error detaching sensor:", error);
      }
    }

    this.sensors.clear();

    if (this.stick) {
      try {
        this.stick.close();
      } catch (error) {
        console.error("Error closing ANT+ stick:", error);
      }
      this.stick = null;
    }
  }

  private scanForDevices(): void {
    if (!this.stick) return;

    try {
      // Scan for heart rate sensors (device type 120)
      const heartRateScanState = new Ant.HeartRateScanState(this.stick);

      heartRateScanState.on("hbData", (data: any) => {
        this.handleHeartRateData(data);
      });

      heartRateScanState.on("attached", (data: any) => {
        console.log("Heart rate sensor attached:", data);
        this.handleDeviceAttached(data);
      });

      heartRateScanState.on("detached", (data: any) => {
        console.log("Heart rate sensor detached:", data);
        this.handleDeviceDetached(data);
      });

      // Also set up individual sensor connections for better reliability
      this.setupIndividualSensors();
    } catch (error) {
      console.error("Error setting up heart rate scanning:", error);
    }
  }

  private setupIndividualSensors(): void {
    // Set up multiple heart rate sensor instances for better device handling
    for (let deviceNumber = 0; deviceNumber < 20; deviceNumber++) {
      try {
        const sensor = new Ant.HeartRateSensor(this.stick);

        sensor.on("hbData", (data: any) => {
          this.handleHeartRateData({ ...data, deviceNumber });
        });

        sensor.on("attached", (data: any) => {
          this.handleDeviceAttached({ ...data, deviceNumber });
        });

        sensor.on("detached", (data: any) => {
          this.handleDeviceDetached({ ...data, deviceNumber });
        });

        this.sensors.set(`sensor_${deviceNumber}`, sensor);
      } catch (error) {
        console.error(`Failed to setup sensor ${deviceNumber}:`, error);
      }
    }
  }

  private handleHeartRateData(data: any): void {
    const deviceId =
      data.deviceId?.toString() || `device_${data.deviceNumber || 0}`;
    const heartRate =
      data.ComputedHeartRate || data.heartRate || data.HeartRate || 0;

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
      this.emit("deviceConnected", device);
    }

    // Update device data
    const previousHeartRate = device.heartRate;
    device.heartRate = heartRate;
    device.lastUpdate = new Date();
    device.connected = true;
    device.zone = this.calculateHeartRateZone(heartRate);

    // Simple calorie estimation (very basic)
    if (previousHeartRate > 0) {
      const timeDiff = (Date.now() - device.lastUpdate.getTime()) / 1000 / 60; // minutes
      const caloriesPerMinute = heartRate * 0.1; // Very rough estimation
      device.calories += caloriesPerMinute * timeDiff;
    }

    const heartRateData: HeartRateData = {
      deviceId,
      heartRate,
      timestamp: new Date(),
    };

    this.emit("heartRateData", heartRateData);
  }

  private handleDeviceAttached(data: any): void {
    const deviceId =
      data.deviceId?.toString() || `device_${data.deviceNumber || 0}`;
    console.log(`Device attached: ${deviceId}`);

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
    } else {
      device.connected = true;
    }

    this.emit("deviceConnected", device);
  }

  private handleDeviceDetached(data: any): void {
    const deviceId =
      data.deviceId?.toString() || `device_${data.deviceNumber || 0}`;
    console.log(`Device detached: ${deviceId}`);

    const device = this.devices.get(deviceId);
    if (device) {
      device.connected = false;
      this.emit("deviceDisconnected", deviceId);
    }
  }

  private calculateHeartRateZone(heartRate: number): number {
    // Basic heart rate zones (can be customized per person)
    if (heartRate < 100) return 1; // Warm-up (blue)
    if (heartRate < 130) return 2; // Fat burn (green)
    if (heartRate < 160) return 3; // Cardio (orange)
    return 4; // Peak (red)
  }

  getDevices(): HeartRateDevice[] {
    return Array.from(this.devices.values());
  }

  updateDeviceName(deviceId: string, name: string): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.name = name;
    }
  }
}
