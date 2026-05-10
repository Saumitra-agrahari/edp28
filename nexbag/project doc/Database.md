# Database.md — Database Schema
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. Database Philosophy

- **PostgreSQL 15** with Prisma ORM as the single source of truth for schema.
- Prefer **explicit foreign keys** and **NOT NULL constraints** over application-level enforcement wherever possible.
- Use **UUIDs** as primary keys for all tables (prevents enumeration attacks, safe for distributed systems).
- Use **timestamptz** (timestamp with time zone) for all timestamps — store in UTC, display in user's local time on the frontend.
- Prefer **normalized** design; denormalize only where read performance genuinely requires it.
- All tables have `created_at` and `updated_at` fields managed by Prisma.
- Soft deletes (`deleted_at`) are used for user records and tag aliases. Hard deletes for ephemeral data (sessions, notifications older than 90 days).
- Indexes defined on all foreign keys and all frequently-filtered columns.

---

## 2. Entity List

| Entity | Table Name | Description |
|---|---|---|
| User | `users` | App user accounts |
| User Session | `user_sessions` | Refresh token storage |
| User Device Token | `user_device_tokens` | FCM push tokens |
| Device | `devices` | Smart Bag-Pack hardware units |
| RFID Tag | `rfid_tags` | Tag alias registrations |
| Tag Reading | `tag_readings` | Live/recent RFID scan events |
| GPS Location | `gps_locations` | GPS coordinate history |
| Lock Event | `lock_events` | Lock/unlock command and status history |
| Notification | `notifications` | In-app notification records |
| Notification Preference | `notification_preferences` | Per-user, per-type notification settings |
| Activity Log | `activity_logs` | Full event audit trail |
| Geofence Config | `geofence_configs` | User-defined geofence settings |

---

## 3. Table Schemas

---

### 3.1 `users`

Stores registered app user accounts.

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       VARCHAR(100) NOT NULL,
  email           VARCHAR(255) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  device_id       UUID REFERENCES devices(id) ON DELETE SET NULL,
  failed_login_attempts  INT NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,
  last_login_at   TIMESTAMPTZ,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_device_id ON users(device_id);
```

**Field notes:**
- `email` — unique, lowercase normalized before storage
- `password_hash` — bcrypt hash, cost factor 12
- `device_id` — FK to `devices`; nullable (unpaired user has no device)
- `failed_login_attempts` — reset to 0 on successful login
- `locked_until` — account locked until this time after 5 failed logins
- `deleted_at` — soft delete; NULL = active account

**Example record:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "full_name": "Arjun Sharma",
  "email": "arjun@example.com",
  "password_hash": "$2b$12$...",
  "device_id": "d4e5f6a7-b8c9-0123-def0-123456789abc",
  "failed_login_attempts": 0,
  "locked_until": null,
  "last_login_at": "2024-01-15T08:30:00Z",
  "deleted_at": null,
  "created_at": "2024-01-10T12:00:00Z",
  "updated_at": "2024-01-15T08:30:00Z"
}
```

---

### 3.2 `user_sessions`

Stores refresh tokens for JWT-based authentication. One row per active session.

```sql
CREATE TABLE user_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token   VARCHAR(512) NOT NULL UNIQUE,
  device_info     VARCHAR(255),
  ip_address      INET,
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_refresh_token ON user_sessions(refresh_token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
```

**Field notes:**
- `refresh_token` — hashed SHA-256 of the actual token sent to client
- `device_info` — e.g., "Android 12, Samsung Galaxy S21"
- `revoked_at` — set on logout or password reset; NULL = active
- `expires_at` — 7 days (or 30 days with "remember me")
- Expired and revoked sessions cleaned up by cron job daily

---

### 3.3 `user_device_tokens`

Stores FCM push notification tokens for each user's mobile device.

```sql
CREATE TABLE user_device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token   VARCHAR(512) NOT NULL,
  platform    VARCHAR(10) NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, fcm_token)
);

CREATE INDEX idx_user_device_tokens_user_id ON user_device_tokens(user_id);
```

