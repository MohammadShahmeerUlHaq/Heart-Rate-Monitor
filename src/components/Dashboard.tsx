import React, { useState, useEffect } from "react";
import { HeartRateDevice } from "../types/electron";
import { HeartRateCard } from "./HeartRateCard";
import { Footer } from "./Footer";
import { SessionManager } from "../utils/sessionManager";
import { UserSessionStats } from "../types/session";

interface DashboardProps {
  devices: HeartRateDevice[];
  isSessionActive: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
  finalUserStats?: Map<string, UserSessionStats> | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  devices, 
  isSessionActive, 
  onStartSession, 
  onStopSession,
  finalUserStats
}) => {
  // const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [classStats, setClassStats] = useState({
    totalBluePoints: 0,
    totalCalories: 0,
    elapsedTime: 0
  });
  const [userStats, setUserStats] = useState<Map<string, UserSessionStats>>(new Map());

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
    const totalCalories = devices.reduce((sum, device) => sum + (device.calories || 0), 0);
    const totalBluePoints = devices.reduce((sum, device) => sum + (device.bluePoints || 0), 0);

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
    <>
      <div className="flex-1 p-6 pb-24">
        <div className="grid grid-cols-2 gap-8 auto-rows-fr">
          {devices.map((device) => (
            <HeartRateCard 
              key={device.id} 
              device={device} 
              sessionStats={userStats.get(device.id)}
              isSessionActive={isSessionActive}
            />
          ))}
        </div>
      </div>

      <Footer
        classBluePoints={classStats.totalBluePoints}
        classCalories={classStats.totalCalories}
        coachName="Jared"
        classTime={classStats.elapsedTime}
        isSessionActive={isSessionActive}
        onStartSession={onStartSession}
        onStopSession={onStopSession}
      />
    </>
  );
};
