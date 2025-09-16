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
  private static sessionEndTime: Date | null = null;
  private static dataCollectionInterval: NodeJS.Timeout | null = null;
  private static currentDevices: HeartRateDevice[] = [];

  static startSession(devices: HeartRateDevice[]): void {
    this.sessionStartTime = new Date();
    this.sessionEndTime = null;
    this.currentDevices = [...devices]; // Store a copy of current devices
    
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
      // Get current devices from the global state instead of using stale reference
      this.collectDataPointFromGlobalState();
    }, 10000);

    console.log('Session started for', devices.length, 'devices');
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

    // const endTime = this.sessionStartTime;
    // this.sessionStartTime = null;
    // Record end time so duration freezes post-stop
    const endTime = new Date();
    this.sessionEndTime = endTime;
    
    console.log('Session stopped');
    return endTime;
  }

  static isSessionActive(): boolean {
    return this.sessionStartTime !== null;
  }

  static getSessionDuration(): number {
    if (!this.sessionStartTime) {
      console.log('SessionManager: No session start time, returning 0');
      return 0;
    }
    // const duration = Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000);
    const endReference = this.sessionEndTime ? this.sessionEndTime.getTime() : Date.now();
    const duration = Math.floor((endReference - this.sessionStartTime.getTime()) / 1000);
    console.log('SessionManager: Session duration:', duration, 'seconds');
    return duration;
  }

  private static collectDataPoint(devices: HeartRateDevice[]): void {
    console.log('SessionManager: Collecting data point for', devices.length, 'devices');
    devices.forEach(device => {
      const sessionData = this.sessionData.get(device.id);
      if (sessionData) {
        // Capture current values at this moment
        sessionData.heartRateData.push(device.heartRate || 0);
        sessionData.caloriesData.push(device.calories || 0);
        sessionData.bluePointsData.push(device.bluePoints || 0);
        
        console.log(`Data point collected for ${device.name}: HR=${device.heartRate}, Calories=${device.calories}, BluePoints=${device.bluePoints}`);
        console.log(`Current data arrays lengths: HR=${sessionData.heartRateData.length}, Calories=${sessionData.caloriesData.length}, BluePoints=${sessionData.bluePointsData.length}`);
      } else {
        console.log(`No session data found for device ${device.name} (${device.id})`);
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
    this.sessionEndTime = null;
    if (this.dataCollectionInterval) {
      clearInterval(this.dataCollectionInterval);
      this.dataCollectionInterval = null;
    }
  }
}