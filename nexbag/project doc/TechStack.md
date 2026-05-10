# TechStack.md — Technology Stack
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## Stack Summary

| Layer | Technology |
|---|---|
| Mobile App | React Native 0.73+ (Expo Bare Workflow) |
| Backend API | Node.js + Express.js |
| IoT Broker | Mosquitto MQTT Broker |
| Real-time Push to App | WebSocket (ws library via Express) |
| Database | PostgreSQL 15 |
| ORM | Prisma |
| Authentication | JWT (access + refresh tokens) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Maps | React Native Maps (Google Maps provider) |
| Reverse Geocoding | Google Maps Geocoding API |
| App State Management | Zustand |
| API Client | Axios + React Query |
| Validation | Zod (backend) + Yup (frontend forms) |
| Testing — Backend | Jest + Supertest |
| Testing — Frontend | Jest + React Native Testing Library |
| Deployment — Backend | Railway (or Render) |
| Deployment — DB | Railway PostgreSQL (managed) |
| CI/CD | GitHub Actions |
| Logging | Winston (backend) |
| Error Tracking | Sentry (both React Native and Node.js) |
| Environment Config | dotenv + cross-env |

---

## 1. Mobile Frontend

### React Native 0.73+ (Expo Bare Workflow)

**Why React Native:**
- Single codebase targets both Android and iOS — critical for a student team with limited platform-specific expertise.
- Large ecosystem of packages for maps, WebSocket, push notifications, RFID/BLE (future), and camera (QR scanning).
- JavaScript/TypeScript — shared language knowledge with the backend team.
- Expo Bare Workflow gives the convenience of Expo tooling without the limitations of managed workflow: allows native modules (needed for FCM, background tasks, camera).

**Why Expo Bare (not managed):**
- Managed Expo cannot use `react-native-firebase` which is required for FCM.
- Bare allows `expo-camera` for QR scanning and native background location if needed.
- Still benefits from Expo's build tooling (`eas build`).

**Alternative considered:** Flutter — rejected because team has TypeScript/JavaScript background. React Native aligns better with the existing skill set and reduces context switching with the backend.

**Key packages:**

| Package | Purpose |
|---|---|
| `react-navigation` v6 | Screen navigation (stack + bottom tabs) |
| `react-native-maps` | Google Maps integration |
| `@react-native-firebase/messaging` | FCM push notifications |
| `@react-native-firebase/app` | Firebase core |
| `react-native-camera` / `expo-camera` | QR code scanning for device pairing |
| `@react-native-async-storage/async-storage` | Encrypted local storage for tokens |
| `react-native-encrypted-storage` | Secure token storage (Keychain / Keystore) |
| `socket.io-client` | WebSocket connection to backend |
| `react-query` (TanStack Query) | Data fetching, caching, background refetch |
| `zustand` | Global app state |
| `axios` | HTTP API client |
| `yup` | Form validation schemas |
| `react-native-paper` | UI component base |
| `lottie-react-native` | Animations (onboarding, success states) |
| `react-native-vector-icons` | Icon library (MaterialCommunityIcons) |
| `react-hook-form` | Form state management |
| `date-fns` | Date formatting and manipulation |
| `react-native-toast-message` | Non-blocking toast notifications |

**TypeScript:** Used throughout. Strict mode enabled.

---

## 2. Backend

### Node.js + Express.js

**Why Node.js + Express:**
- Team has JavaScript experience — zero context switching from frontend.
- Excellent support for WebSocket (ws / socket.io), MQTT (mqtt.js), and async I/O — all critical for this IoT system.
- Large ecosystem for JWT, bcrypt, Prisma, Zod, and all required middleware.
- Fast to prototype, easy to structure cleanly with modular routes and controllers.

**Alternative considered:** Python + FastAPI — rejected because team is more comfortable with JavaScript and React Native shares the language. Node.js also handles concurrent WebSocket connections more naturally.

**Key packages:**

| Package | Purpose |
|---|---|
| `express` | HTTP server framework |
| `ws` | WebSocket server (native, lightweight) |
| `mqtt` | MQTT client (subscribe to broker) |
| `prisma` | Database ORM + migration tool |
| `@prisma/client` | Generated type-safe DB client |
| `jsonwebtoken` | JWT signing and verification |
| `bcryptjs` | Password hashing |
| `zod` | Request validation schemas |
| `firebase-admin` | FCM push notifications from backend |
| `cors` | Cross-origin resource sharing |
| `helmet` | Security HTTP headers |
| `express-rate-limit` | Rate limiting middleware |
| `winston` | Structured logging |
| `dotenv` | Environment variable loading |
| `nodemailer` | Email sending (password reset OTPs) |
| `node-cron` | Scheduled jobs (data cleanup, geofence check) |
| `uuid` | UUID generation |

