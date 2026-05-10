# API.md — API Specification
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. API Design Principles

- **RESTful conventions** for all CRUD-style operations.
- **WebSocket** for real-time push from server to mobile app.
- **Base URL:** `https://api.smartbagpack.app/v1` (production) / `http://localhost:3000/v1` (local)
- **Versioning:** URL-based (`/v1/`). Breaking changes go in `/v2/`.
- **JSON only:** All request and response bodies are `application/json`.
- **Consistent response envelope:** Every response uses the same wrapper format.
- **Snake_case** for all JSON keys.
- **UTC timestamps** in ISO 8601 format: `"2024-01-15T08:30:00.000Z"`.
- **Authentication:** JWT Bearer token in `Authorization` header for all protected routes.
- **Pagination:** Cursor-based for lists with unbounded growth (notifications, activity logs); page-based for small bounded lists (RFID tags).
- **Idempotency:** Lock/unlock commands use idempotency keys to prevent duplicate execution.
- **Soft errors:** Validation errors return 422 with field-level detail. Server errors return 500 with a safe generic message.

---

## 2. Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 145,
    "next_cursor": "eyJpZCI6IjEyMyJ9"
  }
}
```

- `data` — the payload. Object for single resources, array for lists.
- `message` — human-readable summary.
- `meta` — only present for paginated responses.

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more fields are invalid.",
    "fields": {
      "email": "Invalid email format.",
      "password": "Password must be at least 8 characters."
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_ERROR` | 422 | Request body failed validation |
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists (e.g., duplicate email) |
| `RATE_LIMITED` | 429 | Too many requests |
| `DEVICE_OFFLINE` | 503 | Command sent but device is not reachable |
| `COMMAND_TIMEOUT` | 504 | Device did not acknowledge command in time |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `ACCOUNT_LOCKED` | 423 | Account temporarily locked due to failed logins |

---

## 3. HTTP Status Codes

| Status | Usage |
|---|---|
| 200 | Successful GET, PUT, PATCH |
| 201 | Successful POST (resource created) |
| 204 | Successful DELETE (no body) |
| 400 | Malformed request (unparseable JSON) |
| 401 | Missing or invalid JWT token |
| 403 | Forbidden — not the device owner |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 422 | Validation error |
| 423 | Account locked |
| 429 | Rate limited |
| 500 | Internal server error |
| 503 | Device offline |
| 504 | Command timeout (no hardware ACK) |

---

## 4. Authentication Endpoints

### POST `/v1/auth/register`

Register a new user account.

**Request:**
```json
{
  "full_name": "Arjun Sharma",
  "email": "arjun@example.com",
  "password": "SecurePass@123",
  "confirm_password": "SecurePass@123"
}
```

**Validation:**
- `full_name`: required, string, 2–100 chars
- `email`: required, valid email format, lowercase normalized
- `password`: required, min 8 chars, at least 1 uppercase, 1 digit, 1 special char
- `confirm_password`: required, must equal `password`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "full_name": "Arjun Sharma",
      "email": "arjun@example.com",
      "has_device": false,
      "created_at": "2024-01-15T08:00:00.000Z"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...",
      "access_token_expires_in": 900,
      "refresh_token_expires_in": 604800
    }
  },
  "message": "Account created successfully."
}
```

**Response 409 (duplicate email):**
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "An account with this email already exists."
  }
}
```

---

### POST `/v1/auth/login`

Authenticate a user with email and password.

**Request:**
```json
{
  "email": "arjun@example.com",
  "password": "SecurePass@123",
  "remember_me": false
}
```

