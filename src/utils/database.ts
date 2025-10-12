import { SessionData } from "../types/session";

// Database configuration
const DB_CONFIG = {
  connectionString:
    "postgresql://neondb_owner:npg_PFYcur25WOXR@ep-floral-wildflower-advjfh6o-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
};

export class DatabaseService {
  static async initializeDatabase() {
    try {
      // Create sessions table if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS sessions (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          calories_data JSONB NOT NULL,
          blue_points_data JSONB NOT NULL,
          heart_rate_data JSONB NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          total_session_time INTEGER NOT NULL,
          average_heart_rate DECIMAL(5,2) NOT NULL,
          max_heart_rate INTEGER NOT NULL,
          total_calories DECIMAL(8,2) NOT NULL,
          total_blue_points DECIMAL(8,2) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;

      // const response = await fetch('/api/database/init', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ query: createTableQuery })
      // });

      // Use Electron IPC instead of fetch for API calls
      const response = await window.electronAPI.callAPI("database-init", {
        query: createTableQuery,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to initialize database");
      }

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Database initialization error:", error);
      throw error;
    }
  }

  static async saveSessionData(sessionData: SessionData): Promise<string> {
    try {
      const insertQuery = `
        INSERT INTO sessions (
          name, email, calories_data, blue_points_data, heart_rate_data,
          timestamp, total_session_time, average_heart_rate, max_heart_rate,
          total_calories, total_blue_points
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id;
      `;

      const values = [
        sessionData.name,
        sessionData.email,
        JSON.stringify(sessionData.caloriesData),
        JSON.stringify(sessionData.bluePointsData),
        JSON.stringify(sessionData.heartRateData),
        sessionData.timestamp,
        sessionData.totalSessionTime,
        sessionData.averageHeartRate,
        sessionData.maxHeartRate,
        sessionData.totalCalories,
        sessionData.totalBluePoints,
      ];

      // const response = await fetch('/api/database/insert', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ query: insertQuery, values })
      // });

      // Use Electron IPC instead of fetch for API calls
      const response = await window.electronAPI.callAPI("database-insert", {
        query: insertQuery,
        values,
      });

      if (!response.success) {
        throw new Error(response.error || "Failed to save session data");
      }

      return response.id;
    } catch (error) {
      console.error("Error saving session data:", error);
      throw error;
    }
  }
}
