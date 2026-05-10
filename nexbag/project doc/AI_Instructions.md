# AI_Instructions.md — Instructions for AI Coding Agent
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## Overview

This document is the primary guide for an AI coding agent that will build the Smart Bag-Pack application from the documents in this `/project-docs` folder. Read all 9 other documents before writing a single line of code. Every implementation decision must trace back to a specification in those documents.

---

## 0. Before Writing Any Code

1. Read `PRD.md` completely — understand what is in scope and what is out of scope for v1.
2. Read `Features.md` completely — understand every feature, its acceptance criteria, and MVP vs future labels.
3. Read `Database.md` completely — understand every table and relationship before writing any query.
4. Read `API.md` completely — understand every endpoint, its request/response shape, and error codes.
5. Read `Architecture.md` completely — understand the folder structure. Build it exactly as specified.
6. Read `TechStack.md` — do not introduce packages that are not in the approved list without explicit justification.
7. Read `Security.md` — every security rule must be implemented, not deferred.
8. Read `UIUX.md` — screens must match the specifications. Do not invent UI patterns not described.
9. Read `Deployment.md` — generate `.env.example` files and Docker setup files from the start.

---

## 1. Implementation Order

Build in this exact order. Do not jump ahead. Each phase must be complete and tested before the next begins.

### Phase 1: Project Scaffolding
```
1.1 Create /backend folder with Node.js + TypeScript + Express setup
1.2 Create /mobile folder with React Native + Expo Bare Workflow
1.3 Set up ESLint + Prettier for both projects
1.4 Create docker-compose.yml for local Postgres + Mosquitto
1.5 Create .env.example files for both projects
1.6 Set up Prisma schema with ALL tables defined in Database.md
1.7 Create initial Prisma migration
1.8 Verify: `npx prisma migrate dev` completes without error
1.9 Create seed script for device codes
1.10 Implement GET /health endpoint
1.11 Verify: curl /health returns ok
```

### Phase 2: Authentication (Backend)
```
2.1 Implement UserService: register, login, refresh, logout, forgotPassword, resetPassword
2.2 Implement JWT utilities: sign, verify, hash refresh token
2.3 Implement bcrypt utilities: hash, compare
2.4 Implement OTP utilities: generate 6-digit OTP, store hashed OTP in cache/DB
2.5 Implement Zod validators: auth.validator.ts
2.6 Implement auth routes and controllers
2.7 Implement auth.middleware.ts
2.8 Write integration tests for all auth endpoints
2.9 Verify all auth acceptance criteria from Features.md
```

### Phase 3: Device Management (Backend)
```
3.1 Implement DeviceService: pair, get, update, unpair
3.2 Implement device.routes.ts and device.controller.ts
3.3 Implement device-owner.middleware.ts
3.4 Write integration tests for device endpoints
3.5 Verify device pairing acceptance criteria
```

### Phase 4: MQTT Infrastructure (Backend)
```
4.1 Implement mqtt.client.ts (singleton MQTT connection)
4.2 Implement mqtt.handler.ts (topic router)
4.3 Implement heartbeat.handler.ts (update device online status)
4.4 Implement HeartbeatCheckJob (mark devices offline after 60s no heartbeat)
4.5 Test by publishing a mock heartbeat via mosquitto_pub
```

### Phase 5: WebSocket Infrastructure (Backend)
```
5.1 Implement websocket.server.ts (attach to HTTP server)
5.2 Implement websocket.manager.ts (userId → WebSocket map)
5.3 Implement WebSocketService.broadcast()
5.4 Implement JWT auth on WebSocket handshake
5.5 Implement ping/pong keepalive
5.6 Test: connect with wscat, verify auth rejection on invalid token
```

### Phase 6: RFID System (Backend)
```
6.1 Implement rfid.handler.ts (process MQTT rfid/tags messages)
6.2 Implement RfidService: processTagData, getTagList, getLiveStatus
6.3 Implement item-missing detection with debounce logic
6.4 Implement RFID API routes (GET /rfid/tags, POST, PATCH, DELETE, GET /rfid/live)
6.5 Implement NotificationService: createNotification, sendFcmPush
6.6 Connect RFID missing alert → notification → FCM + WebSocket
6.7 Write unit tests for missing detection logic
6.8 Write integration tests for RFID routes
```

