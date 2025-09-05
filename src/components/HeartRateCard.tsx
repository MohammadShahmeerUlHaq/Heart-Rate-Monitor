import React from 'react';
import { Heart, Wifi, WifiOff } from 'lucide-react';
import { HeartRateDevice } from '../types/electron';

interface HeartRateCardProps {
  device: HeartRateDevice;
}

const zoneColors = {
  1: { bg: 'bg-blue-500/20', border: 'border-blue-500', text: 'text-blue-400', name: 'WARM UP' },
  2: { bg: 'bg-green-500/20', border: 'border-green-500', text: 'text-green-400', name: 'FAT BURN' },
  3: { bg: 'bg-orange-500/20', border: 'border-orange-500', text: 'text-orange-400', name: 'CARDIO' },
  4: { bg: 'bg-red-500/20', border: 'border-red-500', text: 'text-red-400', name: 'PEAK' }
};

export const HeartRateCard: React.FC<HeartRateCardProps> = ({ device }) => {
  const zone = zoneColors[device.zone as keyof typeof zoneColors] || zoneColors[1];
  const isStale = device.lastUpdate && (Date.now() - device.lastUpdate.getTime()) > 5000;
  
  return (
    <div className={`
      relative rounded-xl border-2 p-6 transition-all duration-300 min-h-[200px]
      ${device.connected && !isStale ? zone.bg + ' ' + zone.border : 'bg-gray-800/50 border-gray-600'}
      ${device.connected && !isStale ? 'shadow-lg' : 'opacity-60'}
    `}>
      {/* Connection Status */}
      <div className="absolute top-4 right-4">
        {device.connected && !isStale ? (
          <Wifi className="w-5 h-5 text-green-400" />
        ) : (
          <WifiOff className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Participant Name */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white truncate">
          {device.name}
        </h3>
        {device.connected && !isStale && (
          <span className={`text-xs font-medium ${zone.text} uppercase tracking-wide`}>
            {zone.name}
          </span>
        )}
      </div>

      {/* Heart Rate Display */}
      <div className="flex items-center justify-center mb-4">
        <Heart 
          className={`w-8 h-8 mr-3 ${
            device.connected && !isStale && device.heartRate > 60 
              ? 'text-red-500 animate-pulse' 
              : 'text-gray-500'
          }`}
          fill={device.connected && !isStale && device.heartRate > 60 ? 'currentColor' : 'none'}
        />
        <div className="text-center">
          <div className="text-4xl font-bold text-white">
            {device.connected && !isStale ? device.heartRate : '--'}
          </div>
          <div className="text-sm text-gray-400">BPM</div>
        </div>
      </div>

      {/* Calories */}
      {/*<div className="text-center">
        <div className="text-sm text-gray-400">Calories</div>
        <div className="text-xl font-semibold text-white">
          {device.connected && !isStale ? Math.round(device.calories) : '--'}
        </div>
      </div>*/}

      {/* Disconnected Overlay */}
      {(!device.connected || isStale) && (
        <div className="absolute inset-0 bg-gray-900/80 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <div className="text-gray-400 font-medium">
              {isStale ? 'Signal Lost' : 'Disconnected'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};