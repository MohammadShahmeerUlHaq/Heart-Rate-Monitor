export interface CalorieCalculationParams {
  heartRate: number;
  age: number;
  weight: number; // in kg
}

/**
 * Calculates calories burned using the formula:
 * Calories = (Heart Rate × 0.6309 + Weight × 0.1988 + Age × 0.2017 - 55.0969) × Time in minutes / 4.184
 */
export const calculateCalories = (params: CalorieCalculationParams): number => {
  const { heartRate, age, weight } = params;

  if (!heartRate || !age || !weight) return 0;

  // Calculate calories burned per minute
  const caloriesPerMinute =
    (heartRate * 0.6309 + weight * 0.1988 + age * 0.2017 - 55.0969) / 4.184;

  // Return calories burned per minute
  return Math.max(0, caloriesPerMinute);
};
