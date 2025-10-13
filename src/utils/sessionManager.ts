import { HeartRateDevice } from "../types/electron";
import { SessionData, UserSessionStats } from "../types/session";

const DATA_COLLECTION_INTERVAL_MS = 5000;

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
    this.currentDevices = [...devices];

    devices.forEach((device) => {
      this.sessionData.set(device.id, {
        heartRateData: [],
        caloriesData: [],
        bluePointsData: [],
        startTime: new Date()
      });
    });

    this.dataCollectionInterval = setInterval(() => {
      this.collectDataPointFromGlobalState();
      this.lastDataCollectionTime = new Date();
    }, DATA_COLLECTION_INTERVAL_MS);
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

    const endTime = new Date();
    this.sessionEndTime = endTime;
    this.lastDataCollectionTime = null;

    return endTime;
  }

  static isSessionActive(): boolean {
    return this.sessionStartTime !== null;
  }

  static pauseSession(): void {
    if (!this.isSessionActive() || this.isPaused) return;

    this.isPaused = true;
    this.pauseStartTime = new Date();

    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }
  }

  static resumeSession(): void {
    if (!this.isSessionActive() || !this.isPaused) {
      return;
    }

    let pauseDuration = 0;
    if (this.pauseStartTime) {
      pauseDuration = Date.now() - this.pauseStartTime.getTime();
      this.totalPausedTime += pauseDuration;
      this.pauseStartTime = null;
    }

    this.isPaused = false;

    const timeSinceLastCollection = this.lastDataCollectionTime
      ? Date.now() - this.lastDataCollectionTime.getTime() - pauseDuration
      : 0;
    const remainingTime = Math.max(
      0,
      DATA_COLLECTION_INTERVAL_MS - timeSinceLastCollection
    );

    const startRegularInterval = () => {
      this.dataCollectionInterval = setInterval(() => {
        this.collectDataPointFromGlobalState();
        this.lastDataCollectionTime = new Date();
      }, DATA_COLLECTION_INTERVAL_MS);
    };

    const handleIntervalStart = () => {
      if (!this.isPaused && this.isSessionActive()) {
        this.collectDataPointFromGlobalState();
        this.lastDataCollectionTime = new Date();
        startRegularInterval();
      }
    };

    remainingTime > 0
      ? setTimeout(handleIntervalStart, remainingTime)
      : handleIntervalStart();
  }

  static isSessionPaused(): boolean {
    return this.isPaused;
  }

  static getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;

    const endReference = this.sessionEndTime
      ? this.sessionEndTime.getTime()
      : Date.now();

    let totalPausedTime = this.totalPausedTime;

    if (this.isPaused && this.pauseStartTime) {
      totalPausedTime += Date.now() - this.pauseStartTime.getTime();
    }

    const duration = Math.floor(
      (endReference - this.sessionStartTime.getTime() - totalPausedTime) / 1000
    );
    return Math.max(0, duration);
  }

  private static collectDataPoint(devices: HeartRateDevice[]): void {
    devices.forEach((device) => {
      const sessionData = this.sessionData.get(device.id);
      if (sessionData) {
        sessionData.caloriesData.push(device.calories || 0);
        sessionData.heartRateData.push(device.heartRate || 0);
        sessionData.bluePointsData.push(device.bluePoints || 0);
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
