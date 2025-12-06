// ============================================================================
// TIMING CONSTANTS (ms) - Modify these to adjust connection behavior
// ============================================================================
const TIMING = {
  // Rescan interval: How often to rescan for disconnected devices (5s)
  RESCAN_INTERVAL: 5000,

  // Rescan detach delay: Time between detach and reattach during rescan (100ms)
  RESCAN_DETACH_DELAY: 100,

  // Rescan stagger: Time offset between scanning each channel (50ms per channel)
  RESCAN_CHANNEL_STAGGER: 50,

  // Device timeout: How long without data before marking device as disconnected (15s)
  DEVICE_TIMEOUT: 15000,

  // Connection debounce: Minimum time between connection state changes (2s)
  CONNECTION_DEBOUNCE: 2000,

  // Timeout check interval: How often to check for timed out devices (1s)
  TIMEOUT_CHECK_INTERVAL: 1000,

  // Graceful shutdown delay: Time to wait before closing stick (200ms)
  SHUTDOWN_DELAY: 200,

  // Pre-shutdown sensor detach delay (100ms)
  PRE_SHUTDOWN_DELAY: 100,

  // Reconnect verification: Time required without disconnect before marking truly reconnected (10s)
  RECONNECT_VERIFICATION_TIME: 10000
};
// ============================================================================