### Phase 7: GPS System (Backend)
```
7.1 Implement gps.handler.ts (process MQTT gps/location messages)
7.2 Implement GpsService: processLocation, getCurrentLocation, getHistory
7.3 Implement haversine.utils.ts (distance calculation)
7.4 Implement GeofenceService: checkBreach, handleBreach, handleReturn
7.5 Implement GPS API routes
7.6 Implement CleanupJob for GPS data older than 30 days
7.7 Write unit tests for haversine calculation
7.8 Write integration tests for GPS routes + geofence logic
```

### Phase 8: Lock System (Backend)
```
8.1 Implement lock.handler.ts (process MQTT lock/status messages)
8.2 Implement LockService: sendCommand, processStatus, getHistory
8.3 Implement idempotency key check
8.4 Implement command timeout logic (10 seconds)
8.5 Implement lock API routes
8.6 Implement UNAUTHORIZED_ACCESS handler
8.7 Write integration tests for lock routes
```

### Phase 9: Notifications + Activity Log (Backend)
```
9.1 Complete NotificationService (preferences check, quiet hours check)
9.2 Implement notification API routes
9.3 Implement ActivityLogService: log, getFiltered
9.4 Implement activity-log API routes
9.5 Implement CleanupJob for notifications + logs older than 90 days
9.6 Write integration tests
```

### Phase 10: Mobile — Scaffolding + Auth
```
10.1 Set up React Navigation (RootNavigator, AuthNavigator, AppNavigator)
10.2 Set up Zustand stores (all stores, with initial state)
10.3 Set up Axios client with interceptors (token refresh logic)
10.4 Set up encrypted storage service
10.5 Build SplashScreen with auth state routing
10.6 Build OnboardingScreen (carousel, skip)
10.7 Build LoginScreen with form validation
10.8 Build RegisterScreen with password strength indicator
10.9 Build ForgotPassword → OTP → NewPassword flow
10.10 Implement useAuth hook
10.11 Test: full registration → login → token refresh → logout cycle
```

### Phase 11: Mobile — Device Pairing
```
11.1 Build PairDeviceScreen (text input + QR scan)
11.2 Integrate expo-camera for QR code scanning
11.3 Connect to POST /devices/pair endpoint
11.4 Navigate to Dashboard on success
```

### Phase 12: Mobile — WebSocket + FCM
```
12.1 Implement WebSocket service singleton (connect on login, disconnect on logout)
12.2 Implement useWebSocket hook (subscribe to events, update Zustand)
12.3 Implement FCM setup (useFCM hook, register token, background handler)
12.4 Implement deep linking from FCM notifications
12.5 Test: receive WebSocket event → Zustand updates → component re-renders
```

### Phase 13: Mobile — Dashboard
```
13.1 Build DashboardScreen layout
13.2 Build LockWidget component (shows state, sends command)
13.3 Build ItemsSummaryWidget (reads from rfid.store)
13.4 Build MiniMapWidget (reads from gps.store)
13.5 Build RecentActivityWidget
13.6 Build AlertBanner component
13.7 Connect all widgets to Zustand stores
```

### Phase 14: Mobile — RFID Screens
```
14.1 Build ItemListScreen with filter chips
14.2 Build ItemCard component with status and RSSI bars
14.3 Build EditItemScreen (bottom sheet)
14.4 Build RegisterTagScreen (guided flow)
14.5 Connect all screens to RFID API endpoints via React Query
```

### Phase 15: Mobile — GPS Screens
```
15.1 Build LiveMapScreen with react-native-maps
15.2 Implement custom bag marker and accuracy circle
15.3 Implement geofence circle overlay
15.4 Build GeofenceSetupScreen (modal with map + radius selector)
15.5 Build LocationHistoryScreen (list + map breadcrumb)
15.6 Connect to GPS API endpoints via React Query
```

### Phase 16: Mobile — Lock Screen
```
16.1 Build LockScreen with animated padlock icon
16.2 Implement lock/unlock confirmation dialog
16.3 Connect to lock API endpoints
16.4 Handle PENDING, SUCCESS, TIMEOUT states
```

### Phase 17: Mobile — Notifications + Settings
```
17.1 Build NotificationCenterScreen with filter chips
17.2 Build NotificationCard component
17.3 Build SettingsScreen hierarchy
17.4 Build ProfileScreen (name edit, change password)
17.5 Build AlertPreferencesScreen (toggles per type)
17.6 Build QuietHoursScreen (time picker)
17.7 Build DeviceSettingsScreen (device name, unpair)
17.8 Connect all to API endpoints via React Query
```

