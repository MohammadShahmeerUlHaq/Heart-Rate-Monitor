import { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Settings } from "./components/Settings";
import { Dashboard } from "./components/Dashboard";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { HeartRateDevice, HeartRateData } from "./types/electron";
import { UserSessionStats } from "./types/session";
import { calculateCalories } from "./utils/calorieCalculator";
import { SessionManager } from "./utils/sessionManager";
import { DatabaseService } from "./utils/database";
import { EmailService } from "./utils/emailService";
import { ChartGenerator } from "./utils/chartGenerator";

// Make calculateCalories available globally
window.calculateCalories = calculateCalories;

function App() {
  const [devices, setDevices] = useState<HeartRateDevice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isSessionPaused, setIsSessionPaused] = useState(false);
  const [finalUserStats, setFinalUserStats] = useState<Map<
    string,
    UserSessionStats
  > | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");

  // Create a memoized handler for heart rate updates to optimize performance
  const handleHeartRateUpdate = useCallback((data: HeartRateData) => {
    setDevices((prev) => {
      const updated = prev.map((device) => {
        if (device.id !== data.deviceId) return device;

        const settings = JSON.parse(
          localStorage.getItem("participantSettings") || "{}"
        )[device.id];
        const currentTimestamp = new Date(data.timestamp);
        const lastUpdate = device.lastUpdate
          ? new Date(device.lastUpdate)
          : currentTimestamp;
        const timeDiffMinutes =
          (currentTimestamp.getTime() - lastUpdate.getTime()) / (1000 * 60);

        // Initialize values, ensuring they're numbers
        let newCalories =
          typeof device.calories === "number" ? device.calories : 0;
        let newBluePoints =
          typeof device.bluePoints === "number" ? device.bluePoints : 0;

        // Only calculate if there's a valid time difference AND session is active AND not paused
        if (
          timeDiffMinutes > 0 &&
          SessionManager.isSessionActive() &&
          !SessionManager.isSessionPaused()
        ) {
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
          lastUpdate: new Date(data.timestamp)
        };
      });

      // Update SessionManager with current devices if session is active
      if (SessionManager.isSessionActive()) {
        SessionManager.updateCurrentDevices(updated);
      }

      return updated;
    });
  }, []);

  // Create handlers for device connection
  const handleDeviceConnected = useCallback((device: HeartRateDevice) => {
    setDevices((prev) => {
      const existing = prev.find((d) => d.id === device.id);
      const updated = existing
        ? prev.map((d) => (d.id === device.id ? { ...d, connected: true } : d))
        : [
            ...prev,
            {
              ...device,
              gender: "male" as "male" | "female",
              calories: 0,
              bluePoints: 0
            }
          ];

      // Update SessionManager with current devices if session is active
      if (SessionManager.isSessionActive()) {
        SessionManager.updateCurrentDevices(updated);
      }

      return updated;
    });
  }, []);

  const handleDeviceDisconnected = useCallback((deviceId: string) => {
    setDevices((prev) => {
      const updated = prev.map((device) =>
        device.id === deviceId ? { ...device, connected: false } : device
      );

      // Update SessionManager with current devices if session is active
      if (SessionManager.isSessionActive()) {
        SessionManager.updateCurrentDevices(updated);
      }

      return updated;
    });
  }, []);

  useEffect(() => {
    // Set up event listeners
    if (window.electronAPI) {
      window.electronAPI.onHeartRateUpdate(handleHeartRateUpdate);
      window.electronAPI.onDeviceConnected(handleDeviceConnected);
      window.electronAPI.onDeviceDisconnected(handleDeviceDisconnected);
    }

    // Load saved settings
    const savedDeviceSettings = localStorage.getItem("deviceSettings");
    if (savedDeviceSettings) {
      const settings = JSON.parse(savedDeviceSettings);
      setDevices((prev) => {
        const updated = prev.map((device) => ({
          ...device,
          name: settings[device.id]?.name || device.name,
          gender: settings[device.id]?.gender || "male"
        }));

        // Update SessionManager with current devices if session is active
        if (SessionManager.isSessionActive()) {
          SessionManager.updateCurrentDevices(updated);
        }
        return updated;
      });
    }

    // Auto-start scanning
    const autoStartScanning = async () => {
      setConnectionStatus("connecting");
      try {
        // Use mock mode if no real hardware is available
        const result = await window.electronAPI.startAntScan({
          mockMode: true
        });
        if (result.success) {
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("disconnected");
        }
      } catch (error) {
        console.error("Failed to start scanning:", error);
        setConnectionStatus("disconnected");
      }
    };

    autoStartScanning();
  }, [handleHeartRateUpdate, handleDeviceConnected, handleDeviceDisconnected]);

  const saveDeviceSettings = (updatedDevices: HeartRateDevice[]) => {
    const settings = updatedDevices.reduce(
      (acc, device) => {
        acc[device.id] = { name: device.name, gender: device.gender };
        return acc;
      },
      {} as Record<string, { name: string; gender: "male" | "female" }>
    );

    localStorage.setItem("deviceSettings", JSON.stringify(settings));
  };

  // Generic function to update device properties and handle all common operations
  const updateDeviceProperty = useCallback(
    <T extends string | "male" | "female">(
      deviceId: string,
      propertyName: string,
      value: T
    ) => {
      setDevices((prev) => {
        const updated = prev.map((device) =>
          device.id === deviceId ? { ...device, [propertyName]: value } : device
        );
        saveDeviceSettings(updated);

        // Update SessionManager with current devices if session is active
        if (SessionManager.isSessionActive()) {
          SessionManager.updateCurrentDevices(updated);
        }
        return updated;
      });
    },
    []
  );

  // Specific functions that use the generic update function
  const updateDeviceName = useCallback(
    (deviceId: string, name: string) => {
      updateDeviceProperty(deviceId, "name", name);
    },
    [updateDeviceProperty]
  );

  const updateDeviceGender = useCallback(
    (deviceId: string, gender: "male" | "female") => {
      updateDeviceProperty(deviceId, "gender", gender);
    },
    [updateDeviceProperty]
  );

  const validateUserSettings = (): {
    isValid: boolean;
    missingUsers: string[];
  } => {
    const participantSettings = JSON.parse(
      localStorage.getItem("participantSettings") || "{}"
    );
    const missingUsers: string[] = [];

    devices.forEach((device) => {
      const settings = participantSettings[device.id];
      if (!settings || !settings.name || !settings.email || !settings.gender) {
        missingUsers.push(device.name || `Device ${device.id}`);
      }
    });

    return {
      isValid: missingUsers.length === 0,
      missingUsers
    };
  };

  const handleStartSession = async () => {
    const validation = validateUserSettings();
    if (!validation.isValid) {
      alert(
        `Please complete settings for the following users:\n${validation.missingUsers.join("\n")}\n\nGo to Settings to add missing name, email, and gender information.`
      );
      setShowSettings(true);
      return;
    }

    try {
      await DatabaseService.initializeDatabase();
      setDevices((prev) =>
        prev.map((d) => ({ ...d, calories: 0, bluePoints: 0 }))
      );
      SessionManager.startSession(devices);
      setIsSessionActive(true);
      setFinalUserStats(null);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session. Please check your database connection.");
    }
  };

  const handlePauseSession = () => {
    SessionManager.pauseSession();
    setIsSessionPaused(true);
  };

  const handleResumeSession = () => {
    SessionManager.resumeSession();
    setIsSessionPaused(false);
  };

  const handleStopSession = async () => {
    try {
      const sessionEndTime = SessionManager.stopSession();
      setIsSessionActive(false);
      setIsSessionPaused(false);

      if (!sessionEndTime) {
        console.error("No session was active");
        return;
      }

      const participantSettings = JSON.parse(
        localStorage.getItem("participantSettings") || "{}"
      );
      const sessionDataArray = SessionManager.generateSessionData(
        devices,
        participantSettings
      );
      const snapshotStats = SessionManager.calculateUserStats(devices);
      setFinalUserStats(snapshotStats);

      // Process each user's data in parallel
      await Promise.all(
        sessionDataArray.map(async (sessionData) => {
          try {
            const chartImageBase64 =
              await ChartGenerator.generateSessionChart(sessionData);
            await EmailService.sendSessionReport(sessionData, chartImageBase64);
          } catch (error) {
            console.error(
              `Failed to process data for ${sessionData.name}:`,
              error
            );
          }
        })
      );

      // Clear session data
      SessionManager.clearSessionData();

      alert(
        "Session completed! Data has been saved and emails have been sent to all participants."
      );
    } catch (error) {
      console.error("Failed to stop session:", error);
      alert(
        "Failed to complete session processing. Some data may not have been saved."
      );
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {!showSettings && (
        <Header onToggleSettings={() => setShowSettings(!showSettings)} />
      )}

      <ConnectionStatus status={connectionStatus} />

      <div className="flex-1 overflow-auto">
        {showSettings ? (
          <Settings
            devices={devices}
            onUpdateDeviceName={updateDeviceName}
            onUpdateDeviceGender={updateDeviceGender}
            onClose={() => setShowSettings(false)}
          />
        ) : (
          <Dashboard
            devices={devices}
            isSessionActive={isSessionActive}
            isSessionPaused={isSessionPaused}
            onStartSession={handleStartSession}
            onStopSession={handleStopSession}
            onPauseSession={handlePauseSession}
            onResumeSession={handleResumeSession}
            finalUserStats={finalUserStats}
          />
        )}
      </div>
    </div>
  );
}

export default App;
