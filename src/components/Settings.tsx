import React, { useState } from 'react';
import { X, Save, Users, Monitor } from 'lucide-react';
import { HeartRateDevice } from '../types/electron';

interface SettingsProps {
  devices: HeartRateDevice[];
  tilesPerRow: number;
  onUpdateDeviceName: (deviceId: string, name: string) => void;
  onUpdateTilesPerRow: (count: number) => void;
  onClose: () => void;
}

export const Settings: React.FC<SettingsProps> = ({
  devices,
  tilesPerRow,
  onUpdateDeviceName,
  onUpdateTilesPerRow,
  onClose
}) => {
  const [localNames, setLocalNames] = useState<Record<string, string>>(() => {
    return devices.reduce((acc, device) => {
      acc[device.id] = device.name;
      return acc;
    }, {} as Record<string, string>);
  });

  const [localTilesPerRow, setLocalTilesPerRow] = useState(tilesPerRow);

  const handleSave = () => {
    // Update device names
    Object.entries(localNames).forEach(([deviceId, name]) => {
      onUpdateDeviceName(deviceId, name);
    });
    
    // Update tiles per row
    onUpdateTilesPerRow(localTilesPerRow);
    
    onClose();
  };

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Monitor className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Settings</h1>
              <p className="text-gray-400">Configure your heart rate monitoring setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Display Settings */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Monitor className="w-5 h-5 mr-2" />
              Display Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tiles per Row
                </label>
                <select
                  value={localTilesPerRow}
                  onChange={(e) => setLocalTilesPerRow(parseInt(e.target.value))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                >
                  <option value={2}>2 tiles per row</option>
                  <option value={3}>3 tiles per row</option>
                  <option value={4}>4 tiles per row</option>
                  <option value={5}>5 tiles per row</option>
                  <option value={6}>6 tiles per row</option>
                  <option value={8}>8 tiles per row</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Adjust based on your TV size and viewing distance
                </p>
              </div>
            </div>
          </div>

          {/* Device Management */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Participants ({devices.length})
            </h2>
            
            {devices.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No heart rate monitors detected</p>
                <p className="text-sm">Start scanning to find devices</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {devices.map((device) => (
                  <div key={device.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                    <div className={`w-3 h-3 rounded-full ${device.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                    <div className="flex-1">
                      <input
                        type="text"
                        value={localNames[device.id] || device.name}
                        onChange={(e) => setLocalNames(prev => ({
                          ...prev,
                          [device.id]: e.target.value
                        }))}
                        className="w-full bg-transparent border-none text-white placeholder-gray-400 focus:outline-none"
                        placeholder="Participant name"
                      />
                      <p className="text-xs text-gray-400">ID: {device.id}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-white">
                        {device.connected ? `${device.heartRate} BPM` : 'Offline'}
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.round(device.calories)} cal
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};