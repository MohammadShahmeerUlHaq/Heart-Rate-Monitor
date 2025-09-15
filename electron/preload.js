const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  startAntScan: (options) => ipcRenderer.invoke("start-ant-scan", options),
  stopAntScan: () => ipcRenderer.invoke("stop-ant-scan"),
  getDevices: () => ipcRenderer.invoke("get-devices"),
  onHeartRateUpdate: (callback) => {
    ipcRenderer.on("heart-rate-update", (_, data) => callback(data));
  },
  onDeviceConnected: (callback) => {
    ipcRenderer.on("device-connected", (_, device) => callback(device));
  },
  onDeviceDisconnected: (callback) => {
    ipcRenderer.on("device-disconnected", (_, deviceId) => callback(deviceId));
  },
  closeApp: () => ipcRenderer.invoke('close-app'),
  callAPI: (endpoint, data) => ipcRenderer.invoke(`api-${endpoint}`, data)
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
