import { HeartRateDevice } from '../types/electron';
import { SessionData, UserSessionStats } from '../types/session';

export class SessionManager {
  private static sessionData: Map<string, {
    heartRateData: number[];
    caloriesData: number[];
    bluePointsData: number[];
    startTime: Date;
  }> = new Map();

  private static sessionStartTime: Date | null = null;
  private static dataCollectionInterval: NodeJS.Timeout | null = null;

  static startSession(devices: HeartRateDevice[]): void {
    this.sessionStartTime = new Date();
    
    // Initialize data arrays for each device
    devices.forEach(device => {
      this.sessionData.set(device.id, {
        heartRateData: [],
        caloriesData: [],
        bluePointsData: [],
        startTime: new Date()
      });
    });

    // Start collecting data every 10 seconds
    this.dataCollectionInterval = setInterval(() => {
      this.collectDataPoint(devices);
    }, 10000);

    console.log('Session started for', devices.length, 'devices');
  }

  static stopSession(): Date | null {
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }

    const endTime = this.sessionStartTime;
    this.sessionStartTime = null;
    
    console.log('Session stopped');
    return endTime;
  }

  static isSessionActive(): boolean {
    return this.sessionStartTime !== null;
  }

  static getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000);
  }

  private static collectDataPoint(devices: HeartRateDevice[]): void {
    devices.forEach(device => {
      const sessionData = this.sessionData.get(device.id);
      if (sessionData) {
        sessionData.heartRateData.push(device.heartRate || 0);
        sessionData.caloriesData.push(device.calories || 0);
        sessionData.bluePointsData.push(device.bluePoints || 0);
      }
    });
  }

  static generateSessionData(devices: HeartRateDevice[], participantSettings: any): SessionData[] {
    const sessionDataArray: SessionData[] = [];
    const sessionDuration = this.getSessionDuration();

    devices.forEach(device => {
      const deviceSessionData = this.sessionData.get(device.id);
      const settings = participantSettings[device.id];
      
      if (deviceSessionData && settings) {
        const heartRateData = deviceSessionData.heartRateData;
        const validHeartRates = heartRateData.filter(hr => hr > 0);
        
        const sessionData: SessionData = {
          name: settings.name || device.name,
          email: settings.email || '',
          caloriesData: [...deviceSessionData.caloriesData],
          bluePointsData: [...deviceSessionData.bluePointsData],
          heartRateData: [...heartRateData],
          timestamp: this.sessionStartTime || new Date(),
          totalSessionTime: sessionDuration,
          averageHeartRate: validHeartRates.length > 0 
            ? validHeartRates.reduce((sum, hr) => sum + hr, 0) / validHeartRates.length 
            : 0,
          maxHeartRate: validHeartRates.length > 0 
            ? Math.max(...validHeartRates) 
            : 0,
          totalCalories: device.calories || 0,
          totalBluePoints: device.bluePoints || 0
        };

        sessionDataArray.push(sessionData);
      }
    });

    return sessionDataArray;
  }

  static calculateUserStats(devices: HeartRateDevice[]): Map<string, UserSessionStats> {
    const statsMap = new Map<string, UserSessionStats>();

    devices.forEach(device => {
      const deviceSessionData = this.sessionData.get(device.id);
      if (deviceSessionData) {
        const heartRateData = deviceSessionData.heartRateData;
        const validHeartRates = heartRateData.filter(hr => hr > 0);
        
        const stats: UserSessionStats = {
          averageHeartRate: validHeartRates.length > 0 
            ? validHeartRates.reduce((sum, hr) => sum + hr, 0) / validHeartRates.length 
            : 0,
          maxHeartRate: validHeartRates.length > 0 
            ? Math.max(...validHeartRates) 
            : 0,
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
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }
  }
}