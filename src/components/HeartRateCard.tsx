import React, { useEffect, useState, useMemo } from "react";
import { Heart, Wifi, WifiOff, Zap, Snowflake } from "lucide-react";

import { HeartRateDevice } from "../types/electron";
import { UserSessionStats } from "../types/session";
import { CircularProgress } from "./CircularProgress";

import { calculateZoneFromPercentage } from "../utils/heartRateZones";
import { ParticipantSettingsManager } from "../utils/participantSettings";

interface HeartRateCardProps {
  device: HeartRateDevice;
  sessionStats?: UserSessionStats;
  isSessionActive?: boolean;
  viewMode?: "6" | "12";
}

export const HeartRateCard: React.FC<HeartRateCardProps> = ({
  device,
  sessionStats,
  isSessionActive = false,
  viewMode = "12"
}) => {
  const [maxHeartRate, setMaxHeartRate] = useState(0);

  // Size variants based on view mode
  const isLargeView = viewMode === "6";
  const sizes = useMemo(
    () => ({
      // Text sizes - balanced for proper fit
      nameText: isLargeView ? "text-3xl" : "text-lg",
      hrText: isLargeView ? "text-7xl" : "text-4xl",
      statsText: isLargeView ? "text-6xl" : "text-3xl",
      avgMaxText: isLargeView ? "text-4xl" : "text-2xl",
      labelText: isLargeView ? "text-base" : "text-xs",
      zoneBadgeText: isLargeView ? "text-sm" : "text-xs",
      zoneBadgePadding: isLargeView ? "px-5 py-2.5" : "px-3 py-1",

      // Icon sizes - proportional
      heartIcon: isLargeView ? "w-16 h-16" : "w-8 h-8",
      statsIcon: isLargeView ? "w-14 h-14" : "w-8 h-8",
      avgMaxIcon: isLargeView ? "w-10 h-10" : "w-6 h-6",
      wifiIcon: isLargeView ? "w-8 h-8" : "w-5 h-5",

      // Spacing - well-balanced
      gap: isLargeView ? "gap-10" : "gap-6",
      statsGap: isLargeView ? "gap-14" : "gap-8",
      itemGap: isLargeView ? "gap-5" : "gap-3",

      // Progress circle - balanced size
      circleSize: isLargeView ? 240 : 140
    }),
    [isLargeView]
  );

  // Calculate these values once per render
  const isStale = useMemo(
    () => device.lastUpdate && Date.now() - device.lastUpdate.getTime() > 5000,
    [device.lastUpdate]
  );

  const zone = useMemo(() => {
    return calculateZoneFromPercentage(device.heartRate, maxHeartRate);
  }, [device.heartRate, maxHeartRate]);

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

  return (
    <div
      className={`
        relative rounded-xl border-2 transition-all duration-300 h-full bg-[#111927]
        ${zone.colorClass.border} shadow-lg
      `}
    >
      {/* Connection Status */}
      <div className="absolute top-4 right-4">
        {device.connected && !isStale ? (
          <Wifi className={`${sizes.wifiIcon} text-green-400`} />
        ) : (
          <WifiOff className={`${sizes.wifiIcon} text-gray-500`} />
        )}
      </div>

      {/* Content Container */}
      <div className="p-6 flex flex-col h-full">
        {/* Participant Name and Zone Badge */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className={`${sizes.nameText} font-bold text-white truncate`}>
            {!isSessionActive && "Summary - "}
            {device.name}
          </h3>
        </div>

        <div
          className={`flex-1 flex items-center justify-between ${sizes.itemGap}`}
        >
          {/* Stats Column */}
          <div className={`flex flex-col ${sizes.gap}`}>
            {/* Active Session Stats */}
            {isSessionActive ? (
              <>
                {/* Heart Rate */}
                <div className="flex flex-col">
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Heart
                      className={`${sizes.heartIcon} ${zone.colorClass.text} animate-pulse`}
                      fill="currentColor"
                    />
                    <div className={`${sizes.hrText} font-bold text-white`}>
                      {device.heartRate}
                    </div>
                  </div>
                </div>

                {/* Calories */}
                <div className="flex flex-col">
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Zap className={`${sizes.statsIcon} text-yellow-500`} />
                    <div className={`${sizes.statsText} font-bold text-white`}>
                      {Math.round(
                        sessionStats?.totalCalories || device.calories || 0
                      )}
                    </div>
                  </div>
                </div>

                {/* Blue Points */}
                <div className="flex flex-col">
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Snowflake className={`${sizes.statsIcon} text-blue-500`} />
                    <div className={`${sizes.statsText} font-bold text-white`}>
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
                <div className={`flex items-center ${sizes.statsGap}`}>
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Zap className={`${sizes.statsIcon} text-yellow-500`} />
                    <div className={`${sizes.statsText} font-bold text-white`}>
                      {Math.round(sessionStats?.totalCalories || 0)}
                    </div>
                  </div>
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Heart className={`${sizes.avgMaxIcon} text-blue-400`} />
                    <div className={`${sizes.avgMaxText} font-bold text-white`}>
                      {sessionStats
                        ? Math.round(sessionStats.averageHeartRate)
                        : "--"}
                    </div>
                    <div className={`${sizes.labelText} text-gray-400`}>
                      AVG
                    </div>
                  </div>
                </div>

                {/* Summary Mode: Blue Points + Max HR */}
                <div className={`flex items-center ${sizes.statsGap}`}>
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Snowflake className={`${sizes.statsIcon} text-blue-500`} />
                    <div className={`${sizes.statsText} font-bold text-white`}>
                      {Math.round(sessionStats?.totalBluePoints || 0)}
                    </div>
                  </div>
                  <div className={`flex items-center ${sizes.itemGap}`}>
                    <Heart className={`${sizes.avgMaxIcon} text-red-400`} />
                    <div className={`${sizes.avgMaxText} font-bold text-white`}>
                      {sessionStats ? sessionStats.maxHeartRate : "--"}
                    </div>
                    <div className={`${sizes.labelText} text-gray-400`}>
                      MAX
                    </div>
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
                color={zone.colorClass.text}
                size={sizes.circleSize}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