**Field notes:**
- A user may have multiple FCM tokens (multiple devices) — v1 effectively has one per user.
- Tokens are upserted on login: insert new or update `updated_at` on conflict.
- Tokens deleted on logout.

---

### 3.4 `devices`

Represents the physical Smart Bag-Pack hardware unit.

```sql
CREATE TABLE devices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_code     VARCHAR(20) NOT NULL UNIQUE,
  owner_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  device_name     VARCHAR(100) NOT NULL DEFAULT 'My Smart Bag-Pack',
  is_online       BOOLEAN NOT NULL DEFAULT FALSE,
  last_heartbeat_at TIMESTAMPTZ,
  firmware_version  VARCHAR(20),
  geofence_state    VARCHAR(10) NOT NULL DEFAULT 'INSIDE'
                    CHECK (geofence_state IN ('INSIDE', 'OUTSIDE')),
  lock_state        VARCHAR(10) NOT NULL DEFAULT 'LOCKED'
                    CHECK (lock_state IN ('LOCKED', 'UNLOCKED', 'UNKNOWN')),
  last_known_lat    DOUBLE PRECISION,
  last_known_lng    DOUBLE PRECISION,
  last_location_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_device_code ON devices(device_code);
CREATE INDEX idx_devices_owner_user_id ON devices(owner_user_id);
```

**Field notes:**
- `device_code` — alphanumeric code (e.g., "SBP-A1B2C3D4E5F6") printed on hardware; used for pairing
- `owner_user_id` — NULL if device is not yet paired or has been unpaired
- `geofence_state` — current state machine: INSIDE or OUTSIDE geofence. Used to prevent duplicate alerts.
- `lock_state` — last known lock state from hardware
- `last_known_lat/lng` — cached latest GPS position for quick reads (avoiding latest query on gps_locations)

**Example record:**
```json
{
  "id": "d4e5f6a7-b8c9-0123-def0-123456789abc",
  "device_code": "SBP-A1B2C3D4E5F6",
  "owner_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "device_name": "Arjun's Bag",
  "is_online": true,
  "last_heartbeat_at": "2024-01-15T08:29:00Z",
  "firmware_version": "1.0.3",
  "geofence_state": "INSIDE",
  "lock_state": "LOCKED",
  "last_known_lat": 23.1765,
  "last_known_lng": 79.9864,
  "last_location_at": "2024-01-15T08:29:30Z"
}
```

---

### 3.5 `rfid_tags`

Stores user-assigned alias names for RFID tag EPCs.

```sql
CREATE TABLE rfid_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  epc         VARCHAR(64) NOT NULL,
  alias       VARCHAR(50),
  icon        VARCHAR(30) NOT NULL DEFAULT 'bag-personal',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(device_id, epc)
);

CREATE INDEX idx_rfid_tags_device_id ON rfid_tags(device_id);
CREATE INDEX idx_rfid_tags_epc ON rfid_tags(epc);
```

**Field notes:**
- `epc` — Electronic Product Code; globally unique per physical RFID tag
- `alias` — human-readable name; NULL = unnamed tag (shows raw EPC in app)
- `icon` — icon name from MaterialCommunityIcons set
- `deleted_at` — soft delete; tag can be "unregistered" without losing history
- Unique constraint on (device_id, epc) — same EPC cannot be registered twice on same device

**Example records:**
```json
[
  { "epc": "E2004700000000000000000A", "alias": "MacBook Pro", "icon": "laptop" },
  { "epc": "E2004700000000000000000B", "alias": "IIITDM ID Card", "icon": "card-account-details" },
  { "epc": "E2004700000000000000000C", "alias": "Charger", "icon": "power-plug" },
  { "epc": "E2004700000000000000000D", "alias": null, "icon": "bag-personal" }
]
```

---

### 3.6 `tag_readings`

Stores recent RFID scan events from the hardware. Used for live item status determination.

```sql
CREATE TABLE tag_readings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  epc         VARCHAR(64) NOT NULL,
  rssi        SMALLINT,
  antenna_id  SMALLINT,
  read_count  INT NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tag_readings_device_id ON tag_readings(device_id);
CREATE INDEX idx_tag_readings_last_seen_at ON tag_readings(last_seen_at);
CREATE INDEX idx_tag_readings_device_epc ON tag_readings(device_id, epc);
```

