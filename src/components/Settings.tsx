// Settings.tsx
import React, { useEffect, useState, useRef } from "react"; // <-- added useRef
import { X, Save, Users, Monitor } from "lucide-react";
import type { HeartRateDevice } from "../types/electron";

interface ParticipantSettings {
  name: string;
  gender: "male" | "female";
  email: string;
  age: number;
  weight: number;
}

const defaultProfiles: Record<
  "male" | "female",
  Omit<ParticipantSettings, "name">
> = {
  male: { gender: "male", email: "", age: 40, weight: 88.3 },
  female: { gender: "female", email: "", age: 40, weight: 76.4 }
};

interface SettingsProps {
  devices: HeartRateDevice[];
  onUpdateDeviceName: (deviceId: string, name: string) => void;
  onUpdateDeviceGender: (deviceId: string, gender: "male" | "female") => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  devices,
  onUpdateDeviceName,
  onUpdateDeviceGender,
  onClose
}) => {
  const [localSettings, setLocalSettings] = useState<
    Record<string, ParticipantSettings>
  >({});

  const initialized = useRef(false); // <-- added ref
  const [viewMode, setViewMode] = useState<"6" | "12">(() => {
    const saved = localStorage.getItem("viewMode");
    return saved === "6" || saved === "12" ? saved : "12";
  });

  // Initialize (or merge) settings only once
  useEffect(() => {
    if (initialized.current) return; // <-- prevent overwriting live edits
    initialized.current = true;

    setLocalSettings((prev) => {
      let parsedSaved: Record<string, ParticipantSettings> = {};
      try {
        const raw = localStorage.getItem("participantSettings");
        parsedSaved = raw ? JSON.parse(raw) : {};
      } catch {
        parsedSaved = {};
      }

      const next: Record<string, ParticipantSettings> = {};
      devices.forEach((device) => {
        const id = device.id;
        const deviceGender = device.gender || "male";

        if (prev[id]) {
          next[id] = prev[id];
        } else if (parsedSaved[id]) {
          next[id] = parsedSaved[id];
        } else {
          next[id] = {
            name: device.name ?? "",
            gender: deviceGender,
            email: "",
            age: defaultProfiles[deviceGender].age,
            weight: defaultProfiles[deviceGender].weight
          };
        }
      });

      return next;
    });
  }, [devices]);

  const updateField = <K extends keyof ParticipantSettings>(
    deviceId: string,
    field: K,
    value: ParticipantSettings[K]
  ) => {
    setLocalSettings((prev) => {
      const current = prev[deviceId];
      if (!current) return prev;
      return {
        ...prev,
        [deviceId]: { ...current, [field]: value }
      };
    });
  };

  const handleGenderChange = (
    deviceId: string,
    newGender: "male" | "female"
  ) => {
    setLocalSettings((prev) => {
      const cur = prev[deviceId];
      if (!cur) return prev;

      const prevGender = cur.gender;
      const shouldResetAge = cur.age === defaultProfiles[prevGender].age;
      const shouldResetWeight =
        cur.weight === defaultProfiles[prevGender].weight;

      return {
        ...prev,
        [deviceId]: {
          ...cur,
          gender: newGender,
          age: shouldResetAge ? defaultProfiles[newGender].age : cur.age,
          weight: shouldResetWeight
            ? defaultProfiles[newGender].weight
            : cur.weight
        }
      };
    });
  };

  const handleSave = () => {
    Object.entries(localSettings).forEach(([deviceId, settings]) => {
      onUpdateDeviceName(deviceId, settings.name);
      onUpdateDeviceGender(deviceId, settings.gender);
    });

    try {
      localStorage.setItem(
        "participantSettings",
        JSON.stringify(localSettings)
      );
      localStorage.setItem("viewMode", viewMode);
    } catch (e) {
      console.warn("Failed to persist participantSettings:", e);
    }

    onClose();
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl shadow-lg">
              <Monitor className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Settings
              </h1>
              <p className="text-gray-400 mt-1">
                Customize your workout experience
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* View Mode Selection */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Monitor className="w-6 h-6 mr-3 text-blue-400" />
              Display Settings
            </h2>
            <div className="flex items-center space-x-4">
              <label className="text-gray-300 font-medium">View Mode:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as "6" | "12")}
                className="bg-gray-600/50 border border-gray-500 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-gray-600 transition-colors"
              >
                <option value="6">6 Person View (Larger Cards)</option>
                <option value="12">12 Person View (Smaller Cards)</option>
              </select>
            </div>
          </div>

          {/* Device Management */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center">
              <Users className="w-6 h-6 mr-3 text-blue-400" />
              Participants ({devices.length})
            </h2>

            {devices.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="bg-gray-700/50 rounded-2xl p-8 inline-block">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
                  <p className="text-gray-300 text-lg font-medium mb-2">
                    No Heart Rate Monitors
                  </p>
                  <p className="text-gray-400">
                    Connect your devices to get started
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 scroll-smooth">
                {devices.map((device) => {
                  const s = localSettings[device.id];
                  if (!s) return null;

                  return (
                    <div
                      key={device.id}
                      className="flex items-center space-x-3 p-4 bg-gray-700/50 rounded-xl"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${device.connected ? "bg-green-400" : "bg-gray-500"}`}
                      />
                      <div className="flex-1 space-y-3">
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) =>
                            updateField(device.id, "name", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-gray-600 hover:border-gray-500 focus:border-blue-500 text-white text-lg font-medium placeholder-gray-500 pb-2 focus:outline-none transition-colors"
                          placeholder="Enter participant name"
                        />
                        <input
                          type="email"
                          value={s.email}
                          onChange={(e) =>
                            updateField(device.id, "email", e.target.value)
                          }
                          className="w-full bg-transparent border-b border-gray-600 hover:border-gray-500 focus:border-blue-500 text-white text-base placeholder-gray-500 pb-2 focus:outline-none transition-colors"
                          placeholder="Enter email address"
                        />
                        <div className="flex items-center space-x-4">
                          <select
                            value={s.gender}
                            onChange={(e) =>
                              handleGenderChange(
                                device.id,
                                e.target.value as "male" | "female"
                              )
                            }
                            className="w-24 bg-gray-600/50 border border-gray-500 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-gray-600 transition-colors"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                          </select>
                          <div className="h-6 w-px bg-gray-600" />
                          <div className="flex items-center space-x-3">
                            <div className="space-x-2 flex items-center">
                              <input
                                type="number"
                                value={s.age}
                                onChange={(e) =>
                                  updateField(
                                    device.id,
                                    "age",
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                min={0}
                                max={120}
                                className="w-16 bg-gray-600/50 border border-gray-500 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                              />
                              <span className="text-sm text-gray-400">yrs</span>
                            </div>
                            <div className="h-4 w-px bg-gray-600" />
                            <div className="space-x-2 flex items-center">
                              <input
                                type="number"
                                value={s.weight}
                                onChange={(e) =>
                                  updateField(
                                    device.id,
                                    "weight",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                step={0.1}
                                min={0}
                                max={300}
                                className="w-20 bg-gray-600/50 border border-gray-500 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                              />
                              <span className="text-sm text-gray-400">kg</span>
                            </div>
                          </div>
                          <div className="h-6 w-px bg-gray-600" />
                          <p className="text-xs text-gray-500 font-mono">
                            ID: {device.id}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 sticky bottom-6">
          <div className="bg-gradient-to-t from-gray-900 pt-6">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg transform transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <Save className="w-5 h-5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
