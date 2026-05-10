# Architecture.md — System Architecture
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         HARDWARE LAYER                               │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ UHF RFID     │  │  GPS Module  │  │Servo Lock  │  │  ESP32   │ │
│  │ Reader       │  │  (NEO-6M)    │  │ + Sensor   │  │(WiFi MCU)│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └────┬─────┘ │
│         │                 │                 │               │       │
│         └──────────────┬──┴─────────────────┘               │       │
│                        │           Raspberry Pi 4            │       │
│                   ┌────┴────────────────────────────────┐    │       │
│                   │   App Backend (C# / Python)          │    │       │
│                   │   SWNetApi/SWComApi SDK              │    │       │
│                   │   TagRegistry, LiveDisplay            │    │       │
│                   │   WebSocket → Mobile (legacy)        │    │       │
│                   │   MQTT Publisher → Broker            │◄───┘       │
│                   └────────────┬────────────────────────┘            │
└────────────────────────────────│─────────────────────────────────────┘
                                 │ MQTT (publish sensor data)
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                     BACKEND LAYER                                   │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                 Node.js + Express Server                     │  │
│  │                                                             │  │
│  │  ┌──────────────┐   ┌──────────────┐   ┌───────────────┐  │  │
│  │  │  REST API    │   │  MQTT Client │   │  WebSocket    │  │  │
│  │  │  (Express    │   │  Subscriber  │   │  Server (ws)  │  │  │
│  │  │   Router)    │   │  (mqtt.js)   │   │               │  │  │
│  │  └──────┬───────┘   └──────┬───────┘   └───────┬───────┘  │  │
│  │         │                  │                    │           │  │
│  │         └──────────────────┼────────────────────┘           │  │
│  │                            │                                │  │
│  │                    ┌───────┴────────┐                       │  │
│  │                    │  Service Layer │                       │  │
│  │                    │  (Business     │                       │  │
│  │                    │   Logic)       │                       │  │
│  │                    └───────┬────────┘                       │  │
│  │                            │                                │  │
│  │              ┌─────────────┼─────────────┐                 │  │
│  │              │             │             │                  │  │
│  │         ┌────┴────┐  ┌────┴────┐  ┌────┴────┐            │  │
│  │         │ Prisma  │  │Firebase │  │ Mosquitto│            │  │
│  │         │  ORM    │  │  Admin  │  │ MQTT     │            │  │
│  │         └────┬────┘  └────┬────┘  └─────────┘            │  │
│  └──────────────│─────────────│────────────────────────────────┘  │
└─────────────────│─────────────│────────────────────────────────────┘
                  │             │
         ┌────────┘             └─────────┐
         ▼                               ▼
┌──────────────────┐           ┌──────────────────┐
│   PostgreSQL 15  │           │  Firebase FCM    │
│   (Railway DB)   │           │  (Push Notifs)   │
└──────────────────┘           └──────────────────┘
                                         │
                                         ▼
┌────────────────────────────────────────────────────────────────────┐
│                     MOBILE CLIENT LAYER                             │
│                                                                    │
│   React Native App (iOS + Android)                                 │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │  React Navigation │ Zustand │ React Query │ socket.io-client│ │
│   │  react-native-maps│ FCM    │ Axios       │ AsyncStorage     │ │
│   └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Data Flow

### RFID Data Flow
```
RFID Reader
  → SDK (SWNetApi/SWComApi)
  → RfidReader class (Raspberry Pi C#/Python app)
  → TagRegistry.ParseBuffer()
  → MQTT Publish: smartbag/{deviceId}/rfid/tags (JSON payload)
  → Mosquitto Broker
  → Node.js MQTT Subscriber (mqtt.js)
  → RfidService.processTagData()
    → Upsert tag_readings table (Prisma)
    → Check for missing items (compare with rfid_tags)
    → If item missing: NotificationService.sendAlert()
      → Insert into notifications table
      → Check notification_preferences
      → FCM push via firebase-admin
    → WebSocketService.broadcast(userId, 'rfid.update', itemList)
  → Mobile App WebSocket receives 'rfid.update'
  → Zustand store updated
  → React component re-renders item list
```

### GPS Data Flow
```
GPS Module (NEO-6M)
  → UART to Raspberry Pi
  → NMEA parsing
  → MQTT Publish: smartbag/{deviceId}/gps/location
  → Node.js MQTT Subscriber
  → GpsService.processLocation()
    → Insert into gps_locations table
    → Update devices.last_known_lat/lng (cache)
    → Check geofence (haversine distance calculation)
      → If breach: GeofenceService.handleBreach()
        → Update devices.geofence_state = 'OUTSIDE'
        → Log to activity_logs
        → Send FCM push + WebSocket alert
    → WebSocketService.broadcast(userId, 'gps.update', coords)
  → Mobile App updates map marker position
```

### Lock Command Flow
```
User taps "Lock" in app
  → React component dispatches API call
  → POST /v1/lock/command { action: 'LOCK', idempotency_key: 'uuid' }
  → Express route → LockController.sendCommand()
  → LockService.sendLockCommand()
    → Check device is online (devices.is_online)
    → Insert lock_events record (status: PENDING)
    → MQTT Publish: smartbag/{deviceId}/lock/command { action: 'LOCK', command_id }
    → Return 200 with command_id and status PENDING
  → Hardware firmware receives MQTT command
    → Servo executes lock action
    → MQTT Publish: smartbag/{deviceId}/lock/status { state: 'LOCKED', command_id }
  → Node.js MQTT Subscriber receives lock/status
  → LockService.processLockStatus()
    → Update lock_events record (status: SUCCESS)
    → Update devices.lock_state = 'LOCKED'
    → Log to activity_logs
    → WebSocket broadcast: 'lock.status' event
    → WebSocket broadcast: 'lock.command_ack' event (with command_id)
  → Mobile App receives both events
  → UI updates: padlock animates to locked state
```

---

## 3. Backend Folder Structure

```
/backend
├── src/
│   ├── app.ts                    # Express app setup (no listen)
│   ├── server.ts                 # HTTP server + WebSocket init + MQTT init
│   │
│   ├── config/
│   │   ├── env.ts                # Env var validation and export
│   │   ├── firebase.ts           # Firebase Admin SDK init
│   │   └── mqtt.ts               # MQTT client config and init
│   │
│   ├── routes/
│   │   ├── index.ts              # Mount all route modules
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── device.routes.ts
│   │   ├── rfid.routes.ts
│   │   ├── gps.routes.ts
│   │   ├── lock.routes.ts
│   │   ├── notification.routes.ts
│   │   └── activity-log.routes.ts
│   │
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── device.controller.ts
│   │   ├── rfid.controller.ts
│   │   ├── gps.controller.ts
│   │   ├── lock.controller.ts
│   │   ├── notification.controller.ts
│   │   └── activity-log.controller.ts
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── device.service.ts
│   │   ├── rfid.service.ts
│   │   ├── gps.service.ts
│   │   ├── lock.service.ts
│   │   ├── geofence.service.ts
│   │   ├── notification.service.ts
│   │   ├── activity-log.service.ts
│   │   ├── websocket.service.ts
│   │   └── email.service.ts
│   │
│   ├── mqtt/
│   │   ├── mqtt.client.ts        # MQTT connection singleton
│   │   ├── mqtt.handler.ts       # Route incoming MQTT messages to services
│   │   ├── handlers/
│   │   │   ├── rfid.handler.ts
│   │   │   ├── gps.handler.ts
│   │   │   ├── lock.handler.ts
│   │   │   └── heartbeat.handler.ts
│   │   └── topics.ts             # Topic string constants
│   │
│   ├── websocket/
│   │   ├── websocket.server.ts   # ws server setup + auth
│   │   ├── websocket.manager.ts  # Track connected clients by userId
│   │   └── events.ts             # Event name constants
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT verification
│   │   ├── device-owner.middleware.ts  # Verify user owns device
│   │   ├── validate.middleware.ts # Zod schema validation
│   │   ├── rate-limit.middleware.ts
│   │   └── error.middleware.ts   # Global error handler
│   │
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── device.validator.ts
│   │   ├── rfid.validator.ts
│   │   ├── gps.validator.ts
│   │   ├── lock.validator.ts
│   │   └── notification.validator.ts
│   │
│   ├── jobs/
│   │   ├── cleanup.job.ts        # Delete old GPS/notification/session records
│   │   └── heartbeat-check.job.ts # Mark stale devices as offline
│   │
│   ├── utils/
│   │   ├── jwt.utils.ts
│   │   ├── bcrypt.utils.ts
│   │   ├── haversine.utils.ts    # Geofence distance calculation
│   │   ├── otp.utils.ts
│   │   ├── response.utils.ts     # Standard success/error response builders
│   │   └── logger.ts             # Winston logger instance
│   │
│   └── types/
│       ├── express.d.ts          # Extend Express Request with user/device
│       ├── mqtt.types.ts
│       └── websocket.types.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   └── utils/
│   └── integration/
│       └── routes/
│
├── .env.example
├── package.json
├── tsconfig.json
└── jest.config.ts
```

---

## 4. Mobile App Folder Structure

```
/mobile
├── src/
│   ├── app/
│   │   ├── App.tsx               # Root component
│   │   └── navigation/
│   │       ├── RootNavigator.tsx  # Auth vs App vs Pairing split
│   │       ├── AuthNavigator.tsx  # Login, Register, Forgot
│   │       ├── AppNavigator.tsx   # Bottom tabs
│   │       └── types.ts           # Navigation type definitions
│   │
│   ├── screens/
│   │   ├── onboarding/
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── OnboardingScreen.tsx
│   │   │   ├── LoginScreen.tsx
│   │   │   ├── RegisterScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── pairing/
│   │   │   └── PairDeviceScreen.tsx
│   │   ├── dashboard/
│   │   │   └── DashboardScreen.tsx
│   │   ├── rfid/
│   │   │   ├── ItemListScreen.tsx
│   │   │   ├── EditItemScreen.tsx
│   │   │   └── RegisterTagScreen.tsx
│   │   ├── gps/
│   │   │   ├── LiveMapScreen.tsx
│   │   │   ├── GeofenceSetupScreen.tsx
│   │   │   └── LocationHistoryScreen.tsx
│   │   ├── lock/
│   │   │   └── LockScreen.tsx
│   │   ├── notifications/
│   │   │   └── NotificationCenterScreen.tsx
│   │   └── settings/
│   │       ├── SettingsScreen.tsx
│   │       ├── ProfileScreen.tsx
│   │       ├── ChangePasswordScreen.tsx
│   │       ├── AlertPreferencesScreen.tsx
│   │       ├── QuietHoursScreen.tsx
│   │       └── DeviceSettingsScreen.tsx
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── PrimaryButton.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── PasswordInput.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── LoadingOverlay.tsx
│   │   │   ├── AlertBanner.tsx
│   │   │   ├── ConfirmDialog.tsx
│   │   │   └── DeviceStatusDot.tsx
│   │   ├── dashboard/
│   │   │   ├── LockWidget.tsx
│   │   │   ├── ItemsSummaryWidget.tsx
│   │   │   ├── MiniMapWidget.tsx
│   │   │   └── RecentActivityWidget.tsx
│   │   ├── rfid/
│   │   │   ├── ItemCard.tsx
│   │   │   ├── RSSIBars.tsx
│   │   │   └── IconPicker.tsx
│   │   └── notifications/
│   │       └── NotificationCard.tsx
│   │
│   ├── store/
│   │   ├── index.ts              # Root Zustand store
│   │   ├── auth.store.ts         # User, tokens
│   │   ├── device.store.ts       # Device status, lock state
│   │   ├── rfid.store.ts         # Live item list
│   │   ├── gps.store.ts          # Current location
│   │   └── notification.store.ts # Unread count
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDevice.ts
│   │   ├── useWebSocket.ts       # WebSocket connection + event handling
│   │   ├── useFCM.ts             # FCM setup + background handler
│   │   ├── useRFID.ts
│   │   └── useGPS.ts
│   │
│   ├── api/
│   │   ├── client.ts             # Axios instance + interceptors
│   │   ├── auth.api.ts
│   │   ├── device.api.ts
│   │   ├── rfid.api.ts
│   │   ├── gps.api.ts
│   │   ├── lock.api.ts
│   │   └── notification.api.ts
│   │
│   ├── services/
│   │   ├── storage.service.ts    # Encrypted token storage wrappers
│   │   ├── websocket.service.ts  # WebSocket singleton
│   │   └── fcm.service.ts        # FCM token management
│   │
│   ├── constants/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── icons.ts
│   │   └── routes.ts
│   │
│   └── utils/
│       ├── date.utils.ts
│       ├── validation.utils.ts
│       └── geofence.utils.ts
│
├── android/
├── ios/
├── .env.example
├── app.json
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## 5. Request Lifecycle (REST API)

```
HTTP Request
  → Express middleware stack:
      1. helmet() (security headers)
      2. cors() (CORS config)
      3. express.json() (body parser)
      4. rateLimiter (per-IP or per-user limits)
      5. auth.middleware (JWT validation → req.user)
      6. device-owner.middleware (device ownership → req.device)
      7. validate.middleware (Zod schema check → 422 if fails)
  → Route handler (Controller)
      → Service method (business logic)
          → Prisma query (DB)
          → Side effects (MQTT publish, FCM, WebSocket)
      → Format response with response.utils
  → Express error middleware (catches thrown errors → formats error response)
  → HTTP Response

---

## Implemented / Code Notes

The repository implements the architecture described above. Key implemented components (source paths):

- Backend: `backend/src/` — Express REST API (`app.ts`), WebSocket server (`websocket/websocket.server.ts`), MQTT client/handlers (`mqtt/`), services and controllers (`services/`, `controllers/`).
- ORM: Prisma (`backend/prisma/schema.prisma`) used as described; Prisma client is generated and migrations/seeds are present.
- MQTT Broker: Mosquitto is used in development (`mosquitto.conf`) and MQTT topics/handlers live under `backend/src/mqtt/handlers`.
- Mobile Client: React Native app under `mobile/src/` with screens, hooks, and services matching the architecture.
- Jobs: Scheduled jobs implemented under `backend/src/jobs/` (heartbeat, cleanup) that enforce device offline detection and data retention policies.

Notes:
- WebSocket authentication and client management are implemented in `backend/src/websocket/`.
- The backend initializes MQTT, WebSocket and HTTP server together in `backend/src/server.ts`.
```

---

## 6. Auth Flow

```
1. POST /auth/login
   → authService.login(email, password)
   → bcrypt.compare(password, user.password_hash)
   → Generate access token (JWT, 15min, RS256 or HS256)
   → Generate refresh token (random UUID → hash → store in user_sessions)
   → Return both tokens

2. Subsequent requests:
   → Client sends: Authorization: Bearer <access_token>
   → auth.middleware.ts:
       → jwt.verify(token, JWT_SECRET)
       → If valid: attach decoded payload to req.user
       → If expired: return 401 UNAUTHORIZED
       → If invalid: return 401 UNAUTHORIZED

3. Token expiry:
   → Client gets 401
   → Axios interceptor catches 401
   → Calls POST /auth/token/refresh with stored refresh_token
   → If success: store new tokens, retry original request
   → If 401 on refresh: logout user, navigate to Login

4. Logout:
   → Client calls POST /auth/logout with refresh_token
   → Server sets user_sessions.revoked_at = NOW()
   → Client clears all stored tokens
```

---

## 7. RBAC Flow (v1)

v1 is single-role (Owner). The authorization check pattern is:

```
auth.middleware → verifies JWT → populates req.user = { id, email, deviceId }

device-owner.middleware:
  → Extracts deviceId from req.user.deviceId
  → For routes with :deviceId param: also check param matches
  → If user has no device → 403
  → If device exists → attach req.device to request
  → Controller proceeds
```

---

## 8. WebSocket Architecture

```
server.ts:
  → HTTP server created
  → wss = new WebSocketServer({ server })
  → websocket.manager.ts maintains Map<userId, WebSocket>

On connection:
  → Parse JWT from query string
  → If invalid: close(1008)
  → If valid: store socket in manager: clients.set(userId, ws)
  → Subscribe to user's device events

On disconnect:
  → Remove from manager: clients.delete(userId)

WebSocketService.broadcast(userId, event, payload):
  → Lookup ws = clients.get(userId)
  → If ws and ws.readyState === OPEN: ws.send(JSON.stringify({ event, payload, timestamp }))
  → If not connected: no-op (data will come from REST API on next request)
```

---

## 9. MQTT Architecture

```
mqtt.client.ts:
  → Single MQTT client instance (singleton)
  → Connects to broker on server start
  → Subscribes to: smartbag/+/# (all device topics)

mqtt.handler.ts:
  → Receives all MQTT messages
  → Parses topic: smartbag/{deviceId}/{category}/{subcategory}
  → Routes to appropriate handler:
    → rfid/tags → rfid.handler.ts
    → gps/location → gps.handler.ts
    → lock/status → lock.handler.ts
    → heartbeat → heartbeat.handler.ts

Each handler:
  → Calls relevant service method
  → Service updates DB, sends WebSocket events, sends FCM if needed
```

---

## 10. State Management (Mobile)

**Zustand stores** (not Redux — simpler, less boilerplate for this scope):

- `auth.store` — user profile, tokens (access token in memory only)
- `device.store` — device status (is_online, lock_state, last heartbeat)
- `rfid.store` — live item list (updated by WebSocket events)
- `gps.store` — current lat/lng (updated by WebSocket events)
- `notification.store` — unread count (updated on receive + mark-read)

**React Query** handles:
- All server state (API responses, caching, background refetch)
- Data fetching for history screens (location history, activity log, notifications list)
- Cache invalidation after mutations (e.g., after adding tag alias, refetch tag list)

**Rule:** WebSocket events update Zustand (for live data). React Query handles REST API data. Never mix these — Zustand is for real-time IoT state; React Query is for paginated/historical data.

---

## 11. Scalability Considerations

For v1 (demo/portfolio scale), the current architecture is sufficient. For future scale:

- **Horizontal backend scaling:** Stateless REST API can scale behind a load balancer. WebSocket server needs sticky sessions (or move to Redis Pub/Sub for cross-instance WebSocket broadcasting).
- **MQTT broker:** Mosquitto is single-node. For production: use EMQX or AWS IoT Core (managed, horizontally scalable).
- **Database:** PostgreSQL with connection pooling via PgBouncer. Read replicas for analytics queries.
- **GPS data volume:** 8,640 rows/device/day is manageable for 10 devices. For 1000 devices: use TimescaleDB extension or partition `gps_locations` by month.
- **Notifications:** FCM handles batching natively; no changes needed.

---

## 12. Testing Architecture

```
/tests
├── unit/
│   ├── services/
│   │   ├── auth.service.test.ts       # Mock Prisma, test business logic
│   │   ├── geofence.service.test.ts   # Test haversine calculation
│   │   └── notification.service.test.ts
│   └── utils/
│       ├── haversine.utils.test.ts
│       └── jwt.utils.test.ts
│
└── integration/
    ├── auth.routes.test.ts     # Supertest: register, login, refresh
    ├── device.routes.test.ts   # Supertest: pair, get, unpair
    ├── rfid.routes.test.ts
    ├── gps.routes.test.ts
    ├── lock.routes.test.ts
    └── notification.routes.test.ts
```

**Test database:** Separate `smartbag_test` PostgreSQL database. Migrations run before test suite. Tables truncated between tests using `beforeEach`.

**Mobile tests:**
```
/mobile/src/__tests__/
├── components/
│   ├── LockWidget.test.tsx
│   ├── ItemCard.test.tsx
│   └── InputField.test.tsx
├── hooks/
│   ├── useAuth.test.ts
│   └── useWebSocket.test.ts
└── utils/
    └── date.utils.test.ts
```
