import React from 'react';
import { HeartRateDevice } from '../types/electron';
import { HeartRateCard } from './HeartRateCard';

interface DashboardProps {
  devices: HeartRateDevice[];
  tilesPerRow: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ devices, tilesPerRow }) => {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
    6: 'grid-cols-6',
    8: 'grid-cols-8'
  }[tilesPerRow] || 'grid-cols-4';

  if (devices.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💓</div>
          <h2 className="text-2xl font-semibold mb-2">No Heart Rate Monitors Detected</h2>
          <p className="text-gray-400">
            Make sure your ANT+ USB dongle is connected and heart rate monitors are active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <div className={`grid ${gridCols} gap-6 auto-rows-fr`}>
        {devices.map((device) => (
          <HeartRateCard key={device.id} device={device} />
        ))}
      </div>
    </div>
  );
};