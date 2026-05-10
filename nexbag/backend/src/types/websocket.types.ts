// WebSocket message type definitions
// Per API.md §12 and Architecture.md §8

export interface WsMessage<T = unknown> {
  event: WsEventName;
  device_id: string;
  payload: T;
  timestamp: string;
}

export type WsEventName =
  | 'rfid.update'
  | 'gps.update'
  | 'lock.status'
  | 'lock.command_ack'
  | 'device.online'
  | 'device.offline'
  | 'alert.item_missing'
  | 'alert.geofence_breach'
  | 'alert.unauthorized_open'
  | 'pong';

export interface RfidUpdatePayload {
  items: WsRfidItem[];
  unknown_tags?: Array<{ epc: string; tag_id: number | null }>;
}

export interface WsRfidItem {
  id: string;
  tag_id: number | null;
  epc: string;
  alias: string | null;
  icon: string;
  is_active: boolean;
  status: 'IN_BAG' | 'MISSING' | 'UNKNOWN';
  rssi: number | null;
  antenna_id: number | null;
  last_seen_at: string | null;
}

export interface GpsUpdatePayload {
  lat: number;
  lng: number;
  accuracy: number | null;
  recorded_at: string;
}

export interface LockStatusPayload {
  lock_state: 'LOCKED' | 'UNLOCKED' | 'UNKNOWN';
  changed_at: string;
}

export interface LockCommandAckPayload {
  command_id: string;
  status: 'SUCCESS' | 'TIMEOUT' | 'FAILED';
}

export interface AlertItemMissingPayload {
  epc: string;
  alias: string;
}

export interface AlertGeofenceBreachPayload {
  lat: number;
  lng: number;
}

export interface AlertUnauthorizedOpenPayload {
  lat: number | null;
  lng: number | null;
  timestamp: string;
}
