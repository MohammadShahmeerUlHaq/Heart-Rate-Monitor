export interface ElectronAPI {
  startAntScan: () => Promise<{ success: boolean; error?: string }>;
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
  zone: number;
}

export interface HeartRateData {
  deviceId: string;
  heartRate: number;
  timestamp: Date;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}