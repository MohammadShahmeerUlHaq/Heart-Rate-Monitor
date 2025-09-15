export interface SessionData {
  id?: string;
  name: string;
  email: string;
  caloriesData: number[];
  bluePointsData: number[];
  heartRateData: number[];
  timestamp: Date;
  totalSessionTime: number; // in seconds
  averageHeartRate: number;
  maxHeartRate: number;
  totalCalories: number;
  totalBluePoints: number;
}

export interface UserSessionStats {
  averageHeartRate: number;
  maxHeartRate: number;
  totalCalories: number;
  totalBluePoints: number;
}