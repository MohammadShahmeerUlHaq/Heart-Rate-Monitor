const { EventEmitter } = require("events");

class MockHRMService extends EventEmitter {
  constructor(numParticipants = 12) {
    super();
    this.participants = new Map();
    this.mockIntervals = new Map();
    this.baseHeartRates = new Map();
    this.numParticipants = Math.min(12, Math.max(1, numParticipants));
  }

  // Initialize a participant with a realistic base heart rate
  initializeParticipant(id) {
    // Base heart rate between 80-160 BPM
    const baseHeartRate = 80 + Math.floor(Math.random() * 80);
    this.baseHeartRates.set(id, baseHeartRate);

    return {
      id,
      name: `Mock Participant ${id}`,
      heartRate: baseHeartRate,
      lastUpdate: new Date(),
      connected: true,
      calories: 0,
      bluePoints: 0,
      gender: Math.random() > 0.5 ? "male" : "female"
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
      } else {
        // Ensure existing participants are marked as connected when starting
        const participant = this.participants.get(participantId);
        if (participant && !participant.connected) {
          participant.connected = true;
          this.emit("deviceConnected", participant);
        }
      }
    }

    // Update each participant's data
    this.participants.forEach((participant, id) => {
      if (this.mockIntervals.has(id)) return;

      const interval = setInterval(() => {
        const heartRate = this.generateHeartRate(id);
        const now = new Date();

        // Update participant data
        participant.heartRate = heartRate;
        participant.lastUpdate = now;
        participant.connected = true; // Ensure device stays connected while sending data

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
