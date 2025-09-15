import React from "react";
import { Zap, Snowflake, Clock, Play, Square } from "lucide-react";

interface FooterProps {
  classBluePoints: number;
  classCalories: number;
  coachName: string;
  classTime: number; // in seconds
  isSessionActive: boolean;
  onStartSession: () => void;
  onStopSession: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  classBluePoints = 0,
  classCalories = 0,
  coachName = "Jared",
  classTime = 0,
  isSessionActive = false,
  onStartSession,
  onStopSession
}) => {
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#111927] border-t border-gray-800 px-6 py-4">
      <div className="flex items-center max-w-7xl mx-auto">
        {/* Logo */}
        <div className="w-32">
          <img src="/assets/logo.svg" alt="Logo" className="h-8 w-auto" />
        </div>

        {/* Class Stats - Centered */}
        <div className="flex-1 flex items-center justify-center space-x-12">
          {/* Blue Points */}
          <div className="flex items-center">
            <Snowflake className="w-6 h-6 mr-3 text-blue-500" />
            <div>
              <div className="text-sm text-gray-400">Class Blue Points</div>
              <div className="text-xl font-bold text-white">{classBluePoints}</div>
            </div>
          </div>

          {/* Calories */}
          <div className="flex items-center">
            <Zap className="w-6 h-6 mr-3 text-yellow-500" />
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
        </div>

        {/* Time - Right */}
        <div className="w-32 flex justify-end">
          <div className="flex items-center space-x-4">
            {/* Session Control Button */}
            <button
              onClick={isSessionActive ? onStopSession : onStartSession}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${isSessionActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
                }
              `}
            >
              {isSessionActive ? (
                <>
                  <Square className="w-4 h-4" fill="currentColor" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" fill="currentColor" />
                  <span>Start</span>
                </>
              )}
            </button>
            
            <Clock className="w-6 h-6 mr-3 text-gray-400" />
            <div>
              <div className="text-sm text-gray-400">Class Time</div>
              <div className="text-2xl font-bold text-white">{formatTime(classTime)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
