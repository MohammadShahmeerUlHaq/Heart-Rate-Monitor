import React from 'react';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
  status: 'disconnected' | 'connecting' | 'connected';
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status }) => {
  if (status === 'connected') return null;

  return (
    <div className="fixed top-20 right-6 z-50">
      <div className={`
        flex items-center space-x-2 px-4 py-2 rounded-lg border
        ${status === 'connecting' 
          ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
          : 'bg-red-500/20 border-red-500 text-red-400'
        }
      `}>
        {status === 'connecting' ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {status === 'connecting' ? 'Connecting to ANT+ dongle...' : 'ANT+ dongle disconnected'}
        </span>
      </div>
    </div>
  );
};