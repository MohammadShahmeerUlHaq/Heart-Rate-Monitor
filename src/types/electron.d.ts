export interface ElectronAPI {
  startAntScan: (options?: {
    mockMode: boolean;
  }) => Promise<{ success: boolean; error?: string; mock?: boolean }>;
  stopAntScan: () => Promise<{ success: boolean; error?: string }>;
  getDevices: () => Promise<HeartRateDevice[]>;
  onHeartRateUpdate: (callback: (data: HeartRateData) => void) => void;
  onDeviceConnected: (callback: (device: HeartRateDevice) => void) => void;
  onDeviceDisconnected: (callback: (deviceId: string) => void) => void;
}

export interface HeartRateDevice {
  id: string;
  name: string;
  heartRate: number;
  lastUpdate: Date;
  connected: boolean;
  calories: number;
  bluePoints: number;
  gender: "male" | "female";
}

export interface HeartRateData {
  deviceId: string;
  heartRate: number;
  timestamp: Date;
}

import { CalorieCalculationParams } from "../utils/calorieCalculator";

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    calculateCalories: (params: CalorieCalculationParams) => number;
  }
}
