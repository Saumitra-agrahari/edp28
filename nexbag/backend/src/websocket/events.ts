// WebSocket event name constants — matches API.md §12 exactly
export const WS_EVENTS = {
  // Server → Client
  RFID_UPDATE: 'rfid.update',
  GPS_UPDATE: 'gps.update',
  LOCK_STATUS: 'lock.status',
  LOCK_COMMAND_ACK: 'lock.command_ack',
  DEVICE_ONLINE: 'device.online',
  DEVICE_OFFLINE: 'device.offline',
  ALERT_ITEM_MISSING: 'alert.item_missing',
  ALERT_GEOFENCE_BREACH: 'alert.geofence_breach',
  ALERT_UNAUTHORIZED_OPEN: 'alert.unauthorized_open',

  // Client → Server
  PING: 'ping',

  // Server → Client response
  PONG: 'pong',
} as const;
