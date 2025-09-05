const { contextBridge, ipcRenderer } = require('electron');

const electronAPI = {
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