**Field notes:**
- This table stores the **current session** reading state — not a full history.
- On each MQTT message: upsert on (device_id, epc) — increment read_count, update last_seen_at.
- A tag is considered "in bag" if `last_seen_at > NOW() - interval '10 seconds'`.
- A tag is considered "missing" if `last_seen_at < NOW() - interval '10 seconds'` AND `last_seen_at > NOW() - interval '60 seconds'` (was recently present).
- Rows older than 60 seconds are cleaned by a cron job (keeps table small and fast).

---

### 3.7 `gps_locations`

Stores GPS coordinate history from the hardware.

```sql
CREATE TABLE gps_locations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  accuracy    FLOAT,
  altitude    FLOAT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gps_locations_device_id ON gps_locations(device_id);
CREATE INDEX idx_gps_locations_recorded_at ON gps_locations(recorded_at);
CREATE INDEX idx_gps_locations_device_recorded ON gps_locations(device_id, recorded_at DESC);
```

**Field notes:**
- One row per GPS update from hardware (every 10 seconds).
- `accuracy` — horizontal accuracy in meters from GPS module.
- Rows older than 30 days are hard-deleted by a scheduled cron job.
- For live location: query `devices.last_known_lat/lng` (cached), not this table.
- For history: query this table filtered by device_id + date range.

**Estimated row volume:** ~8,640 rows/device/day (1 per 10s × 86,400s). With 30-day retention and 10 devices: 2.6M rows max. Indexing by (device_id, recorded_at DESC) handles this efficiently.

---

### 3.8 `lock_events`

Stores lock command and status change history.

```sql
CREATE TABLE lock_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type  VARCHAR(30) NOT NULL
              CHECK (event_type IN (
                'LOCK_COMMAND', 'UNLOCK_COMMAND',
                'LOCK_CONFIRMED', 'UNLOCK_CONFIRMED',
                'LOCK_TIMEOUT', 'UNAUTHORIZED_OPEN'
              )),
  initiated_by VARCHAR(10) NOT NULL DEFAULT 'app'
               CHECK (initiated_by IN ('app', 'hardware', 'system')),
  status      VARCHAR(10) NOT NULL DEFAULT 'PENDING'
              CHECK (status IN ('PENDING', 'SUCCESS', 'TIMEOUT', 'FAILED')),
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lock_events_device_id ON lock_events(device_id);
CREATE INDEX idx_lock_events_created_at ON lock_events(created_at);
```

**Field notes:**
- `user_id` — set when command originates from app; NULL for hardware-initiated events.
- `initiated_by` — "app" (user tapped lock button), "hardware" (physical override), "system" (auto-lock rule in future).
- `status` — PENDING until hardware ACKs; updated to SUCCESS or TIMEOUT.
- `latitude/longitude` — bag's GPS position at time of event.

---

### 3.9 `notifications`

Stores all notifications sent to users, powering the in-app notification center.

```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(30) NOT NULL,
  title           VARCHAR(100) NOT NULL,
  body            VARCHAR(500) NOT NULL,
  data            JSONB,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  fcm_sent        BOOLEAN NOT NULL DEFAULT FALSE,
  fcm_sent_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

**Valid notification types:**
`ITEM_MISSING`, `GEOFENCE_BREACH`, `UNAUTHORIZED_ACCESS`, `LOCK_STATE_CHANGE`, `DEVICE_OFFLINE`, `DEVICE_ONLINE`

**`data` JSONB example:**
```json
{
  "type": "ITEM_MISSING",
  "screen": "items",
  "epc": "E2004700000000000000000A",
  "alias": "MacBook Pro"
}
```

**Retention:** Rows older than 90 days deleted by cron job.

---

### 3.10 `notification_preferences`

Stores user preferences for each notification type.

```sql
CREATE TABLE notification_preferences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL,
  is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, notification_type)
);

CREATE INDEX idx_notif_prefs_user_id ON notification_preferences(user_id);

---

