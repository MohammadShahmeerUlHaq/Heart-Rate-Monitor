import React, { useEffect, useState, useMemo } from "react";
import { Heart, Wifi, WifiOff, Zap, Snowflake } from "lucide-react";
import { HeartRateDevice } from "../types/electron";
import { ParticipantSettingsManager } from "../utils/participantSettings";
import { CircularProgress } from "./CircularProgress";
import { UserSessionStats } from "../types/session";

interface HeartRateCardProps {
  device: HeartRateDevice;
  sessionStats?: UserSessionStats;
  isSessionActive?: boolean;
}

// Define heart rate zones as constants to reduce repetitive code
const HEART_RATE_ZONES = {
  green: {
    bg: "bg-green-500/20",
    border: "border-green-500",
    text: "text-green-400",
    name: "GREEN ZONE"
  },
  blue: {
    bg: "bg-blue-500/20",
    border: "border-blue-500",
    text: "text-blue-400",
    name: "BLUE ZONE"
  },
  darkBlue: {
    bg: "bg-blue-800/20",
    border: "border-blue-800",
    text: "text-blue-700",
    name: "DARK BLUE"
  },
  orange: {
    bg: "bg-orange-500/20",
    border: "border-orange-500",
    text: "text-orange-400",
    name: "ORANGE"
  },
  red: {
    bg: "bg-red-500/20",
    border: "border-red-500",
    text: "text-red-400",
    name: "RED ZONE"
  }
};

const getZoneColors = (heartRate: number) => {
  if (heartRate <= 120) return HEART_RATE_ZONES.green;
  if (heartRate <= 140) return HEART_RATE_ZONES.blue;
  if (heartRate <= 150) return HEART_RATE_ZONES.darkBlue;
  if (heartRate <= 160) return HEART_RATE_ZONES.orange;
  return HEART_RATE_ZONES.red;
};

export const HeartRateCard: React.FC<HeartRateCardProps> = ({
  device,
  sessionStats,
  isSessionActive = false
}) => {
  const [maxHeartRate, setMaxHeartRate] = useState(0);

  // Calculate these values once per render
  const isStale = useMemo(
    () => device.lastUpdate && Date.now() - device.lastUpdate.getTime() > 5000,
    [device.lastUpdate]
  );

  const zone = useMemo(
    () => getZoneColors(device.heartRate),
    [device.heartRate]
  );

  useEffect(() => {
    // Load initial max heart rate
    const storedMax = ParticipantSettingsManager.getMaxHeartRate(device.id);
    setMaxHeartRate(storedMax);

    // Update max heart rate if current heart rate is higher
    if (device.heartRate > storedMax && device.heartRate > 0) {
      ParticipantSettingsManager.updateMaxHeartRate(
        device.id,
        device.heartRate
      );
      setMaxHeartRate(device.heartRate);
    }
  }, [device.heartRate, device.id]);

  // No need for an empty useEffect as we're using App-level state

  return (
    <div
      className={`
        relative rounded-xl border-2 transition-all duration-300 h-full bg-[#111927]
        ${zone.border} shadow-lg
      `}
    >
      {/* Connection Status */}
      <div className="absolute top-4 right-4">
        {device.connected && !isStale ? (
          <Wifi className="w-5 h-5 text-green-400" />
        ) : (
          <WifiOff className="w-5 h-5 text-gray-500" />
        )}
      </div>

      {/* Content Container */}
      <div className="p-6 flex flex-col h-full">
        {/* Participant Name */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-white truncate">
            {!isSessionActive && "Summary - "}
            {device.name}
          </h3>
        </div>

        <div className="flex-1 flex items-center justify-between gap-4">
          {/* Stats Column */}
          <div className="flex flex-col gap-6">
            {/* Active Session Stats */}
            {isSessionActive ? (
              <>
                {/* Heart Rate */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <Heart
                      className={`w-8 h-8 ${zone.text} animate-pulse`}
                      fill="currentColor"
                    />
                    <div className="text-4xl font-bold text-white">
                      {device.heartRate}
                    </div>
                  </div>
                </div>

                {/* Calories */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <Zap className="w-8 h-8 text-yellow-500" />
                    <div className="text-4xl font-bold text-white">
                      {Math.round(
                        sessionStats?.totalCalories || device.calories || 0
                      )}
                    </div>
                  </div>
                </div>

                {/* Blue Points */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-3">
                    <Snowflake className="w-8 h-8 text-blue-500" />
                    <div className="text-4xl font-bold text-white">
                      {Math.round(
                        sessionStats?.totalBluePoints || device.bluePoints || 0
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Summary Mode: Calories + Avg HR */}
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <Zap className="w-8 h-8 text-yellow-500" />
                    <div className="text-3xl font-bold text-white">
                      {Math.round(sessionStats?.totalCalories || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-blue-400" />
                    <div className="text-2xl font-bold text-white">
                      {sessionStats
                        ? Math.round(sessionStats.averageHeartRate)
                        : "--"}
                    </div>
                    <div className="text-xs text-gray-400">AVG</div>
                  </div>
                </div>

                {/* Summary Mode: Blue Points + Max HR */}
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <Snowflake className="w-8 h-8 text-blue-500" />
                    <div className="text-3xl font-bold text-white">
                      {Math.round(sessionStats?.totalBluePoints || 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Heart className="w-6 h-6 text-red-400" />
                    <div className="text-2xl font-bold text-white">
                      {/* {device.connected && !isStale && sessionStats ? sessionStats.maxHeartRate : "--"} */}
                      {sessionStats ? sessionStats.maxHeartRate : "--"}
                    </div>
                    <div className="text-xs text-gray-400">MAX</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Circular Progress (Only Active) */}
          {isSessionActive && (
            <div className="flex-shrink-0">
              <CircularProgress
                percentage={
                  maxHeartRate > 0
                    ? Math.round((device.heartRate / maxHeartRate) * 100)
                    : 0
                }
                color={zone.text}
              />
              {/* {device.connected && !isStale ? (
                <CircularProgress
                  percentage={
                    maxHeartRate > 0 ? Math.round((device.heartRate / maxHeartRate) * 100) : 0
                  }
                  color={zone.text}
                />
              ) : (
                <CircularProgress percentage={0} color="#374151" />
              )} */}
            </div>
          )}
        </div>
      </div>

      {/* Disconnected Overlay */}
      {/* {(!device.connected || isStale) && (
        <div className="absolute inset-0 bg-gray-900/80 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <WifiOff className="w-12 h-12 text-gray-500 mx-auto mb-2" />
            <div className="text-gray-400 font-medium">
              {isStale ? "Signal Lost" : "Disconnected"}
            </div>
          </div>
        </div>
      )} */}
      {/* {(!device.connected || isStale) && (
        <div className="absolute inset-0 bg-gray-900/80 rounded-xl flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-gray-500" />
        </div>
      )} */}
    </div>
  );
};
