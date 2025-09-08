interface ParticipantSettings {
  maxHeartRate: number;
}

// Store participant settings in localStorage to persist across sessions
export class ParticipantSettingsManager {
  private static getKey(participantId: string): string {
    return `participant_${participantId}_settings`;
  }

  static getSettings(participantId: string): ParticipantSettings {
    const key = this.getKey(participantId);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      maxHeartRate: 0 // Initialize with 0 to indicate no max HR set yet
    };
  }

  static updateMaxHeartRate(participantId: string, heartRate: number): void {
    const key = this.getKey(participantId);
    const settings = this.getSettings(participantId);

    // Only update if the new heart rate is higher than the stored max
    if (heartRate > settings.maxHeartRate) {
      settings.maxHeartRate = heartRate;
      localStorage.setItem(key, JSON.stringify(settings));
    }
  }

  static getMaxHeartRate(participantId: string): number {
    return this.getSettings(participantId).maxHeartRate;
  }

  // Optionally allow manual setting of max heart rate
  static setMaxHeartRate(participantId: string, maxHeartRate: number): void {
    const key = this.getKey(participantId);
    const settings = this.getSettings(participantId);
    settings.maxHeartRate = maxHeartRate;
    localStorage.setItem(key, JSON.stringify(settings));
  }
}
