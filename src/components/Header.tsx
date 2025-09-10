import React from 'react';
// import { Settings, Play, Square, Heart, Users } from 'lucide-react';
import { Settings, Play, Square, Heart, Users, X } from 'lucide-react';

interface HeaderProps {
  onToggleSettings: () => void;
  isScanning: boolean;
  onStartScanning: () => void;
  onStopScanning: () => void;
  deviceCount: number;
  connectedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSettings,
  isScanning,
  onStartScanning,
  onStopScanning,
  deviceCount,
  connectedCount
}) => {
  const handleClose = async () => {
    if (window.electronAPI) {
      await window.electronAPI.closeApp();
    }
  };
  return (
    // <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4 group relative">
      <div className="flex items-center justify-between">
        {/* Logo and Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-red-500 p-2 rounded-lg">
            <Heart className="w-6 h-6 text-white" fill="currentColor" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Heart Rate Monitor</h1>
            <p className="text-sm text-gray-400">Group Fitness Dashboard</p>
          </div>
        </div>

        {/* Status and Controls */}
        <div className="flex items-center space-x-6">
          {/* Device Count */}
          <div className="flex items-center space-x-2 text-sm">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300">
              {connectedCount}/{deviceCount} Connected
            </span>
          </div>

          {/* Scan Control */}
          <button
            onClick={isScanning ? onStopScanning : onStartScanning}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isScanning 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
              }
            `}
          >
            {isScanning ? (
              <>
                <Square className="w-4 h-4" fill="currentColor" />
                <span>Stop Scanning</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" fill="currentColor" />
                <span>Start Scanning</span>
              </>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={onToggleSettings}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      {/* Close Button - Only visible on hover */}
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-all duration-200 z-10"
        title="Close Application"
      >
        <X className="w-4 h-4" />
      </button>
    </header>
  );
};