## Implemented / Code Notes

- The database schema is implemented with Prisma; see `backend/prisma/schema.prisma` and migration files under `backend/prisma/migrations`.
- Seed data (device codes) is provided in `backend/prisma/seed.ts` and used by the development setup.
- Retention and cleanup behaviors are implemented by scheduled jobs in `backend/src/jobs/cleanup.job.ts` (GPS, notifications, sessions) and `heartbeat-check.job.ts` for device online status.
- The live `tag_readings` upsert behavior and logic for determining IN_BAG vs MISSING are implemented in `backend/src/services/rfid.service.ts` and MQTT handlers in `backend/src/mqtt/handlers/rfid.handler.ts`.

Notes:
- Use `npx prisma studio` and `npx prisma migrate dev` as described in `Deployment.md` to inspect and apply schema changes locally.
```

**Seed data:** On user registration, insert default preference rows for all notification types with `is_enabled = TRUE`.

**Quiet hours** stored on `users` table as two additional columns (avoids an extra table for v1):

```sql
ALTER TABLE users ADD COLUMN quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN quiet_hours_start   TIME,
ALTER TABLE users ADD COLUMN quiet_hours_end     TIME;
```

---

### 3.11 `activity_logs`

Full chronological audit trail of all system events.

```sql
CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  device_id   UUID REFERENCES devices(id) ON DELETE SET NULL,
  event_type  VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  metadata    JSONB,
  latitude    DOUBLE PRECISION,
  longitude   DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_device_id ON activity_logs(device_id);
CREATE INDEX idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
```

**Valid event types:**
```
ITEM_DETECTED
ITEM_MISSING
LOCK_COMMAND
UNLOCK_COMMAND
LOCK_CONFIRMED
UNLOCK_CONFIRMED
LOCK_TIMEOUT
GEOFENCE_BREACH
GEOFENCE_RETURN
UNAUTHORIZED_ACCESS
DEVICE_ONLINE
DEVICE_OFFLINE
TAG_ALIAS_ADDED
TAG_ALIAS_UPDATED
TAG_ALIAS_DELETED
USER_LOGIN
USER_LOGOUT
PASSWORD_RESET
DEVICE_PAIRED
DEVICE_UNPAIRED
```

**`metadata` JSONB example for ITEM_MISSING:**
```json
{ "epc": "E2004700...000A", "alias": "MacBook Pro", "last_rssi": -54 }
```

**Retention:** Rows older than 90 days deleted by cron job.

---

### 3.12 `geofence_configs`

Stores the user's geofence configuration for their device.

```sql
CREATE TABLE geofence_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id       UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  is_enabled      BOOLEAN NOT NULL DEFAULT FALSE,
  center_lat      DOUBLE PRECISION NOT NULL,
  center_lng      DOUBLE PRECISION NOT NULL,
  radius_meters   INT NOT NULL DEFAULT 100
                  CHECK (radius_meters IN (50, 100, 200, 500)),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, device_id)
);

CREATE INDEX idx_geofence_configs_device_id ON geofence_configs(device_id);
```

---

## 4. Entity Relationships

```
users
 ├── has one   → devices (via users.device_id)
 ├── has many  → user_sessions
 ├── has many  → user_device_tokens
 ├── has many  → notifications
 ├── has many  → notification_preferences
 ├── has many  → activity_logs
 └── has one   → geofence_configs (via device)

devices
 ├── belongs to  → users (owner)
 ├── has many    → rfid_tags
 ├── has many    → tag_readings
 ├── has many    → gps_locations
 ├── has many    → lock_events
 └── has one     → geofence_configs
