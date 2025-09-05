const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const { AntPlusService } = require('./antplus-service');

class Application {
  constructor() {
    this.mainWindow = null;
    this.antPlusService = null;
    this.setupApp();
  }

  setupApp() {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.initializeAntPlus();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        // Properly cleanup ANT+ service before quitting
        if (this.antPlusService) {
          this.antPlusService.stopScanning().then(() => {
            app.quit();
          }).catch(() => {
            app.quit();
          });
        } else {
          app.quit();
        }
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    // Handle app quit gracefully
    app.on('before-quit', async (event) => {
      if (this.antPlusService && this.antPlusService.isScanning) {
        event.preventDefault();
        try {
          await this.antPlusService.stopScanning();
          app.quit();
        } catch (error) {
          console.error('Error stopping ANT+ service during quit:', error);
          app.quit();
        }
      }
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1920,
      height: 1080,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false
      },
      titleBarStyle: 'hidden',
      icon: path.join(__dirname, '../assets/icon.png')
    });

    const isDev = process.env.NODE_ENV === 'development';
    
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Debug: Log any load errors
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });

    this.setupIpcHandlers();
  }

  setupMenu() {
    const template = [
      {
        label: 'View',
        submenu: [
          { role: 'reload' },
          { role: 'forceReload' },
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { 
            label: 'Toggle Fullscreen',
            accelerator: 'F11',
            click: () => {
              if (this.mainWindow) {
                this.mainWindow.setFullScreen(!this.mainWindow.isFullScreen());
              }
            }
          }
        ]
      }
    ];

    if (process.platform === 'darwin') {
      template.unshift({
        label: app.getName(),
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      });
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIpcHandlers() {
    ipcMain.handle('start-ant-scan', async () => {
      try {
        if (!this.antPlusService) {
          this.antPlusService = new AntPlusService();
          this.setupAntPlusListeners();
        }
        
        const result = await this.antPlusService.startScanning();
        return { success: true };
      } catch (error) {
        console.error('Failed to start ANT+ scanning:', error);
        
        // Check if it's a device not connected error
        if (error.message.includes('ANT+ USB dongle not found')) {
          // Show dialog to user
          if (this.mainWindow) {
            dialog.showErrorBox(
              'ANT+ Device Not Connected', 
              'ANT+ USB dongle not found! Please ensure it is connected and try again.'
            );
          }
          return { success: false, error: 'ANT_DEVICE_NOT_CONNECTED' };
        }
        
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('stop-ant-scan', async () => {
      try {
        if (this.antPlusService) {
          await this.antPlusService.stopScanning();
        }
        return { success: true };
      } catch (error) {
        console.error('Failed to stop ANT+ scanning:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-devices', () => {
      return this.antPlusService?.getDevices() || [];
    });

    ipcMain.handle('update-device-name', (event, deviceId, name) => {
      if (this.antPlusService) {
        this.antPlusService.updateDeviceName(deviceId, name);
        return { success: true };
      }
      return { success: false };
    });
  }

  initializeAntPlus() {
    // Don't auto-initialize the service, let user start it manually
    // This prevents issues when ANT+ device is not connected on startup
  }

  setupAntPlusListeners() {
    if (!this.antPlusService) return;
    
    this.antPlusService.on('heartRateData', (data) => {
      this.mainWindow?.webContents.send('heart-rate-update', data);
    });

    this.antPlusService.on('deviceConnected', (device) => {
      this.mainWindow?.webContents.send('device-connected', device);
    });

    this.antPlusService.on('deviceDisconnected', (deviceId) => {
      this.mainWindow?.webContents.send('device-disconnected', deviceId);
    });
  }
}

new Application();