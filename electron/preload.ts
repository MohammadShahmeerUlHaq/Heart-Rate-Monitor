import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  startAntScan: () => Promise<{ success: boolean; error?: string }>;
  stopAntScan: () => Promise<{ success: boolean; error?: string }>;
  getDevices: () => Promise<any[]>;
  onHeartRateUpdate: (callback: (data: any) => void) => void;
  onDeviceConnected: (callback: (device: any) => void) => void;
  onDeviceDisconnected: (callback: (deviceId: string) => void) => void;
}

const electronAPI: ElectronAPI = {
  startAntScan: () => ipcRenderer.invoke('start-ant-scan'),
  stopAntScan: () => ipcRenderer.invoke('stop-ant-scan'),
  getDevices: () => ipcRenderer.invoke('get-devices'),
  onHeartRateUpdate: (callback) => {
    ipcRenderer.on('heart-rate-update', (_, data) => callback(data));
  },
  onDeviceConnected: (callback) => {
    ipcRenderer.on('device-connected', (_, device) => callback(device));
  },
  onDeviceDisconnected: (callback) => {
    ipcRenderer.on('device-disconnected', (_, deviceId) => callback(deviceId));
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}