### Phase 18: Polish + Testing
```
18.1 Implement all empty states per UIUX.md specification
18.2 Implement all loading states (skeleton loaders, button spinners)
18.3 Implement all error states (toast, banners, full-screen error)
18.4 Implement offline detection banner
18.5 Write component tests for critical components
18.6 Write hook tests for useAuth, useWebSocket
18.7 Run through all acceptance criteria in Features.md — check each one
18.8 Fix any failing criteria
18.9 Run final security checklist from Security.md
```

---

## 2. Priority Order of Modules

If time is limited, implement in this priority order:

1. **Auth** — nothing works without it
2. **Device pairing** — foundational for all features
3. **MQTT infrastructure** — required for all real-time features
4. **WebSocket infrastructure** — required for live updates
5. **RFID tracking** — primary value proposition
6. **GPS tracking** — secondary value proposition
7. **Smart lock** — tertiary value proposition
8. **Push notifications** — important for user experience
9. **Activity log** — nice to have for demo
10. **Settings screens** — polish

---

## 3. Files to Create First

In this exact order:

```
1. /backend/package.json
2. /backend/tsconfig.json
3. /backend/.env.example
4. /backend/prisma/schema.prisma     ← Full schema, all tables
5. /backend/src/config/env.ts        ← Validate all env vars on startup
6. /backend/src/utils/logger.ts      ← Winston setup
7. /backend/src/utils/response.utils.ts ← Standard response builders
8. /backend/src/app.ts               ← Express app (no server.listen here)
9. /backend/src/server.ts            ← HTTP server + WS + MQTT init
10. /docker-compose.yml
11. /mobile/package.json
12. /mobile/tsconfig.json
13. /mobile/.env.example
14. /mobile/src/constants/colors.ts  ← Design tokens first
15. /mobile/src/app/navigation/types.ts ← Navigation types
```

---

## 4. Code and Modularity Rules

### Single Responsibility
- Each file does one thing. Controllers only call services. Services only call Prisma and other services. Never put DB queries in controllers or routes.
- WebSocket broadcasts happen in services, not in MQTT handlers directly.
- MQTT handlers parse and validate the payload, then call a service method.

### File Naming Conventions
```
backend:
  *.routes.ts       — Express router
  *.controller.ts   — Request handler (thin layer)
  *.service.ts      — Business logic
  *.handler.ts      — MQTT message handler
  *.middleware.ts   — Express middleware
  *.validator.ts    — Zod schemas
  *.utils.ts        — Pure utility functions
  *.types.ts        — TypeScript interfaces/types

mobile:
  *Screen.tsx       — Full screens
  *Widget.tsx       — Dashboard sub-components
  *Card.tsx         — List item components
  use*.ts(x)        — Custom hooks
  *.store.ts        — Zustand stores
  *.api.ts          — Axios API call functions
  *.service.ts      — Singleton services (WebSocket, FCM, Storage)
```

### TypeScript Rules
- `strict: true` in tsconfig for both projects.
- No `any` types. Use `unknown` and narrow with type guards where needed.
- All API response types defined in shared type files.
- All Prisma result types used directly (do not re-declare DB entity types manually).
- All Zod schemas export both the schema and the inferred TypeScript type:
  ```typescript
  export const loginSchema = z.object({ email: z.string().email(), ... });
  export type LoginInput = z.infer<typeof loginSchema>;
  ```

### Async/Await Rules
- All async functions use `async/await`. No `.then().catch()` chains.
- All async Express route handlers are wrapped with a global async error catcher:
  ```typescript
  const asyncHandler = (fn: RequestHandler) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);
  ```
- Never `await` inside a loop. Use `Promise.all()` for parallel async operations.

---

## 5. Error Handling Rules

### Backend
- All service methods throw typed errors (create a custom `AppError` class with `statusCode`, `code`, and `message`).
- The global `error.middleware.ts` catches all thrown errors and formats them using the standard error response format from API.md.
- Never `try/catch` in controllers — let errors propagate to the global handler.
- Use `try/catch` only in: MQTT handlers (log + continue), WebSocket handlers (log + continue), cron jobs (log + continue).
- Log all errors at `error` level with stack trace in development, without stack trace in production.

### Mobile
- All API calls are wrapped in React Query — use `onError` callbacks for user-facing error handling.
- Axios interceptor handles 401 (token refresh) and 429 (show rate limit toast).
- Never show raw error messages from the API to the user — map error codes to user-friendly messages.
- All user-facing errors go through `react-native-toast-message`.
- Network errors (no connection) caught by Axios interceptor → show offline banner.