**Validation:**
- `email`: required, valid email
- `password`: required, non-empty
- `remember_me`: optional boolean, default false

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "full_name": "Arjun Sharma",
      "email": "arjun@example.com",
      "has_device": true,
      "device_id": "d4e5f6a7-..."
    },
    "tokens": {
      "access_token": "eyJ...",
      "refresh_token": "dGh...",
      "access_token_expires_in": 900,
      "refresh_token_expires_in": 604800
    }
  }
}
```

**Response 401:**
```json
{
  "success": false,
  "error": { "code": "UNAUTHORIZED", "message": "Invalid email or password." }
}
```

**Response 423 (locked):**
```json
{
  "success": false,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account temporarily locked. Try again in 12 minutes.",
    "locked_until": "2024-01-15T08:45:00.000Z"
  }
}
```

---

### POST `/v1/auth/token/refresh`

Exchange refresh token for new access + refresh token pair.

**Request:**
```json
{ "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..." }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "tokens": {
      "access_token": "eyJ...",
      "refresh_token": "bmV3UmVmcmVzaFRva2Vu...",
      "access_token_expires_in": 900
    }
  }
}
```

---

### POST `/v1/auth/logout`
**Auth required:** Yes

**Request:**
```json
{ "refresh_token": "dGh..." }
```

**Response 200:**
```json
{ "success": true, "message": "Logged out successfully." }
```

---

### POST `/v1/auth/password/forgot`

Request a password reset OTP.

**Request:**
```json
{ "email": "arjun@example.com" }
```

**Response 200** (always, regardless of whether email exists):
```json
{ "success": true, "message": "If this email exists, a reset OTP has been sent." }
```

---

### POST `/v1/auth/password/verify-otp`

Verify OTP and get a short-lived reset token.

**Request:**
```json
{ "email": "arjun@example.com", "otp": "482916" }
```

**Response 200:**
```json
{ "success": true, "data": { "reset_token": "one-time-use-token-abc123" } }
```

---

### POST `/v1/auth/password/reset`

Set new password using the reset token.

**Request:**
```json
{
  "reset_token": "one-time-use-token-abc123",
  "new_password": "NewSecure@456",
  "confirm_password": "NewSecure@456"
}
```

**Response 200:**
```json
{ "success": true, "message": "Password updated. Please log in." }
```

---

## 5. User / Profile Endpoints

All routes require `Authorization: Bearer <access_token>`.

### GET `/v1/users/me`

Get current user profile.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "full_name": "Arjun Sharma",
    "email": "arjun@example.com",
    "has_device": true,
    "device_id": "d4e5f6a7-...",
    "quiet_hours_enabled": true,
    "quiet_hours_start": "23:00",
    "quiet_hours_end": "07:00",
    "created_at": "2024-01-10T12:00:00.000Z"
  }
}
```

---

### PATCH `/v1/users/me`

Update user profile.

**Request:**
```json
{
  "full_name": "Arjun Kumar Sharma"
}
```

**Response 200:**
```json
{ "success": true, "data": { "full_name": "Arjun Kumar Sharma", ... } }
```

---

### POST `/v1/users/me/password`

Change password while authenticated.

**Request:**
```json
{
  "current_password": "SecurePass@123",
  "new_password": "NewSecure@456",
  "confirm_password": "NewSecure@456"
}
```

**Response 200:**
```json
{ "success": true, "message": "Password updated." }
```

---

### POST `/v1/users/me/fcm-token`

Register or update FCM push notification token.

**Request:**
```json
{
  "fcm_token": "fXg5...",
  "platform": "android"
}
```

**Response 200:**
```json
{ "success": true, "message": "FCM token registered." }
```

---

### DELETE `/v1/users/me/fcm-token`

Remove FCM token (called on logout).

**Request:**
```json
{ "fcm_token": "fXg5..." }
```

**Response 204:** No body.

---

## 6. Device Endpoints

### POST `/v1/devices/pair`

Pair a device to the authenticated user's account.

**Request:**
```json
{ "device_code": "SBP-A1B2C3D4E5F6" }
```

**Validation:**
- `device_code`: required, alphanumeric + hyphens, max 20 chars

**Response 200:**
```json
{
  "success": true,
  "data": {
    "device": {
      "id": "d4e5f6a7-...",
      "device_code": "SBP-A1B2C3D4E5F6",
      "device_name": "My Smart Bag-Pack",
      "is_online": false,
      "lock_state": "LOCKED",
      "firmware_version": "1.0.0"
    }
  },
  "message": "Device paired successfully."
}
```

---

### GET `/v1/devices/me`

Get the paired device status and details.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "d4e5f6a7-...",
    "device_code": "SBP-A1B2C3D4E5F6",
    "device_name": "Arjun's Bag",
    "is_online": true,
    "last_heartbeat_at": "2024-01-15T08:29:00.000Z",
    "firmware_version": "1.0.3",
    "lock_state": "LOCKED",
    "last_known_lat": 23.1765,
    "last_known_lng": 79.9864,
    "last_location_at": "2024-01-15T08:29:30.000Z"
  }
}
```

---

### PATCH `/v1/devices/me`

Update device settings (name).

**Request:**
```json
{ "device_name": "Arjun's Bag" }
```

**Response 200:**
```json
{ "success": true, "data": { "device_name": "Arjun's Bag" } }
```

---

### DELETE `/v1/devices/me/unpair`

Unpair the device from the user's account.

**Response 200:**
```json
{ "success": true, "message": "Device unpaired." }
```

---

## 7. RFID Tag Endpoints

### GET `/v1/rfid/tags`

Get all registered RFID tag aliases for the user's device.

**Query params:**
- `status` — `in_bag` | `missing` | `all` (default: `all`)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "t1a2b3c4-...",
      "epc": "E2004700000000000000000A",
      "alias": "MacBook Pro",
      "icon": "laptop",
      "status": "IN_BAG",
      "rssi": -52,
      "last_seen_at": "2024-01-15T08:29:55.000Z"
    },
    {
      "id": "t2b3c4d5-...",
      "epc": "E2004700000000000000000B",
      "alias": "ID Card",
      "icon": "card-account-details",
      "status": "MISSING",
      "rssi": null,
      "last_seen_at": "2024-01-15T08:20:10.000Z"
    }
  ]
}
```

