export interface CalorieCalculationParams {
  heartRate: number;
  age?: number;
  weight?: number; // in kg
  gender?: 'male' | 'female';
  duration: number; // in minutes
}

export const calculateCalories = (params: CalorieCalculationParams): number => {
  const { heartRate, age = 30, weight = 70, gender = 'male', duration } = params;
  
  // Basic calorie calculation using heart rate
  // This is a simplified formula - in production you'd want more sophisticated calculations
  let baseMET = 1.0;
  
  if (heartRate < 100) {
    baseMET = 2.0; // Light activity
  } else if (heartRate < 130) {
    baseMET = 4.0; // Moderate activity
  } else if (heartRate < 160) {
    baseMET = 7.0; // Vigorous activity
  } else {
    baseMET = 10.0; // Very vigorous activity
  }
  
  // Gender adjustment
  const genderMultiplier = gender === 'male' ? 1.0 : 0.9;
  
  // Age adjustment (slightly lower for older individuals)
  const ageMultiplier = Math.max(0.7, 1.0 - ((age - 20) * 0.01));
  
  // Calories = MET × weight (kg) × time (hours) × adjustments
  const calories = baseMET * weight * (duration / 60) * genderMultiplier * ageMultiplier;
  
  return Math.max(0, calories);
};