export interface HeartRateZone {
  min: number;
  max: number;
  name: string;
  color: string;
  description: string;
}

export const defaultHeartRateZones: HeartRateZone[] = [
  {
    min: 50,
    max: 100,
    name: "WARM UP",
    color: "blue",
    description: "Light activity, recovery",
  },
  {
    min: 100,
    max: 130,
    name: "FAT BURN",
    color: "green",
    description: "Moderate intensity, fat burning",
  },
  {
    min: 130,
    max: 160,
    name: "CARDIO",
    color: "orange",
    description: "High intensity cardio training",
  },
  {
    min: 160,
    max: 220,
    name: "PEAK",
    color: "red",
    description: "Maximum effort training",
  },
];

export const calculateHeartRateZone = (
  heartRate: number,
  zones: HeartRateZone[] = defaultHeartRateZones,
): number => {
  for (let i = 0; i < zones.length; i++) {
    if (heartRate >= zones[i].min && heartRate <= zones[i].max) {
      return i + 1;
    }
  }
  return 1; // Default to warm-up zone
};

export const getZoneColor = (zone: number): string => {
  const colors = ["blue", "green", "orange", "red"];
  return colors[zone - 1] || "blue";
};