---

## 3. IoT Communication Layer

### MQTT — Mosquitto Broker

**Why MQTT:**
- Lightweight publish/subscribe protocol designed for IoT devices with constrained resources.
- Raspberry Pi (hardware) publishes sensor data to MQTT topics.
- Backend subscribes to device topics and processes incoming messages.
- QoS levels ensure delivery guarantees for critical messages (lock commands).
- Industry standard for IoT — directly matches the existing App Backend Report's architecture.

**Broker:** Eclipse Mosquitto (self-hosted on the same server as backend in v1, or on the Raspberry Pi for local demo).

**Topic Structure:**
```
smartbag/{deviceId}/rfid/tags          ← RFID scan data (Pi → Backend)
smartbag/{deviceId}/gps/location       ← GPS coordinates (Pi → Backend)
smartbag/{deviceId}/lock/status        ← Lock state (Pi → Backend)
smartbag/{deviceId}/lock/command       ← Lock/unlock command (Backend → Pi)
smartbag/{deviceId}/heartbeat          ← Device heartbeat (Pi → Backend)
smartbag/{deviceId}/alert/breach       ← Unauthorized opening (Pi → Backend)
```

**QoS Levels:**
- RFID / GPS updates: QoS 0 (fire and forget — high frequency, loss acceptable)
- Lock commands: QoS 1 (at-least-once — acknowledgment required)
- Heartbeat: QoS 0

---

## 4. Real-Time to Mobile App

### WebSocket (ws library)

**Why WebSocket (not MQTT directly to mobile):**
- MQTT on mobile requires a separate MQTT library and broker connection, adding complexity.
- WebSocket is simpler for a REST + WS hybrid architecture.
- Backend acts as the bridge: MQTT (Pi → Backend) → WebSocket (Backend → App).
- Allows the backend to filter, enrich, and format data before sending to the mobile client.
- Single WebSocket connection per authenticated user session.

**Authentication:** WebSocket handshake includes JWT in the `Authorization` header (or query param for mobile compatibility).

**Alternative considered:** Socket.io — rejected in favor of raw `ws` to reduce bundle size and complexity. If reconnection logic becomes complex, Socket.io can be adopted in v2.

---

## 5. Database

### PostgreSQL 15

**Why PostgreSQL:**
- Full ACID compliance — critical for accurate event logging and lock command tracking.
- Rich data types: JSONB for flexible MQTT payload storage, timestamps with timezone.
- Excellent support with Prisma ORM.
- Free and well-supported on Railway and Render for deployment.
- Easily handles the expected data volume for a student project (< 100k rows in v1).

**Why not MongoDB:**
- Relational data model is more appropriate here (users → devices → tags → events has clear relationships).
- PostgreSQL's strong typing and constraints prevent data integrity bugs.

### Prisma ORM

**Why Prisma:**
- Type-safe database queries — no raw SQL mistakes.
- Schema-first: `schema.prisma` is the single source of truth for the DB.
- Auto-generated migrations — easy to evolve schema.
- Excellent TypeScript integration with full autocomplete.
- Prisma Studio for visual DB inspection during development.

**Alternative considered:** Sequelize — rejected because Prisma has better TypeScript support and a cleaner API.

---

## 6. Authentication

### JWT (JSON Web Tokens)

**Access Token:** Short-lived (15 minutes). Sent in `Authorization: Bearer <token>` header on every API request.

**Refresh Token:** Longer-lived (7 or 30 days). Stored in `user_sessions` table. Used to issue new access tokens silently. Rotated on each use.

**Why JWT over sessions:** Stateless access tokens allow the backend to scale horizontally without shared session storage. Refresh tokens are stateful (stored in DB) to allow invalidation on logout/password reset.

**Storage on mobile:** Access token in Zustand memory (not persisted). Refresh token in `react-native-encrypted-storage` (uses Android Keystore / iOS Keychain).

---

## 7. Push Notifications

### Firebase Cloud Messaging (FCM)

**Why FCM:**
- Free, reliable, and works on both Android and iOS.
- Delivers notifications even when the app is killed.
- Supports notification priority levels and data-only messages.
- `@react-native-firebase/messaging` integrates cleanly with React Native.
- Backend uses `firebase-admin` SDK to send notifications server-side.

**Alternative considered:** Expo Notifications — rejected because it wraps FCM but abstracts too much control; direct FCM integration via react-native-firebase gives more control over notification behavior.