```

---

## 5. Normalization Decisions

- **`devices.last_known_lat/lng`** — Denormalized from `gps_locations`. Avoids a slow `ORDER BY recorded_at DESC LIMIT 1` query on every live location request. Updated on every MQTT GPS message.
- **`devices.lock_state`** — Denormalized from `lock_events`. Avoids querying lock history for current state.
- **`devices.is_online`** — Denormalized heartbeat status for fast reads.
- All other data is normalized (3NF).

---

## 6. Role and Permission Model

v1 has a single role: **Owner** (the user who paired the device). No separate roles/permissions table needed. All authorization checks are: "Is this user the owner of this device?"

Authorization pattern used in API middleware:
```
Request → Validate JWT → Get user → Get user.device_id → Verify device belongs to user → Proceed
```

v2 roles (for documentation purposes, not implemented in v1):
- `owner` — full control
- `guest` — read-only
- `family` — read + alerts

---

## 7. Seed Data Assumptions

On first system setup, the following seed data is loaded:

1. **Devices:** Pre-register device codes for all physical hardware units manufactured.
   ```sql
   INSERT INTO devices (device_code, firmware_version) VALUES
   ('SBP-A1B2C3D4E5F6', '1.0.0'),
   ('SBP-B2C3D4E5F6A7', '1.0.0');
   ```

2. **Notification preferences:** Auto-seeded for each new user in the registration service:
   ```
   ITEM_MISSING → enabled
   GEOFENCE_BREACH → enabled
   UNAUTHORIZED_ACCESS → enabled
   LOCK_STATE_CHANGE → enabled
   DEVICE_OFFLINE → enabled
   DEVICE_ONLINE → disabled
   ```

---

## 8. Migration Strategy

- All schema changes managed via **Prisma Migrate**.
- Never edit the database manually; always generate a migration file.
- Migration files are committed to version control in `prisma/migrations/`.
- Deployment pipeline runs `npx prisma migrate deploy` before starting the server.
- Destructive migrations (drop column, change type) must go through a multi-step migration:
  1. Add new column (nullable)
  2. Backfill data
  3. Add NOT NULL constraint
  4. Drop old column (separate migration)
- Production database backups taken before any migration.

---

## 9. Prisma Schema (Abbreviated)

```prisma
// schema.prisma (abbreviated — full schema in /prisma/schema.prisma)

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                   String    @id @default(uuid())
  fullName             String    @map("full_name") @db.VarChar(100)
  email                String    @unique @db.VarChar(255)
  passwordHash         String    @map("password_hash") @db.VarChar(255)
  deviceId             String?   @map("device_id")
  failedLoginAttempts  Int       @default(0) @map("failed_login_attempts")
  lockedUntil          DateTime? @map("locked_until")
  lastLoginAt          DateTime? @map("last_login_at")
  quietHoursEnabled    Boolean   @default(false) @map("quiet_hours_enabled")
  quietHoursStart      String?   @map("quiet_hours_start")
  quietHoursEnd        String?   @map("quiet_hours_end")
  deletedAt            DateTime? @map("deleted_at")
  createdAt            DateTime  @default(now()) @map("created_at")
  updatedAt            DateTime  @updatedAt @map("updated_at")

  device               Device?   @relation(fields: [deviceId], references: [id])
  sessions             UserSession[]
  deviceTokens         UserDeviceToken[]
  notifications        Notification[]
  notificationPrefs    NotificationPreference[]
  activityLogs         ActivityLog[]

  @@map("users")
}

model Device {
  id               String    @id @default(uuid())
  deviceCode       String    @unique @map("device_code") @db.VarChar(20)
  ownerUserId      String?   @map("owner_user_id")
  deviceName       String    @default("My Smart Bag-Pack") @map("device_name") @db.VarChar(100)
  isOnline         Boolean   @default(false) @map("is_online")
  lastHeartbeatAt  DateTime? @map("last_heartbeat_at")
  firmwareVersion  String?   @map("firmware_version") @db.VarChar(20)
  geofenceState    String    @default("INSIDE") @map("geofence_state")
  lockState        String    @default("LOCKED") @map("lock_state")
  lastKnownLat     Float?    @map("last_known_lat")
  lastKnownLng     Float?    @map("last_known_lng")
  lastLocationAt   DateTime? @map("last_location_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  owner            User?     @relation(fields: [ownerUserId], references: [id])
  rfidTags         RfidTag[]
  tagReadings      TagReading[]
  gpsLocations     GpsLocation[]
  lockEvents       LockEvent[]
  geofenceConfig   GeofenceConfig?

  @@map("devices")
}
```
