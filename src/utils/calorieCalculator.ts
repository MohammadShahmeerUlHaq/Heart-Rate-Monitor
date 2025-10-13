export interface CalorieCalculationParams {
  heartRate: number;
  age: number;
  weight: number; // in kg
}

// Simple memoization cache for calorie calculations
const memoCache = new Map<string, number>();
const CACHE_SIZE_LIMIT = 500; // Prevent unbounded growth

/**
 * Calculates calories burned using the formula:
 * Calories = (Heart Rate × 0.6309 + Weight × 0.1988 + Age × 0.2017 - 55.0969) × Time in minutes / 4.184
 */
export const calculateCalories = (params: CalorieCalculationParams): number => {
  const { heartRate, age, weight } = params;

  if (!heartRate || !age || !weight) return 0;

  // Generate cache key
  const cacheKey = `${heartRate}_${age}_${weight}`;
  if (memoCache.has(cacheKey)) return memoCache.get(cacheKey)!;

  // Calculate calories burned per minute
  const caloriesPerMinute =
    (heartRate * 0.6309 + weight * 0.1988 + age * 0.2017 - 55.0969) / 4.184;
  const result = Math.max(0, caloriesPerMinute);

  // Store in cache
  memoCache.set(cacheKey, result);

  // Prevent cache from growing too large
  if (memoCache.size > CACHE_SIZE_LIMIT) {
    const firstKey = memoCache.keys().next().value;
    if (firstKey !== undefined) memoCache.delete(firstKey);
  }

  return result;
};
