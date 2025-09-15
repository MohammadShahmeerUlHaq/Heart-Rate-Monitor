import React, { useState } from "react";
import { X, Save, Users, Monitor } from "lucide-react";
import { HeartRateDevice } from "../types/electron";

interface ParticipantSettings {
  name: string;
  gender: "male" | "female";
  email: string;
  age: number;
  weight: number;
}

const defaultProfiles: Record<"male" | "female", Omit<ParticipantSettings, "name">> = {
  male: {
    gender: "male",
    email: "",
    age: 40, // Average adult male age in US
    weight: 88.3 // Average adult male weight in kg in US
  },
  female: {
    gender: "female",
    email: "",
    age: 40, // Average adult female age in US
    weight: 76.4 // Average adult female weight in kg in US
  }
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
  const [localSettings, setLocalSettings] = useState<Record<string, ParticipantSettings>>(() => {
    const savedSettings = localStorage.getItem("participantSettings");
    const initialSettings = devices.reduce((acc, device) => {
      const gender = device.gender || "male";
      acc[device.id] = {
        name: device.name,
        gender,
        email: "",
        age: defaultProfiles[gender].age,
        weight: defaultProfiles[gender].weight
      };
      return acc;
    }, {} as Record<string, ParticipantSettings>);

    return savedSettings ? { ...initialSettings, ...JSON.parse(savedSettings) } : initialSettings;
  });

  const handleSave = () => {
    // Update device names and genders
    Object.entries(localSettings).forEach(([deviceId, settings]) => {
      onUpdateDeviceName(deviceId, settings.name);
      onUpdateDeviceGender(deviceId, settings.gender);
    });

    // Save all settings
    localStorage.setItem("participantSettings", JSON.stringify(localSettings));

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
              <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
              <p className="text-gray-400 mt-1">Customize your workout experience</p>
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
                  <p className="text-gray-300 text-lg font-medium mb-2">No Heart Rate Monitors</p>
                  <p className="text-gray-400">Connect your devices to get started</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2 scroll-smooth">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className="flex items-center space-x-3 p-4 bg-gray-700/50 rounded-xl"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        device.connected ? "bg-green-400" : "bg-gray-500"
                      }`}
                    />
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={localSettings[device.id].name}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            [device.id]: { ...prev[device.id], name: e.target.value }
                          }))
                        }
                        className="w-full bg-transparent border-b border-gray-600 hover:border-gray-500 focus:border-blue-500 text-white text-lg font-medium placeholder-gray-500 pb-2 focus:outline-none transition-colors"
                        placeholder="Enter participant name"
                      />
                      <input
                        type="email"
                        value={localSettings[device.id].email}
                        onChange={(e) =>
                          setLocalSettings((prev) => ({
                            ...prev,
                            [device.id]: { ...prev[device.id], email: e.target.value }
                          }))
                        }
                        className="w-full bg-transparent border-b border-gray-600 hover:border-gray-500 focus:border-blue-500 text-white text-base placeholder-gray-500 pb-2 focus:outline-none transition-colors"
                        placeholder="Enter email address"
                      />
                      <div className="flex items-center space-x-4">
                        <select
                          value={localSettings[device.id].gender}
                          onChange={(e) => {
                            const newGender = e.target.value as "male" | "female";
                            setLocalSettings((prev) => ({
                              ...prev,
                              [device.id]: {
                                ...prev[device.id],
                                gender: newGender,
                                age: defaultProfiles[newGender].age,
                                weight: defaultProfiles[newGender].weight
                              }
                            }));
                          }}
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
                              value={localSettings[device.id].age}
                              onChange={(e) =>
                                setLocalSettings((prev) => ({
                                  ...prev,
                                  [device.id]: {
                                    ...prev[device.id],
                                    age: parseInt(e.target.value) || 0
                                  }
                                }))
                              }
                              min="0"
                              max="120"
                              className="w-16 bg-gray-600/50 border border-gray-500 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <span className="text-sm text-gray-400">yrs</span>
                          </div>
                          <div className="h-4 w-px bg-gray-600" />
                          <div className="space-x-2 flex items-center">
                            <input
                              type="number"
                              value={localSettings[device.id].weight}
                              onChange={(e) =>
                                setLocalSettings((prev) => ({
                                  ...prev,
                                  [device.id]: {
                                    ...prev[device.id],
                                    weight: parseFloat(e.target.value) || 0
                                  }
                                }))
                              }
                              step="0.1"
                              min="0"
                              max="300"
                              className="w-20 bg-gray-600/50 border border-gray-500 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            />
                            <span className="text-sm text-gray-400">kg</span>
                          </div>
                        </div>
                        <div className="h-6 w-px bg-gray-600" />
                        <p className="text-xs text-gray-500 font-mono">ID: {device.id}</p>
                      </div>
                    </div>
                  </div>
                ))}
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
