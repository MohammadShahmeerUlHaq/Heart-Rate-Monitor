import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { AntPlusService } from './antplus-service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Application {
  private mainWindow: BrowserWindow | null = null;
  private antPlusService: AntPlusService | null = null;

  constructor() {
    this.setupApp();
  }

  private setupApp(): void {
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.initializeAntPlus();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  private createWindow(): void {
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

    this.setupIpcHandlers();
  }

  private setupMenu(): void {
    const template: any[] = [
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

  private setupIpcHandlers(): void {
    ipcMain.handle('start-ant-scan', async () => {
      try {
        if (!this.antPlusService) {
          this.antPlusService = new AntPlusService();
        }
        await this.antPlusService.startScanning();
        return { success: true };
      } catch (error: unknown) {
        console.error('Failed to start ANT+ scanning:', error);
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    });

    ipcMain.handle('stop-ant-scan', async () => {
      try {
        if (this.antPlusService) {
          await this.antPlusService.stopScanning();
        }
        return { success: true };
      } catch (error: unknown) {
        console.error('Failed to stop ANT+ scanning:', error);
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    });

    ipcMain.handle('get-devices', () => {
      return this.antPlusService?.getDevices() || [];
    });

    // Forward heart rate data to renderer
    if (this.antPlusService) {
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

  private initializeAntPlus(): void {
    this.antPlusService = new AntPlusService();
    
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