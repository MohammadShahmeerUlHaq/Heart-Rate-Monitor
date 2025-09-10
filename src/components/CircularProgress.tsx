import React from "react";

interface CircularProgressProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 160,
  strokeWidth = 10,
  color = "#ef4444" // red-500
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const colorMap: { [key: string]: string } = {
    "text-blue-400": "#60a5fa",
    "text-blue-700": "#1d4ed8",
    "text-green-400": "#4ade80",
    "text-orange-400": "#fb923c",
    "text-red-400": "#f87171"
  };

  const mappedColor = colorMap[color] || color;

  return (
    <div className="relative inline-flex items-center justify-center w-40 h-40">
      <svg
        className="transform -rotate-90 w-full h-full"
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background track */}
        <circle
          strokeWidth={strokeWidth}
          stroke="#1e293b"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className="transition-all duration-300 ease-in-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={mappedColor}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white whitespace-nowrap">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
};
