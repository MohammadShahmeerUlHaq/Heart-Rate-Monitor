import React from "react";
import { Zap, Snowflake, Clock, Play, Square, Pause } from "lucide-react";

interface FooterProps {
  classBluePoints: number;
  classCalories: number;
  classTime: number; // in seconds
  isSessionActive: boolean;
  isSessionPaused: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  classBluePoints = 0,
  classCalories = 0,
  classTime = 0,
  isSessionActive = false,
  isSessionPaused = false,
  onStartSession,
  onStopSession,
  onPauseSession,
  onResumeSession
}) => {
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl border-t border-slate-600/30 shadow-2xl">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-8 py-4">
        {/* Blue Points */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-blue-600/20 to-blue-800/20 px-6 py-3 rounded-xl border border-blue-500/30 backdrop-blur-sm">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Snowflake className="w-6 h-6 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-300 font-mono">
            {classBluePoints}
          </div>
        </div>

        {/* Calories */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-orange-600/20 to-orange-800/20 px-6 py-3 rounded-xl border border-orange-500/30 backdrop-blur-sm">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Zap className="w-6 h-6 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-300 font-mono">
            {classCalories}
          </div>
        </div>

        {/* Session Controls */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-slate-700/50 to-slate-800/50 px-4 py-3 rounded-xl border border-slate-500/30 backdrop-blur-sm">
          {!isSessionActive ? (
            <button
              onClick={onStartSession}
              className="group relative p-3 bg-gradient-to-br from-green-600 to-green-700 rounded-lg border border-green-500/50 transition-all duration-300 hover:from-green-500 hover:to-green-600 hover:scale-105 hover:shadow-lg hover:shadow-green-500/25"
              title="Start Session"
            >
              <Play
                className="w-5 h-5 text-white group-hover:text-green-100"
                fill="currentColor"
              />
            </button>
          ) : (
            <>
              <button
                onClick={isSessionPaused ? onResumeSession : onPauseSession}
                className={`group relative p-3 rounded-lg border transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                  isSessionPaused
                    ? "bg-gradient-to-br from-green-600 to-green-700 border-green-500/50 hover:from-green-500 hover:to-green-600 hover:shadow-green-500/25"
                    : "bg-gradient-to-br from-yellow-600 to-yellow-700 border-yellow-500/50 hover:from-yellow-500 hover:to-yellow-600 hover:shadow-yellow-500/25"
                }`}
                title={isSessionPaused ? "Resume Session" : "Pause Session"}
              >
                {isSessionPaused ? (
                  <Play
                    className="w-5 h-5 text-white group-hover:text-green-100"
                    fill="currentColor"
                  />
                ) : (
                  <Pause
                    className="w-5 h-5 text-white group-hover:text-yellow-100"
                    fill="currentColor"
                  />
                )}
              </button>

              <button
                onClick={onStopSession}
                className="group relative p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-lg border border-red-500/50 transition-all duration-300 hover:from-red-500 hover:to-red-600 hover:scale-105 hover:shadow-lg hover:shadow-red-500/25"
                title="Stop Session"
              >
                <Square
                  className="w-5 h-5 text-white group-hover:text-red-100"
                  fill="currentColor"
                />
              </button>
            </>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-4 bg-gradient-to-br from-indigo-600/20 to-purple-800/20 px-8 py-3 rounded-xl border border-indigo-500/30 backdrop-blur-sm">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Clock className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-indigo-300 font-mono tracking-wider">
            {formatTime(classTime)}
          </div>
        </div>
      </div>
    </div>
  );
};
