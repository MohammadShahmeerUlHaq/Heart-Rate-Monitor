import React from "react";
import { Zap, Snowflake, Clock, Play, Square, Pause } from "lucide-react";

interface FooterProps {
  classBluePoints: number;
  classCalories: number;
  coachName: string;
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
  coachName = "Jared",
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
    <div className="fixed bottom-0 left-0 right-0 bg-[#111927] border-t border-gray-800 px-4 py-4">
      <div className="flex items-center justify-evenly max-w-7xl mx-auto gap-4">
        {/* Blue Points */}
        <div className="flex items-center">
          <Snowflake className="w-6 h-6 mr-2 text-blue-500" />
          <div>
            <div className="text-sm text-gray-400">Class Blue Points</div>
            <div className="text-xl font-bold text-white">
              {classBluePoints}
            </div>
          </div>
        </div>

        {/* Calories */}
        <div className="flex items-center">
          <Zap className="w-6 h-6 mr-2 text-yellow-500" />
          <div>
            <div className="text-sm text-gray-400">Class Calories</div>
            <div className="text-xl font-bold text-white">{classCalories}</div>
          </div>
        </div>

        {/* Coach */}
        <div className="flex items-center">
          <div>
            <div className="text-sm text-gray-400">Coach</div>
            <div className="text-xl font-bold text-white">{coachName}</div>
          </div>
        </div>

        {/* Session Controls */}
        <div className="flex items-center space-x-2">
          {!isSessionActive ? (
            <button
              onClick={onStartSession}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              <span>Start</span>
            </button>
          ) : (
            <>
              <button
                onClick={isSessionPaused ? onResumeSession : onPauseSession}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
                  ${
                    isSessionPaused
                      ? "bg-green-500 hover:bg-green-600 text-white"
                      : "bg-yellow-500 hover:bg-yellow-600 text-white"
                  }
                `}
              >
                {isSessionPaused ? (
                  <>
                    <Play className="w-4 h-4" fill="currentColor" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4" fill="currentColor" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                onClick={onStopSession}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors bg-red-500 hover:bg-red-600 text-white"
              >
                <Square className="w-4 h-4" fill="currentColor" />
                <span>Stop</span>
              </button>
            </>
          )}
        </div>

        {/* Class Time */}
        <div className="flex items-center">
          <Clock className="w-6 h-6 mr-2 text-gray-400" />
          <div>
            <div className="text-sm text-gray-400">Class Time</div>
            <div className="text-2xl font-bold text-white">
              {formatTime(classTime)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