---

### POST `/v1/rfid/tags`

Register a new RFID tag alias (or assign name to a detected tag).

**Request:**
```json
{
  "epc": "E2004700000000000000000A",
  "alias": "MacBook Pro",
  "icon": "laptop"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "t1a2b3c4-...",
    "epc": "E2004700000000000000000A",
    "alias": "MacBook Pro",
    "icon": "laptop"
  }
}
```

---

### PATCH `/v1/rfid/tags/:tagId`

Update alias or icon for a tag.

**Request:**
```json
{ "alias": "MacBook Air", "icon": "laptop" }
```

**Response 200:**
```json
{ "success": true, "data": { "id": "...", "alias": "MacBook Air", "icon": "laptop" } }
```

---

### DELETE `/v1/rfid/tags/:tagId`

Remove a tag alias (soft delete).

**Response 204:** No body.

---

### GET `/v1/rfid/live`

Get the current live item status list (combines tag readings + tag aliases).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "device_online": true,
    "last_updated": "2024-01-15T08:29:58.000Z",
    "items": [
      {
        "epc": "E2004700000000000000000A",
        "alias": "MacBook Pro",
        "icon": "laptop",
        "status": "IN_BAG",
        "rssi": -52,
        "antenna_id": 1,
        "last_seen_at": "2024-01-15T08:29:55.000Z"
      }
    ]
  }
}
```

---

## 8. GPS Endpoints

### GET `/v1/gps/current`

Get the device's last known GPS location.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "latitude": 23.1765,
    "longitude": 79.9864,
    "accuracy": 12.5,
    "altitude": 412.0,
    "is_stale": false,
    "recorded_at": "2024-01-15T08:29:30.000Z",
    "device_online": true
  }
}
```

**`is_stale`:** true if last update > 60 seconds ago or device is offline.

---

### GET `/v1/gps/history`

Get GPS location history.

**Query params:**
- `from` — ISO 8601 date string (required)
- `to` — ISO 8601 date string (optional, default: now)
- `cursor` — pagination cursor (optional)
- `limit` — results per page, default 50, max 200

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "g1a2b3c4-...",
      "latitude": 23.1765,
      "longitude": 79.9864,
      "accuracy": 12.5,
      "recorded_at": "2024-01-15T08:29:30.000Z"
    }
  ],
  "meta": {
    "next_cursor": "eyJpZCI6IjEyMyJ9",
    "count": 50
  }
}
```

---

### GET `/v1/gps/geofence`

Get the current geofence configuration.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "gc1a2b3c-...",
    "is_enabled": true,
    "center_lat": 23.1770,
    "center_lng": 79.9860,
    "radius_meters": 100,
    "current_state": "INSIDE"
  }
}
```

---

### PUT `/v1/gps/geofence`

Create or update geofence configuration.

**Request:**
```json
{
  "is_enabled": true,
  "center_lat": 23.1770,
  "center_lng": 79.9860,
  "radius_meters": 100
}
```

**Validation:**
- `center_lat`: required if is_enabled, -90 to 90
- `center_lng`: required if is_enabled, -180 to 180
- `radius_meters`: must be one of [50, 100, 200, 500]

**Response 200:**
```json
{ "success": true, "data": { "is_enabled": true, "radius_meters": 100, ... } }
```

---

## 9. Lock Endpoints

### GET `/v1/lock/status`

