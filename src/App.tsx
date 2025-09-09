import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Settings } from "./components/Settings";
import { Dashboard } from "./components/Dashboard";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { HeartRateDevice, HeartRateData } from "./types/electron";
import { calculateCalories } from "./utils/calorieCalculator";

// Make calculateCalories available globally
window.calculateCalories = calculateCalories;

function App() {
  const [devices, setDevices] = useState<HeartRateDevice[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  useEffect(() => {
    // Set up event listeners
    if (window.electronAPI) {
      window.electronAPI.onHeartRateUpdate((data: HeartRateData) => {
        setDevices((prev) =>
          prev.map((device) => {
            if (device.id !== data.deviceId) return device;

            const settings = JSON.parse(localStorage.getItem("participantSettings") || "{}")[
              device.id
            ];

            // Ensure timestamps are properly handled as Date objects
            const currentTimestamp = new Date(data.timestamp);
            const lastUpdate = device.lastUpdate ? new Date(device.lastUpdate) : currentTimestamp;
            const timeDiffMinutes =
              (currentTimestamp.getTime() - lastUpdate.getTime()) / (1000 * 60);

            // Initialize values, ensuring they're numbers
            let newCalories = typeof device.calories === "number" ? device.calories : 0;
            let newBluePoints = typeof device.bluePoints === "number" ? device.bluePoints : 0;

            // Only calculate if there's a valid time difference
            if (timeDiffMinutes > 0) {
              if (settings?.age && settings?.weight) {
                const caloriesPerMinute = window.calculateCalories({
                  heartRate: data.heartRate,
                  weight: settings.weight,
                  age: settings.age
                });
                newCalories += caloriesPerMinute * timeDiffMinutes;
              }

              if (data.heartRate > 150) {
                newBluePoints += timeDiffMinutes;
              }
            }

            return {
              ...device,
              connected: true,
              calories: newCalories,
              bluePoints: newBluePoints,
              heartRate: data.heartRate,
              lastUpdate: data.timestamp
            };
          })
        );
      });

      window.electronAPI.onDeviceConnected((device: HeartRateDevice) => {
        setDevices((prev) => {
          const existing = prev.find((d) => d.id === device.id);
          if (existing) {
            return prev.map((d) => (d.id === device.id ? { ...d, connected: true } : d));
          }
          return [...prev, { ...device, gender: "male", calories: 0, bluePoints: 0 }];
        });
      });

      window.electronAPI.onDeviceDisconnected((deviceId: string) => {
        setDevices((prev) =>
          prev.map((device) => (device.id === deviceId ? { ...device, connected: false } : device))
        );
      });
    }

    // Load saved settings
    const savedDeviceSettings = localStorage.getItem("deviceSettings");
    if (savedDeviceSettings) {
      const settings = JSON.parse(savedDeviceSettings);
      setDevices((prev) =>
        prev.map((device) => ({
          ...device,
          name: settings[device.id]?.name || device.name,
          gender: settings[device.id]?.gender || "male"
        }))
      );
    }
  }, []);

  const startScanning = async () => {
    setConnectionStatus("connecting");
    setIsScanning(true);
    try {
      // Use mock mode if no real hardware is available
      const result = await window.electronAPI.startAntScan({ mockMode: true });
      if (result.success) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
        setIsScanning(false);
      }
    } catch (error) {
      console.error("Failed to start scanning:", error);
      setConnectionStatus("disconnected");
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    setIsScanning(false);
    setConnectionStatus("disconnected");
    await window.electronAPI.stopAntScan();
  };

  const saveDeviceSettings = (updatedDevices: HeartRateDevice[]) => {
    const settings = updatedDevices.reduce((acc, device) => {
      acc[device.id] = { name: device.name, gender: device.gender };
      return acc;
    }, {} as Record<string, { name: string; gender: "male" | "female" }>);
    localStorage.setItem("deviceSettings", JSON.stringify(settings));
  };

  const updateDeviceName = (deviceId: string, name: string) => {
    setDevices((prev) => {
      const updated = prev.map((device) => (device.id === deviceId ? { ...device, name } : device));
      saveDeviceSettings(updated);
      return updated;
    });
  };

  const updateDeviceGender = (deviceId: string, gender: "male" | "female") => {
    setDevices((prev) => {
      const updated = prev.map((device) =>
        device.id === deviceId ? { ...device, gender } : device
      );
      saveDeviceSettings(updated);
      return updated;
    });
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
          connectedCount={devices.filter((d) => d.connected).length}
        />
      )}

      <ConnectionStatus status={connectionStatus} />

      {showSettings ? (
        <Settings
          devices={devices}
          onUpdateDeviceName={updateDeviceName}
          onUpdateDeviceGender={updateDeviceGender}
          onClose={() => setShowSettings(false)}
        />
      ) : (
        <Dashboard devices={devices} />
      )}
    </div>
  );
}

export default App;
