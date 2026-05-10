// MQTT topic string constants
// Per TechStack.md §3 and Architecture.md §9

export const TOPICS = {
  // Device publishes to these (subscribed by backend)
  rfidTags: (deviceId: string) => `smartbag/${deviceId}/rfid/tags`,
  gpsLocation: (deviceId: string) => `smartbag/${deviceId}/gps/location`,
  lockStatus: (deviceId: string) => `smartbag/${deviceId}/lock/status`,
  heartbeat: (deviceId: string) => `smartbag/${deviceId}/heartbeat`,
  alertBreach: (deviceId: string) => `smartbag/${deviceId}/alert/breach`,

  // Backend publishes to these (subscribed by device)
  lockCommand: (deviceId: string) => `smartbag/${deviceId}/lock/command`,

  // Wildcard for subscribing to all device topics
  ALL: 'smartbag/+/#',
} as const;

// Extract deviceId from a topic string
// e.g. "smartbag/abc123/rfid/tags" → "abc123"
export function extractDeviceId(topic: string): string | null {
  const parts = topic.split('/');
  return parts.length >= 2 ? parts[1] ?? null : null;
}

// Get the category from a topic (e.g. "rfid/tags", "gps/location")
export function extractCategory(topic: string): string | null {
  const parts = topic.split('/');
  if (parts.length < 3) return null;
  return parts.slice(2).join('/');
}
