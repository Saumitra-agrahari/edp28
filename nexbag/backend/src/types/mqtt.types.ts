// MQTT payload type definitions
// Per Architecture.md §9 and TechStack.md §3

export interface MqttRfidTagsPayload {
  tags: MqttRfidTag[];
  timestamp?: string;
  source?: string;
}

export interface MqttRfidTag {
  epc: string;
  tag_id?: number | null;
  id?: number | null;
  rssi?: number | null;
  antenna_id?: number | null;
}

export interface MqttGpsLocationPayload {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  source?: 'GPS' | 'Phone' | 'WiFi' | 'Cached' | string;
  timestamp: string;
}

export interface MqttLockStatusPayload {
  state: 'LOCKED' | 'UNLOCKED';
  command_id?: string;
  initiated_by?: 'app' | 'hardware' | 'system';
  timestamp: string;
}

export interface MqttHeartbeatPayload {
  firmware_version?: string;
  lock_state?: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
  battery_level?: number;
  timestamp: string;
}

export interface MqttAlertBreachPayload {
  timestamp: string;
  latitude?: number;
  longitude?: number;
}