---

## 6. Validation Rules

### Backend
- Every `POST`, `PUT`, `PATCH` request body goes through a Zod schema in `validate.middleware.ts` before reaching the controller.
- Query parameters are also validated with Zod (type coercion for numbers, enums for filter values).
- Schema validation failure always returns 422 with field-level errors — never let Zod's raw error propagate to the client.
- Strip unknown fields from all request bodies using `.strip()` in Zod schemas.

### Mobile
- Form validation uses `react-hook-form` with Yup resolver.
- Validate on blur (not on every keystroke).
- Show error message below the field that failed.
- Disable submit button when form is invalid or while loading.
- Never trust client-side validation alone — the backend validates everything too.

---

## 7. Testing Rules

### Backend — What to test
- **Unit tests:** All service methods with mocked Prisma client. All utility functions (haversine, JWT, bcrypt, OTP). Geofence state machine logic.
- **Integration tests:** All API endpoints using Supertest + real test database. Test: success path, validation error path, auth error path, not-found path.
- **Do not test:** Express middleware in isolation (test them via integration tests), Prisma queries directly (Prisma is tested by the ORM team).

### Mobile — What to test
- **Component tests:** Render critical components with mock data, verify displayed text and structure. Test: LockWidget renders LOCKED/UNLOCKED correctly. ItemCard renders IN_BAG/MISSING correctly.
- **Hook tests:** useAuth — test login success/failure. useWebSocket — test event dispatch to Zustand.
- **Do not test:** Navigation behavior (fragile, low value). Styles/colors (visual regression is better done manually for now).

### Test file location
- Backend: `tests/unit/` and `tests/integration/` — mirror the `src/` structure.
- Mobile: `src/__tests__/` — co-located with source files is acceptable, but keep tests in `__tests__` subdirectories.

### Test naming convention
```
describe('AuthService', () => {
  describe('login()', () => {
    it('should return tokens on valid credentials', ...)
    it('should throw UNAUTHORIZED on invalid password', ...)
    it('should lock account after 5 failed attempts', ...)
  })
})
```

---

## 8. Environment Variable Rules

- Never hardcode any value that differs between environments (URLs, secrets, API keys, timeouts).
- All env vars loaded via `dotenv` at the entry point (`server.ts`).
- Validated in `src/config/env.ts` using Zod on startup. If any required var is missing: throw an error with a clear message listing the missing variables.
- Mobile env vars loaded via `react-native-dotenv` or `expo-constants`.
- Example:
  ```typescript
  // config/env.ts
  const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(64),
    MQTT_BROKER_URL: z.string().url(),
    FIREBASE_PROJECT_ID: z.string().min(1),
    // ... all required vars
  });
  export const env = envSchema.parse(process.env);
  ```
- Never access `process.env.ANYTHING` directly outside of `config/env.ts`. Import from `env.ts` everywhere else.

---

## 9. Production-Readiness Rules

- **Logging:** Every API request logged (method, path, status, duration). Every MQTT message received logged. All errors logged with context.
- **Health endpoint:** `/health` endpoint always implemented and returns DB + MQTT status.
- **Graceful shutdown:** Handle `SIGTERM` and `SIGINT` signals — close DB connections, MQTT connection, HTTP server before exiting.
- **No console.log in production:** Use Winston logger. If you find a `console.log` in production code, replace it with `logger.debug()` or `logger.info()`.
- **Database connection pool:** Prisma manages this automatically — do not create multiple Prisma client instances. Export a single `prisma` singleton.
- **MQTT reconnect:** Configure the MQTT client with `reconnectPeriod: 5000` so it auto-reconnects on disconnect.
- **WebSocket reconnect on mobile:** Implement reconnect logic in the WebSocket service with exponential backoff (1s, 2s, 4s, max 30s).
- **No blocking operations:** Never use `fs.readFileSync`, `crypto.randomBytesSync`, or any other blocking API in a request handler.

---

## 10. Anti-Over-Engineering Rules

