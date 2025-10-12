import { HeartRateDevice } from "../types/electron";
import { SessionData, UserSessionStats } from "../types/session";

// Configuration: Data collection interval in milliseconds
const DATA_COLLECTION_INTERVAL_MS = 5000; // 10 seconds

export class SessionManager {
  private static sessionData: Map<
    string,
    {
      heartRateData: number[];
      caloriesData: number[];
      bluePointsData: number[];
      startTime: Date;
    }
  > = new Map();

  private static sessionStartTime: Date | null = null;
  private static sessionEndTime: Date | null = null;
  private static dataCollectionInterval: NodeJS.Timeout | null = null;
  private static currentDevices: HeartRateDevice[] = [];
  private static isPaused: boolean = false;
  private static pauseStartTime: Date | null = null;
  private static totalPausedTime: number = 0;
  private static lastDataCollectionTime: Date | null = null;

  static startSession(devices: HeartRateDevice[]): void {
    this.sessionEndTime = null;
    this.sessionStartTime = new Date();
    this.lastDataCollectionTime = new Date();
    this.currentDevices = [...devices]; // Store a copy of current devices

    // Initialize data arrays for each device
    devices.forEach((device) => {
      this.sessionData.set(device.id, {
        heartRateData: [],
        caloriesData: [],
        bluePointsData: [],
        startTime: new Date()
      });
    });

    // Start collecting data every 10 seconds
    this.dataCollectionInterval = setInterval(() => {
      // Get current devices from the global state instead of using stale reference
      this.collectDataPointFromGlobalState();
      this.lastDataCollectionTime = new Date();
    }, DATA_COLLECTION_INTERVAL_MS);

    console.log("Session started for", devices.length, "devices");
  }

  static updateCurrentDevices(devices: HeartRateDevice[]): void {
    this.currentDevices = [...devices];
  }

  private static collectDataPointFromGlobalState(): void {
    this.collectDataPoint(this.currentDevices);
  }

  static stopSession(): Date | null {
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }

    // Record end time so duration freezes post-stop
    const endTime = new Date();
    this.sessionEndTime = endTime;
    this.lastDataCollectionTime = null;

