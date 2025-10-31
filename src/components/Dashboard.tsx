import React, { useState, useEffect, useMemo, memo } from "react";

import { Footer } from "./Footer";
import { HeartRateCard } from "./HeartRateCard";

import { HeartRateDevice } from "../types/electron";
import { UserSessionStats } from "../types/session";
import { SessionManager } from "../utils/sessionManager";

interface DashboardProps {
  devices: HeartRateDevice[];
  isSessionActive: boolean;
  isSessionPaused: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  finalUserStats?: Map<string, UserSessionStats> | null;
}

const MemoizedHeartRateCard = memo(HeartRateCard);

export const Dashboard: React.FC<DashboardProps> = ({
  devices,
  isSessionActive,
  isSessionPaused,
  onStartSession,
  onStopSession,
  onPauseSession,
  onResumeSession,
  finalUserStats
}) => {
  const [classStats, setClassStats] = useState({
    totalBluePoints: 0,
    totalCalories: 0,
    elapsedTime: 0
  });
  const [userStats, setUserStats] = useState<Map<string, UserSessionStats>>(
    new Map()
  );
  const [viewMode, setViewMode] = useState<"6" | "12">("12");

  // Load view mode from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("viewMode");
    if (saved === "6" || saved === "12") {
      setViewMode(saved);
    }

    // Listen for storage changes (when Settings saves)
    const handleStorageChange = () => {
      const updated = localStorage.getItem("viewMode");
      if (updated === "6" || updated === "12") {
        setViewMode(updated);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // Also check periodically in case it's the same window
    const interval = setInterval(() => {
      const updated = localStorage.getItem("viewMode");
      if (updated === "6" || updated === "12") {
        setViewMode(updated);
      }
    }, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Update class time every second (independent of device changes)
  useEffect(() => {
    const timer = setInterval(() => {
      const duration = SessionManager.getSessionDuration();
      setClassStats((prev) => ({
        ...prev,
        elapsedTime: duration
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update user stats periodically only while session is active
  useEffect(() => {
    if (!isSessionActive) return;
    const update = () => {
      const stats = SessionManager.calculateUserStats(devices);
      setUserStats(stats);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [isSessionActive, devices]);

  // Update total calories and blue points whenever devices update, but only during active session
  useEffect(() => {
    if (!isSessionActive) return;
    const totalCalories = devices.reduce(
      (sum, device) => sum + (device.calories || 0),
      0
    );
    const totalBluePoints = devices.reduce(
      (sum, device) => sum + (device.bluePoints || 0),
      0
    );

    setClassStats((prev) => ({
      ...prev,
      totalCalories: Math.round(totalCalories),
      totalBluePoints: Math.round(totalBluePoints)
    }));
  }, [devices, isSessionActive]);

  // When session stops, prefer the snapshot passed from App if available
  useEffect(() => {
    if (!isSessionActive) {
      if (finalUserStats) {
        setUserStats(new Map(finalUserStats));
      } else {
        const stats = SessionManager.calculateUserStats(devices);
        setUserStats(stats);
      }
    }
  }, [isSessionActive, devices, finalUserStats]);

  // Use useMemo for device cards to prevent unnecessary re-renders
  const deviceCards = useMemo(() => {
    if (devices.length === 0) {
      return null;
    }

    return devices.map((device) => (
      <MemoizedHeartRateCard
        key={device.id}
        device={device}
        sessionStats={userStats.get(device.id)}
        isSessionActive={isSessionActive}
        viewMode={viewMode}
      />
    ));
  }, [devices, userStats, isSessionActive, viewMode]);

  if (devices.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💓</div>
          <h2 className="text-2xl font-semibold mb-2">
            No Heart Rate Monitors Detected
          </h2>
          <p className="text-gray-400">
            Make sure your ANT+ USB dongle is connected and heart rate monitors
            are active.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex-1 p-6 pb-24">
        <div
          className={`grid grid-cols-2 gap-8 ${viewMode === "6" ? "auto-rows-fr" : "grid-rows-6 auto-rows-fr"}`}
        >
          {deviceCards}
        </div>
      </div>

      <Footer
        classBluePoints={classStats.totalBluePoints}
        classCalories={classStats.totalCalories}
        classTime={classStats.elapsedTime}
        isSessionActive={isSessionActive}
        isSessionPaused={isSessionPaused}
        onStartSession={onStartSession}
        onStopSession={onStopSession}
        onPauseSession={onPauseSession}
        onResumeSession={onResumeSession}
      />
    </>
  );
};