---

## 8. Maps

### React Native Maps (Google Maps provider)

**Why:** Industry standard for React Native mapping. Google Maps provides geocoding, reverse geocoding, and reliable tile rendering. Familiar to users.

**APIs used:**
- Google Maps SDK for Android/iOS (map rendering)
- Google Geocoding API (reverse geocode GPS coordinates to addresses)
- Both require a Google Maps API key restricted to the app's package name

**Alternative considered:** Mapbox — better for custom styling but requires more setup and paid tier for production use. Google Maps is sufficient for v1.

---

## 9. Validation

### Zod (Backend)
- Validates all incoming request bodies, query params, and headers.
- Used in middleware before reaching controllers.
- Provides typed, inferred TypeScript types from schema definitions.

### Yup (Frontend)
- Validates form inputs with `react-hook-form + yup` resolver.
- Schema defined once, used for both inline errors and submit prevention.

---

## 10. Testing

### Backend: Jest + Supertest
- Jest for unit testing services and utility functions.
- Supertest for integration testing API endpoints (uses an in-memory test DB or test schema).
- Coverage target: > 60% for service layer.

### Frontend: Jest + React Native Testing Library
- RNTL for component tests (renders component, simulates user interactions).
- Jest for utility/hook unit tests.
- Coverage target: > 50% for screens and hooks.

---

## 11. Deployment

### Backend: Railway
**Why Railway:**
- Simple git-based deployments — `git push` triggers deploy.
- Managed PostgreSQL included — no separate DB setup.
- Free tier sufficient for demo and portfolio.
- Environment variables managed via Railway dashboard.
- Supports WebSocket connections (unlike serverless providers).

**Alternative:** Render — nearly identical feature set; either works. Railway preferred for simplicity.

**Why not serverless (Vercel/Netlify functions):** Serverless functions cannot maintain persistent WebSocket connections or MQTT subscriptions — fundamentally incompatible with this architecture.

### Mobile App: EAS Build (Expo Application Services)
- Build Android APK/AAB and iOS IPA from CI.
- Free tier available for student projects.
- OTA updates possible for JS bundle changes (non-native changes).

### MQTT Broker: Raspberry Pi (local) / DigitalOcean Droplet (production)
- For demo: Mosquitto runs on Raspberry Pi itself.
- For production: Mosquitto on a $6/month DigitalOcean droplet.

---

## 12. Monitoring and Logging

### Winston (Backend Logging)
- Log levels: error, warn, info, debug.
- Structured JSON logs in production.
- Console transport in development, file transport in production.

### Sentry (Error Tracking)
- `@sentry/react-native` on mobile: captures JS exceptions, ANRs, performance traces.
- `@sentry/node` on backend: captures unhandled exceptions and performance.
- Free tier supports the volume expected for a student project.

### GitHub Actions (CI/CD)
- On every push to `main`: run linter + tests.
- On tag push (`v*`): trigger EAS build for mobile, deploy backend to Railway.

---

## 13. Trade-Off Summary

| Decision | Chosen | Alternative | Reason for Choice |
|---|---|---|---|
| Mobile | React Native | Flutter | JS familiarity, shared ecosystem |
| Backend | Node.js + Express | Python FastAPI | JS everywhere, MQTT support |
| ORM | Prisma | Sequelize, TypeORM | TypeScript, DX, migrations |
| Real-time (app) | WebSocket | Socket.io | Simpler, lighter for v1 |
| IoT Protocol | MQTT | HTTP polling | Industry standard, low-overhead |
| DB | PostgreSQL | MongoDB | Relational model, ACID |
| Notifications | FCM | Expo Notifications | More control, direct integration |
| Auth | JWT | Session cookies | Stateless, mobile-friendly |
| Deployment | Railway | AWS/GCP | Zero-config, free tier, student-friendly |
| Maps | Google Maps | Mapbox | Reliability, free quota, ecosystem |

---

## Implemented / Code Notes

- The codebase implements the stack described above. Key locations:
	- Backend: `backend/package.json`, source at `backend/src/` (Express, Prisma, mqtt, ws, firebase-admin).
	- Mobile: `mobile/package.json`, source at `mobile/src/` (React Native, Zustand, react-native-maps, @react-native-firebase).
	- Prisma schema: `backend/prisma/schema.prisma` and seed: `backend/prisma/seed.ts`.
- CI: GitHub Actions workflow exists under `.github/workflows/` to run backend tests and deployment steps.

Notes:
- If you want I can extract exact package versions from `backend/package.json` and `mobile/package.json` and add them to this doc.