    console.log("Session stopped");
    return endTime;
  }

  static isSessionActive(): boolean {
    return this.sessionStartTime !== null;
  }

  static pauseSession(): void {
    if (!this.isSessionActive() || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.pauseStartTime = new Date();

    // Stop data collection but preserve timing
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }

    console.log("Session paused");
  }

  static resumeSession(): void {
    if (!this.isSessionActive() || !this.isPaused) {
      return;
    }

    // Calculate time spent paused and add to total
    let pauseDuration = 0;
    if (this.pauseStartTime) {
      pauseDuration = Date.now() - this.pauseStartTime.getTime();
      this.totalPausedTime += pauseDuration;
      this.pauseStartTime = null;
    }

    this.isPaused = false;

    // Calculate remaining time until next data collection
    const timeSinceLastCollection = this.lastDataCollectionTime
      ? Date.now() - this.lastDataCollectionTime.getTime() - pauseDuration
      : 0;

    const remainingTime = Math.max(
      0,
      DATA_COLLECTION_INTERVAL_MS - timeSinceLastCollection
    );

    console.log(
      `Resuming session. Time since last collection: ${timeSinceLastCollection}ms, remaining time: ${remainingTime}ms`
    );

    // Set timeout for the remaining time, then start regular interval
    if (remainingTime > 0) {
      setTimeout(() => {
        if (!this.isPaused && this.isSessionActive()) {
          this.collectDataPointFromGlobalState();
          this.lastDataCollectionTime = new Date();

          // Now start the regular interval
          this.dataCollectionInterval = setInterval(() => {
            this.collectDataPointFromGlobalState();
            this.lastDataCollectionTime = new Date();
          }, DATA_COLLECTION_INTERVAL_MS);
        }
      }, remainingTime);
    } else {
      // If remaining time is 0 or negative, collect immediately and start regular interval
      this.collectDataPointFromGlobalState();
      this.lastDataCollectionTime = new Date();

      this.dataCollectionInterval = setInterval(() => {
        this.collectDataPointFromGlobalState();
        this.lastDataCollectionTime = new Date();
      }, DATA_COLLECTION_INTERVAL_MS);
    }

    console.log("Session resumed");
  }

  static isSessionPaused(): boolean {
    return this.isPaused;
  }

  static getSessionDuration(): number {
    if (!this.sessionStartTime) {
      console.log("SessionManager: No session start time, returning 0");
      return 0;
    }

    const endReference = this.sessionEndTime
      ? this.sessionEndTime.getTime()
      : Date.now();

    let totalPausedTime = this.totalPausedTime;

    // If currently paused, add the current pause duration
    if (this.isPaused && this.pauseStartTime) {
      totalPausedTime += Date.now() - this.pauseStartTime.getTime();
    }

    const duration = Math.floor(
      (endReference - this.sessionStartTime.getTime() - totalPausedTime) / 1000
    );
    console.log("SessionManager: Session duration:", duration, "seconds");
    return Math.max(0, duration); // Ensure duration is never negative
  }

  private static collectDataPoint(devices: HeartRateDevice[]): void {
    console.log(
      "SessionManager: Collecting data point for",
      devices.length,
      "devices"
    );
    devices.forEach((device) => {
      const sessionData = this.sessionData.get(device.id);
      if (sessionData) {
        // Capture current values at this moment
        sessionData.heartRateData.push(device.heartRate || 0);
        sessionData.caloriesData.push(device.calories || 0);
        sessionData.bluePointsData.push(device.bluePoints || 0);

        console.log(
          `Data point collected for ${device.name}: HR=${device.heartRate}, Calories=${device.calories}, BluePoints=${device.bluePoints}`
        );
        console.log(
          `Current data arrays lengths: HR=${sessionData.heartRateData.length}, Calories=${sessionData.caloriesData.length}, BluePoints=${sessionData.bluePointsData.length}`
        );
      } else {
        console.log(
          `No session data found for device ${device.name} (${device.id})`
        );
      }
    });
  }

  static generateSessionData(
    devices: HeartRateDevice[],
    participantSettings: any
  ): SessionData[] {
    const sessionDataArray: SessionData[] = [];
    const sessionDuration = this.getSessionDuration();

    devices.forEach((device) => {
      const deviceSessionData = this.sessionData.get(device.id);
      const settings = participantSettings[device.id];

      if (deviceSessionData && settings) {
        const heartRateData = deviceSessionData.heartRateData;
        const validHeartRates = heartRateData.filter((hr) => hr > 0);

        const sessionData: SessionData = {
          name: settings.name || device.name,
          email: settings.email || "",
          caloriesData: [...deviceSessionData.caloriesData],
          bluePointsData: [...deviceSessionData.bluePointsData],
          heartRateData: [...heartRateData],
          timestamp: this.sessionStartTime || new Date(),
          totalSessionTime: sessionDuration,
          averageHeartRate:
            validHeartRates.length > 0
              ? validHeartRates.reduce((sum, hr) => sum + hr, 0) /
                validHeartRates.length
              : 0,
          maxHeartRate:
            validHeartRates.length > 0 ? Math.max(...validHeartRates) : 0,
          totalCalories: device.calories || 0,
          totalBluePoints: device.bluePoints || 0
        };

        sessionDataArray.push(sessionData);
      }
    });

    return sessionDataArray;
  }

  static calculateUserStats(
    devices: HeartRateDevice[]
  ): Map<string, UserSessionStats> {
    const statsMap = new Map<string, UserSessionStats>();

    devices.forEach((device) => {
      const deviceSessionData = this.sessionData.get(device.id);
      if (deviceSessionData) {
        const heartRateData = deviceSessionData.heartRateData;
        const validHeartRates = heartRateData.filter((hr) => hr > 0);

        const stats: UserSessionStats = {
          averageHeartRate:
            validHeartRates.length > 0
              ? validHeartRates.reduce((sum, hr) => sum + hr, 0) /
                validHeartRates.length
              : 0,
          maxHeartRate:
            validHeartRates.length > 0 ? Math.max(...validHeartRates) : 0,
          totalCalories: device.calories || 0,
          totalBluePoints: device.bluePoints || 0
        };

        statsMap.set(device.id, stats);
      }
    });

    return statsMap;
  }

  static clearSessionData(): void {
    this.sessionData.clear();
    this.sessionStartTime = null;
    this.sessionEndTime = null;
    this.isPaused = false;
    this.pauseStartTime = null;
    this.totalPausedTime = 0;
    this.lastDataCollectionTime = null;
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }
  }
}
