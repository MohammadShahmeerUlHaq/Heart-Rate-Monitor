import React, { useEffect, useState } from "react";
import { Heart, Wifi, WifiOff, Zap, Trophy } from "lucide-react";
import { HeartRateDevice } from "../types/electron";
import { ParticipantSettingsManager } from "../utils/participantSettings";
import { CircularProgress } from "./CircularProgress";

interface HeartRateCardProps {
  device: HeartRateDevice;
}

const zoneColors = {
  1: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-400", name: "WARM UP" },
  2: {
    bg: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-400",
    name: "FAT BURN"
  },
  3: {
    bg: "bg-orange-500/20",
    border: "border-orange-500",
    text: "text-orange-400",
    name: "CARDIO"
  },
  4: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-400", name: "PEAK" }
};

export const HeartRateCard: React.FC<HeartRateCardProps> = ({ device }) => {
  const [maxHeartRate, setMaxHeartRate] = useState(0);
  const zone = zoneColors[device.zone as keyof typeof zoneColors] || zoneColors[1];
  const isStale = device.lastUpdate && Date.now() - device.lastUpdate.getTime() > 5000;

  useEffect(() => {
    // Load initial max heart rate
    const storedMax = ParticipantSettingsManager.getMaxHeartRate(device.id);
    setMaxHeartRate(storedMax);

    // Update max heart rate if current heart rate is higher
    if (device.heartRate > storedMax && device.heartRate > 0) {
      ParticipantSettingsManager.updateMaxHeartRate(device.id, device.heartRate);
      setMaxHeartRate(device.heartRate);
    }
  }, [device.heartRate, device.id]);

  return (
    <div
      className={`
      relative rounded-xl border-[1px] transition-all duration-300 h-full bg-[#111927]
      ${device.connected && !isStale ? zone.border : "border-gray-800"}
      ${device.connected && !isStale ? "shadow-lg" : "opacity-60"}
    `}
    >
      {/* Connection Status */}
      <div className="absolute top-3 right-3">
        {device.connected && !isStale ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-500" />
        )}
      </div>

      {/* Content Container */}
      <div className="p-4 flex flex-col h-full">
        {/* Participant Name */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white truncate">{device.name}</h3>
          {device.connected && !isStale && (
            <span className={`text-xs font-medium ${zone.text} uppercase tracking-wide`}>
              {zone.name}
            </span>
          )}
        </div>

        <div className="flex flex-1 items-start justify-between gap-4">
          {/* Left Side Metrics */}
          <div className="space-y-3">
            {/* Heart Rate */}
            <div className="flex items-center">
              <Heart
                className={`w-4 h-4 mr-2 flex-shrink-0 ${
                  device.connected && !isStale && device.heartRate > 60
                    ? "text-red-500 animate-pulse"
                    : "text-gray-500"
                }`}
                fill={
                  device.connected && !isStale && device.heartRate > 60 ? "currentColor" : "none"
                }
              />
              <div>
                <div className="text-base font-medium text-white">
                  {device.connected && !isStale ? device.heartRate : "--"}
                </div>
                <div className="text-[10px] text-gray-400">BPM</div>
              </div>
            </div>

            {/* Calories */}
            <div className="flex items-center">
              <Zap className="w-4 h-4 mr-2 flex-shrink-0 text-yellow-500" />
              <div>
                <div className="text-base font-medium text-white">0</div>
                <div className="text-[10px] text-gray-400">KCAL</div>
              </div>
            </div>

            {/* Blue Points */}
            <div className="flex items-center">
              <Trophy className="w-4 h-4 mr-2 flex-shrink-0 text-blue-500" />
              <div>
                <div className="text-base font-medium text-white">0</div>
                <div className="text-[10px] text-gray-400">POINTS</div>
              </div>
            </div>
          </div>

          {/* Right Side Circular Progress */}
          <div className="flex-shrink-0">
            {device.connected && !isStale ? (
              <CircularProgress
                percentage={
                  maxHeartRate > 0 ? Math.round((device.heartRate / maxHeartRate) * 100) : 0
                }
                color={zone.text}
              />
            ) : (
              <CircularProgress percentage={0} color="#374151" />
            )}
          </div>
        </div>
      </div>

      {/* Disconnected Overlay */}
      {(!device.connected || isStale) && (
        <div className="absolute inset-0 bg-gray-900/80 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <div className="text-gray-400 font-medium">
              {isStale ? "Signal Lost" : "Disconnected"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
