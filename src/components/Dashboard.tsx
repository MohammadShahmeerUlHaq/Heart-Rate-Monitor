import React, { useState, useEffect } from "react";
import { HeartRateDevice } from "../types/electron";
import { HeartRateCard } from "./HeartRateCard";
import { Footer } from "./Footer";

interface DashboardProps {
  devices: HeartRateDevice[];
}

export const Dashboard: React.FC<DashboardProps> = ({ devices }) => {
  const [classStartTime] = useState(Date.now());
  const [classStats, setClassStats] = useState({
    totalBluePoints: 0,
    totalCalories: 0,
    elapsedTime: 0
  });

  // Update class time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setClassStats((prev) => ({
        ...prev,
        elapsedTime: Math.floor((Date.now() - classStartTime) / 1000)
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [classStartTime]);

  // Update total calories and blue points whenever devices update
  useEffect(() => {
    const totalCalories = devices.reduce((sum, device) => sum + device.calories, 0);
    const totalBluePoints = devices.reduce((sum, device) => sum + device.bluePoints, 0);

    setClassStats((prev) => ({
      ...prev,
      totalCalories: Math.round(totalCalories),
      totalBluePoints: Math.round(totalBluePoints)
    }));
  }, [devices]);

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
            <HeartRateCard key={device.id} device={device} />
          ))}
        </div>
      </div>

      <Footer
        classBluePoints={classStats.totalBluePoints}
        classCalories={classStats.totalCalories}
        coachName="Jared"
        classTime={classStats.elapsedTime}
      />
    </>
  );
};
