import React, { useState, useEffect } from 'react';
import { HeartRateDevice, HeartRateData } from './types/electron';
import { Dashboard } from './components/Dashboard';
import { Settings } from './components/Settings';
import { Header } from './components/Header';
import { ConnectionStatus } from './components/ConnectionStatus';

function App() {
  const [devices, setDevices] = useState<HeartRateDevice[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [tilesPerRow, setTilesPerRow] = useState(4);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  useEffect(() => {
    // Set up event listeners
    if (window.electronAPI) {
      window.electronAPI.onHeartRateUpdate((data: HeartRateData) => {
        setDevices(prev => prev.map(device => 
          device.id === data.deviceId 
            ? { ...device, heartRate: data.heartRate, lastUpdate: data.timestamp, connected: true }
            : device
        ));
      });

      window.electronAPI.onDeviceConnected((device: HeartRateDevice) => {
        setDevices(prev => {
          const existing = prev.find(d => d.id === device.id);
          if (existing) {
            return prev.map(d => d.id === device.id ? { ...d, connected: true } : d);
          }
          return [...prev, device];
        });
      });

      window.electronAPI.onDeviceDisconnected((deviceId: string) => {
        setDevices(prev => prev.map(device => 
          device.id === deviceId 
            ? { ...device, connected: false }
            : device
        ));
      });
    }

    // Load saved settings
    const savedTilesPerRow = localStorage.getItem('tilesPerRow');
    if (savedTilesPerRow) {
      setTilesPerRow(parseInt(savedTilesPerRow));
    }

    const savedDeviceNames = localStorage.getItem('deviceNames');
    if (savedDeviceNames) {
      const names = JSON.parse(savedDeviceNames);
      setDevices(prev => prev.map(device => ({
        ...device,
        name: names[device.id] || device.name
      })));
    }
  }, []);

  const startScanning = async () => {
    setConnectionStatus('connecting');
    setIsScanning(true);
    try {
      const result = await window.electronAPI.startAntScan();
      if (result.success) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('disconnected');
        setIsScanning(false);
      }
    } catch (error) {
      console.error('Failed to start scanning:', error);
      setConnectionStatus('disconnected');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    setIsScanning(false);
    setConnectionStatus('disconnected');
    await window.electronAPI.stopAntScan();
  };

  const updateDeviceName = (deviceId: string, name: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId ? { ...device, name } : device
    ));

    // Save to localStorage
    const names = devices.reduce((acc, device) => {
      acc[device.id] = device.id === deviceId ? name : device.name;
      return acc;
    }, {} as Record<string, string>);
    localStorage.setItem('deviceNames', JSON.stringify(names));
  };

  const updateTilesPerRow = (count: number) => {
    setTilesPerRow(count);
    localStorage.setItem('tilesPerRow', count.toString());
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {!showSettings && (
        <Header 
          onToggleSettings={() => setShowSettings(!showSettings)}
          isScanning={isScanning}
          onStartScanning={startScanning}
          onStopScanning={stopScanning}
          deviceCount={devices.length}
          connectedCount={devices.filter(d => d.connected).length}
        />
      )}
      
      <ConnectionStatus status={connectionStatus} />

      {showSettings ? (
        <Settings
          devices={devices}
          tilesPerRow={tilesPerRow}
          onUpdateDeviceName={updateDeviceName}
          onUpdateTilesPerRow={updateTilesPerRow}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <Dashboard 
          devices={devices} 
          tilesPerRow={tilesPerRow}
        />
      )}
    </div>
  );
}

export default App;