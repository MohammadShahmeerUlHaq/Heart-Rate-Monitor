export interface HeartRateZone {
  minPercent: number; // Percentage of max HR
  maxPercent: number; // Percentage of max HR
  name: string;
  color: string;
  colorClass: {
    bg: string;
    border: string;
    text: string;
  };
  bluePointsPerMinute: number;
  description: string;
}

export const percentageBasedZones: HeartRateZone[] = [
  {
    minPercent: 0,
    maxPercent: 70,
    name: "GREEN ZONE",
    color: "green",
    colorClass: {
      bg: "bg-green-500/20",
      border: "border-green-500",
      text: "text-green-400"
    },
    bluePointsPerMinute: 1,
    description: "Light activity, recovery"
  },
  {
    minPercent: 70,
    maxPercent: 80,
    name: "BLUE ZONE",
    color: "blue",
    colorClass: {
      bg: "bg-blue-500/20",
      border: "border-blue-500",
      text: "text-blue-400"
    },
    bluePointsPerMinute: 2,
    description: "Moderate intensity"
  },
  {
    minPercent: 80,
    maxPercent: 90,
    name: "ORANGE ZONE",
    color: "orange",
    colorClass: {
      bg: "bg-orange-500/20",
      border: "border-orange-500",
      text: "text-orange-400"
    },
    bluePointsPerMinute: 4,
    description: "High intensity cardio"
  },
  {
    minPercent: 90,
    maxPercent: 100,
    name: "RED ZONE",
    color: "red",
    colorClass: {
      bg: "bg-red-500/20",
      border: "border-red-500",
      text: "text-red-400"
    },
    bluePointsPerMinute: 5,
    description: "Maximum effort"
  }
];

export const BASE_ATTENDANCE_POINTS = 10;

export const calculateZoneFromPercentage = (
  currentHR: number,
  maxHR: number,
  zones: HeartRateZone[] = percentageBasedZones
): HeartRateZone => {
  if (!maxHR || maxHR === 0) {
    return zones[0]; // Default to green zone if no max HR
  }

  const percentage = (currentHR / maxHR) * 100;

  for (const zone of zones) {
    if (percentage >= zone.minPercent && percentage < zone.maxPercent) {
      return zone;
    }
  }

  // If >= 100%, return red zone
  return zones[zones.length - 1];
};

export const calculateBluePoints = (
  currentHR: number,
  maxHR: number,
  timeInMinutes: number,
  zones: HeartRateZone[] = percentageBasedZones
): number => {
  const zone = calculateZoneFromPercentage(currentHR, maxHR, zones);
  return zone.bluePointsPerMinute * timeInMinutes;
};

export const getZoneColor = (zone: number): string => {
  const colors = ["blue", "green", "orange", "red"];
  return colors[zone - 1] || "blue";
};