Get current lock state.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "lock_state": "LOCKED",
    "last_changed_at": "2024-01-15T08:00:00.000Z",
    "device_online": true
  }
}
```

---

### POST `/v1/lock/command`

Send a lock or unlock command to the device.

**Request:**
```json
{
  "action": "LOCK",
  "idempotency_key": "uuid-v4-from-client"
}
```

**Validation:**
- `action`: required, must be `LOCK` or `UNLOCK`
- `idempotency_key`: required, UUID v4, used to prevent duplicate commands

**Response 200 (command sent, awaiting hardware ACK):**
```json
{
  "success": true,
  "data": {
    "command_id": "lc1a2b3c-...",
    "action": "LOCK",
    "status": "PENDING",
    "message": "Command sent. Waiting for device confirmation."
  }
}
```

**Response 503 (device offline):**
```json
{
  "success": false,
  "error": {
    "code": "DEVICE_OFFLINE",
    "message": "Cannot send command. Your bag is currently offline."
  }
}
```

---

### GET `/v1/lock/history`

Get recent lock event history.

**Query params:**
- `limit` — default 20, max 50

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "le1a2b3c-...",
      "event_type": "LOCK_CONFIRMED",
      "initiated_by": "app",
      "status": "SUCCESS",
      "created_at": "2024-01-15T08:00:05.000Z"
    }
  ]
}
```

---

## 10. Notification Endpoints

### GET `/v1/notifications`

Get paginated list of user notifications.

**Query params:**
- `cursor` — pagination cursor
- `limit` — default 20, max 50
- `type` — filter by notification type (optional)
- `unread_only` — boolean (optional)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "n1a2b3c4-...",
      "type": "ITEM_MISSING",
      "title": "Item Missing",
      "body": "MacBook Pro is missing from your bag.",
      "is_read": false,
      "data": { "screen": "items", "epc": "E200..." },
      "created_at": "2024-01-15T08:25:00.000Z"
    }
  ],
  "meta": {
    "unread_count": 3,
    "next_cursor": "eyJpZCI6IjQ1NiJ9"
  }
}
```

---

### PATCH `/v1/notifications/:notificationId/read`

Mark a single notification as read.

**Response 200:**
```json
{ "success": true, "data": { "id": "...", "is_read": true } }
```

---

### POST `/v1/notifications/read-all`

Mark all notifications as read.

**Response 200:**
```json
{ "success": true, "message": "All notifications marked as read." }
```

---

### GET `/v1/notifications/preferences`

Get notification preferences.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "preferences": [
      { "type": "ITEM_MISSING", "is_enabled": true },
      { "type": "GEOFENCE_BREACH", "is_enabled": true },
      { "type": "UNAUTHORIZED_ACCESS", "is_enabled": true },
      { "type": "LOCK_STATE_CHANGE", "is_enabled": true },
      { "type": "DEVICE_OFFLINE", "is_enabled": true },
      { "type": "DEVICE_ONLINE", "is_enabled": false }
    ],
    "quiet_hours": {
      "enabled": true,
      "start": "23:00",
      "end": "07:00"
    }
  }
}
```

---

### PUT `/v1/notifications/preferences`

Update notification preferences.

**Request:**
```json
{
  "preferences": [
    { "type": "DEVICE_ONLINE", "is_enabled": false }
  ],
  "quiet_hours": {
    "enabled": true,
    "start": "23:00",
    "end": "07:00"
  }
}
```

**Response 200:**
```json
{ "success": true, "message": "Preferences updated." }
```

---

## 11. Activity Log Endpoints

### GET `/v1/activity-logs`

Get paginated activity log.