- **Do not build** what is listed as "Out of Scope" in PRD.md — not even as a placeholder or TODO.
- **Do not add** packages not in TechStack.md without writing a comment explaining why.
- **Do not build** generic/abstract base classes before you have 3+ concrete use cases. Build the concrete thing first.
- **Do not implement** a plugin architecture, event bus, or pub/sub within the backend — that adds complexity for no gain at this scale.
- **Do not add** Redis for v1 — in-memory WebSocket manager (a `Map`) is sufficient for a single-server demo.
- **Do not add** background location tracking on mobile — GPS comes from the hardware, not the phone.
- **Do not implement** multi-tenancy, workspace scoping, or role tables — v1 is single user, single bag.
- **Do not add** database connection pooling configuration manually — Prisma handles it.
- **Do not add** GraphQL, tRPC, or any other API layer — REST + WebSocket is specified.
- **If something is not in the specs**, do not build it. If you think something is missing, write a comment `// NOTE: [feature] not specified in PRD — skipping` and move on.

---

## 11. Naming and Folder Structure Rules

- **All files:** kebab-case (`auth.service.ts`, `lock-widget.tsx`).
- **All React components:** PascalCase in file name and export (`LockWidget.tsx`, `export default LockWidget`).
- **All TypeScript interfaces:** Prefix with `I` is optional — prefer plain names (`User`, `Device`, `LockEvent`). Use `type` for union types, `interface` for object shapes.
- **All Zustand stores:** Named as `useXxxStore` (e.g., `useAuthStore`, `useRfidStore`).
- **All React Query keys:** Defined as constants in a `queryKeys.ts` file, not as inline strings.
- **All API functions in mobile:** Suffix with `Api` (e.g., `loginApi`, `pairDeviceApi`, `getLiveRfidApi`).
- **Constants:** `SCREAMING_SNAKE_CASE` for true constants. `camelCase` for configurable values from env.
- **Database:** All Prisma model names are PascalCase singular (`User`, `Device`, `GpsLocation`). All table names in `@@map()` are snake_case plural (`users`, `devices`, `gps_locations`).

---

## 12. Definition of Done Checklist

A feature is **done** when ALL of the following are true:

### Code
- [ ] Implementation matches the spec in Features.md
- [ ] All acceptance criteria for the feature pass
- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] No ESLint warnings or errors
- [ ] No `console.log` statements in production code paths
- [ ] No hardcoded secrets or environment-specific values

### Backend
- [ ] Route is protected by `auth.middleware` (if required)
- [ ] Request body is validated by a Zod schema
- [ ] Response uses the standard response format from API.md
- [ ] Errors throw an `AppError` that the global handler formats correctly
- [ ] Activity log entry written for user-facing state changes
- [ ] Unit test exists for the service method
- [ ] Integration test exists for the route (success path + at least one error path)

### Mobile
- [ ] Screen matches the spec in UIUX.md
- [ ] Loading state implemented (skeleton or spinner)
- [ ] Empty state implemented
- [ ] Error state implemented (toast or banner)
- [ ] Form has inline validation with error messages
- [ ] Component is accessible (accessibilityLabel on all interactive elements)
- [ ] Deep link from FCM notification navigates to this screen (if applicable)

### Integration
- [ ] Feature works end-to-end with real MQTT messages from hardware (or MQTT mock)
- [ ] WebSocket events update the UI in real time
- [ ] FCM push notification delivered and tappable

### Documentation
- [ ] `.env.example` updated if new env vars were added
- [ ] Any deviation from the spec is commented in code explaining why

---

## 13. Key Constants to Keep Consistent Across Codebase

These values are defined in the specs — use exactly these values everywhere:

| Constant | Value | Source |
|---|---|---|
| Access token TTL | 15 minutes | Security.md |
| Refresh token TTL | 7 days / 30 days (remember me) | Security.md |
| Device heartbeat timeout | 60 seconds | Features.md DEV-02 |
| RFID missing debounce | 10 seconds not seen | Features.md RFID-03 |
| RFID missing window | 60 seconds (recently present) | Features.md RFID-03 |
| GPS update interval | 10 seconds | Features.md GPS-01 |
| GPS data retention | 30 days | Features.md |
| Notification data retention | 90 days | Features.md |
| Activity log retention | 90 days | Features.md |
| Lock command timeout | 10 seconds | Features.md LOCK-01 |
| Max failed login attempts | 5 | Security.md |
| Account lockout duration | 15 minutes | Security.md |
| bcrypt cost factor | 12 | Security.md |
| Geofence radius options | 50, 100, 200, 500 (meters) | Features.md GPS-02 |
| Notifications per page | 20 | Features.md NOTIF-02 |
| Activity log per page | 25 | Features.md LOG-01 |
| Max item alias length | 50 characters | Features.md RFID-02 |
| Device code length | 12 alphanumeric + hyphens | Features.md DEV-01 |
