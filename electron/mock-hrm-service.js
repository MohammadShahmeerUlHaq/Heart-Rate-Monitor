const { EventEmitter } = require("events");

class MockHRMService extends EventEmitter {
  constructor(numParticipants = 8) {
    super();
    this.participants = new Map();
    this.mockIntervals = new Map();
    this.baseHeartRates = new Map();
    this.numParticipants = Math.min(8, Math.max(1, numParticipants));
  }

  // Initialize a participant with a realistic base heart rate
  initializeParticipant(id) {
    // Base heart rate between 60-160 BPM
    const baseHeartRate = 60 + Math.floor(Math.random() * 100);
    this.baseHeartRates.set(id, baseHeartRate);

    return {
      id,
      name: `Mock Participant ${id}`,
      heartRate: baseHeartRate,
      lastUpdate: new Date(),
      connected: true,
      calories: 0,
      zone: this.calculateHeartRateZone(baseHeartRate)
    };
  }

  // Generate realistic heart rate variations
  generateHeartRate(participantId) {
    const baseHR = this.baseHeartRates.get(participantId);

    // Add some noise (+/- 5 BPM)
    const noise = Math.sin(Date.now() / 1000) * 5;

    // Add a longer-term variation (simulate effort changes)
    const longTermVariation = Math.sin(Date.now() / 10000) * 15;

    // Combine base rate with variations
    let newHR = Math.round(baseHR + noise + longTermVariation);

    // Ensure heart rate stays within realistic bounds
    newHR = Math.min(200, Math.max(60, newHR));

    return newHR;
  }

  startMocking() {
    // Create participants if they don't exist
    for (let i = 1; i <= this.numParticipants; i++) {
      const participantId = i;
      if (!this.participants.has(participantId)) {
        const participant = this.initializeParticipant(participantId);
        this.participants.set(participantId, participant);
        this.emit("deviceConnected", participant);
      }
    }

    // Update each participant's data
    this.participants.forEach((participant, id) => {
      if (this.mockIntervals.has(id)) return;

      const interval = setInterval(() => {
        const heartRate = this.generateHeartRate(id);
        const now = new Date();
        const timeDiff = (now - participant.lastUpdate) / (1000 * 60); // minutes

        // Update participant data
        participant.heartRate = heartRate;
        participant.lastUpdate = now;
        participant.zone = this.calculateHeartRateZone(heartRate);

        // Calculate calories (simplified formula)
        const caloriesPerMinute = this.calculateCaloriesPerMinute(heartRate);
        participant.calories += caloriesPerMinute * timeDiff;

        // Emit heart rate update
        this.emit("heartRateData", {
          deviceId: id,
          heartRate,
          timestamp: now
        });
      }, 1000 + Math.random() * 500); // Slightly different intervals for each participant

      this.mockIntervals.set(id, interval);
    });
  }

  stopMocking() {
    // Clear all intervals
    this.mockIntervals.forEach((interval) => clearInterval(interval));
    this.mockIntervals.clear();

    // Disconnect all participants
    this.participants.forEach((participant, id) => {
      participant.connected = false;
      this.emit("deviceDisconnected", id);
    });
  }

  calculateHeartRateZone(heartRate) {
    if (heartRate < 100) return 1; // Warm-up (blue)
    if (heartRate < 130) return 2; // Fat burn (green)
    if (heartRate < 160) return 3; // Cardio (orange)
    return 4; // Peak (red)
  }

  calculateCaloriesPerMinute(heartRate) {
    // Basic calorie estimation
    if (heartRate < 100) return 3;
    if (heartRate < 130) return 6;
    if (heartRate < 160) return 10;
    return 15;
  }

  getDevices() {
    return Array.from(this.participants.values());
  }

  updateDeviceName(deviceId, name) {
    const device = this.participants.get(deviceId);
    if (device) {
      device.name = name;
    }
  }
}

module.exports = { MockHRMService };