**Query params:**
- `cursor` — pagination cursor
- `limit` — default 25, max 100
- `event_type` — filter by type (optional)
- `from` — ISO 8601 date (optional)
- `to` — ISO 8601 date (optional)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "al1a2b3c-...",
      "event_type": "LOCK_COMMAND",
      "description": "You locked your bag from the app.",
      "metadata": { "action": "LOCK" },
      "latitude": 23.1765,
      "longitude": 79.9864,
      "created_at": "2024-01-15T08:00:00.000Z"
    }
  ],
  "meta": {
    "next_cursor": "eyJ...",
    "count": 25
  }
}
```

---

## 12. WebSocket Specification

### Connection

```
ws://api.smartbagpack.app/ws?token=<access_token>
```

JWT access token passed as query parameter on connection. Server validates on handshake. Invalid token → connection refused (1008 Policy Violation).

### Server → Client Message Format

```json
{
  "event": "rfid.update",
  "device_id": "d4e5f6a7-...",
  "payload": { ... },
  "timestamp": "2024-01-15T08:29:58.000Z"
}
```

### Event Types (Server → Client)

| Event | Payload | Description |
|---|---|---|
| `rfid.update` | `{ items: [...] }` | Full updated item list |
| `gps.update` | `{ lat, lng, accuracy, recorded_at }` | New GPS position |
| `lock.status` | `{ lock_state, changed_at }` | Lock state changed |
| `lock.command_ack` | `{ command_id, status }` | Hardware acknowledged command |
| `device.online` | `{ device_id }` | Device came online |
| `device.offline` | `{ device_id }` | Device went offline |
| `alert.item_missing` | `{ epc, alias }` | Item missing detected |
| `alert.geofence_breach` | `{ lat, lng }` | Geofence breach |
| `alert.unauthorized_open` | `{ lat, lng, timestamp }` | Bag opened while locked |

### Client → Server Message Format

```json
{
  "event": "ping",
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

Client sends `ping` every 30 seconds to keep connection alive. Server responds with `pong`.

---

## 13. Pagination and Filtering Conventions

**Cursor-based pagination** (notifications, activity logs, GPS history):
- First request: omit `cursor`
- Server returns `meta.next_cursor`
- Next request: include `cursor=<value>`
- No more pages: `meta.next_cursor` is `null`

**Page-based pagination** (small lists):
- Params: `page=1&per_page=20`
- Response meta: `{ page, per_page, total }`

**Filtering:**
- All filter params are optional; omitting returns all
- Multiple values: comma-separated `event_type=ITEM_MISSING,GEOFENCE_BREACH`

**Sorting:**
- Default: `created_at DESC` on all list endpoints
- Not configurable in v1 (fixed sort)

---

## 14. Security Considerations

- All endpoints (except auth) require `Authorization: Bearer <token>`.
- Device ownership checked on every device-related endpoint.
- Lock commands validated: user must own the device, device must be online.
- Idempotency keys on lock commands prevent double-firing from retries.
- Rate limits:
  - Auth endpoints: 10 requests / 15 minutes per IP
  - All other endpoints: 100 requests / minute per user
  - WebSocket: 1 connection per authenticated user

  ---

  ## Implemented Endpoints (scanned from backend)

  The following endpoints are implemented in the repository under `backend/src/routes` and `backend/src/controllers`. Use these as the authoritative list for v1 behavior.

  - GET `/v1/health` — health check (no auth)

  Auth
  - POST `/v1/auth/register`
  - POST `/v1/auth/login`
  - POST `/v1/auth/token/refresh`
  - POST `/v1/auth/logout` (requires auth)
  - POST `/v1/auth/password/forgot`
  - POST `/v1/auth/password/verify-otp`
  - POST `/v1/auth/password/reset`

  Users
  - GET `/v1/users/me` (auth)
  - PATCH `/v1/users/me` (auth)
  - POST `/v1/users/me/password` (auth)
  - POST `/v1/users/me/fcm-token` (auth)
  - DELETE `/v1/users/me/fcm-token` (auth)

  Devices
  - POST `/v1/devices/pair` (auth)
  - GET `/v1/devices/me` (auth + device owner)
  - PATCH `/v1/devices/me` (auth + device owner)
  - DELETE `/v1/devices/me/unpair` (auth + device owner)

  RFID
  - GET `/v1/rfid/tags` (auth + device owner)
  - POST `/v1/rfid/tags` (auth + device owner)
  - PATCH `/v1/rfid/tags/:tagId` (auth + device owner)
  - DELETE `/v1/rfid/tags/:tagId` (auth + device owner)
  - GET `/v1/rfid/live` (auth + device owner)

  GPS
  - GET `/v1/gps/current` (auth + device owner)
  - GET `/v1/gps/history` (auth + device owner)
  - GET `/v1/gps/geofence` (auth + device owner)
  - PUT `/v1/gps/geofence` (auth + device owner)

  Lock
  - GET `/v1/lock/status` (auth + device owner)
  - POST `/v1/lock/command` (auth + device owner)
  - GET `/v1/lock/history` (auth + device owner)

  Notifications & Activity Logs
  - GET `/v1/notifications` (auth)
  - PATCH `/v1/notifications/:notificationId/read` (auth)
  - POST `/v1/notifications/read-all` (auth)
  - GET `/v1/notifications/preferences` (auth)
  - PUT `/v1/notifications/preferences` (auth)
  - GET `/v1/activity-logs` (auth)

  Notes:
  - This list was generated by scanning `backend/src/routes/*.ts` and confirmed in `backend/src/controllers`.
  - For full request/response examples and validation rules, refer to the sections earlier in this document; the controllers use Zod validators and middleware as described in the codebase.
