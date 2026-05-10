# Security.md — Security Specifications
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. Threat Model

The Smart Bag-Pack system has the following attack surfaces:

| Surface | Threat Actors | Risk |
|---|---|---|
| REST API | Unauthenticated internet users | Medium |
| WebSocket endpoint | Unauthorized clients | Medium |
| MQTT broker | Rogue IoT devices or spoofed publishers | High |
| Mobile app | Reverse engineering, token theft | Medium |
| Database | SQL injection, direct DB access | High |
| Push notifications | Spoofed FCM sends | Low |
| JWT tokens | Token theft, replay attacks | High |
| Lock command endpoint | Replay attacks to lock/unlock bag | High |
| Device pairing | Brute-force device code guessing | Medium |

---

## 2. Authentication Strategy

### JWT-Based Authentication

- **Access Token:** Signed HS256 JWT, TTL 15 minutes. Contains: `{ sub: userId, email, deviceId, iat, exp }`.
- **Refresh Token:** Random 64-byte secure token (crypto.randomBytes(64).toString('hex')). Hashed with SHA-256 before storing in DB. The raw token is sent to client; only the hash is stored.
- **Secret:** `JWT_SECRET` must be minimum 256 bits of entropy. Never committed to source control.
- **Rotation:** Each refresh token use invalidates the old token and issues a new one (refresh token rotation). If a refresh token is used twice, it indicates a replay attack — invalidate all sessions for the user.
- **Account lockout:** 5 failed login attempts → account locked for 15 minutes.

### What Goes in the JWT

```json
{
  "sub": "a1b2c3d4-...",
  "email": "arjun@example.com",
  "device_id": "d4e5f6a7-...",
  "iat": 1705312800,
  "exp": 1705313700
}
```

Do **not** include: password hash, sensitive PII, role data (look up fresh from DB if needed for RBAC), or any data that changes frequently.

---

## 3. Authorization Strategy

### Device Ownership Check (RBAC v1)

Every device-related API endpoint verifies:
1. JWT is valid (via `auth.middleware`)
2. `req.user.deviceId` is not null (user has a paired device)
3. If route has a `deviceId` param: it must match `req.user.deviceId`
4. The device exists in the DB and has `owner_user_id === req.user.id`

This check is enforced in `device-owner.middleware.ts` and applied to all RFID, GPS, lock, and device routes.

### Principle of Least Privilege

- User tokens only grant access to their own data. There are no admin-scoped tokens in v1.
- The backend process connects to PostgreSQL with a user that has SELECT/INSERT/UPDATE/DELETE on application tables only — no DROP, no pg_catalog access.
- Firebase Admin SDK is initialized only on the backend (service account key). Never exposed to mobile app.

---

## 4. Password Hashing

- Algorithm: **bcrypt** with cost factor **12**.
- Library: `bcryptjs` (pure JavaScript, no native bindings required for Railway deployment).
- Rule: Never log passwords. Never store plaintext passwords. Never store intermediate hash states.
- Password comparison uses `bcrypt.compare()` which is constant-time (prevents timing attacks).
- Minimum password requirements:
  - 8 characters minimum
  - At least 1 uppercase letter
  - At least 1 digit
  - At least 1 special character (`!@#$%^&*()_+-=`)
  - Maximum 72 characters (bcrypt truncates at 72 bytes)

---

## 5. Token Storage (Mobile)

| Token | Storage Location | Why |
|---|---|---|
| Access token | Zustand in-memory (not persisted) | Short TTL; never written to disk |
| Refresh token | `react-native-encrypted-storage` | Uses Android Keystore / iOS Keychain |
| FCM token | AsyncStorage (non-sensitive) | Not a security token; can be re-fetched |

**Never use:** `AsyncStorage` for access or refresh tokens. It is unencrypted.

---

## 6. Input Validation

All API inputs are validated using **Zod schemas** before reaching controller logic.

Rules:
- Validate **type** (string, number, boolean, uuid)
- Validate **format** (email regex, ISO 8601 date, UUID v4)
- Validate **length** (min/max for strings)
- Validate **range** (min/max for numbers, enum membership)
- Strip unknown fields: `schema.strip()` — never pass unknown fields to DB queries
- Validation runs in `validate.middleware.ts` as a named middleware before controllers

Any validation failure returns **422 Unprocessable Entity** with field-level errors. Never return a 400 with a raw Zod error object — format it first.

---

## 7. SQL Injection Prevention

- All database queries use **Prisma ORM** which uses parameterized queries exclusively.
- No raw SQL strings constructed from user input anywhere in the codebase.
- If a raw query is ever needed (edge case): use `prisma.$queryRaw` with Prisma's tagged template literal syntax (which parameterizes automatically). Never use string concatenation.
- Database user has no DDL privileges — cannot DROP tables even if injection occurred.

---

## 8. XSS Prevention

- This is an API backend (no HTML responses), so traditional XSS is not applicable.
- On the mobile app (React Native): React Native does not have a DOM, so script injection is not possible in the traditional sense.
- Sanitization rule: Any user-supplied string stored in DB (e.g., `alias`, `device_name`, `full_name`) should be trimmed and length-limited at the API level. No HTML rendering of user-supplied content in the app (use `Text` components, not `WebView` with user content).

---

## 9. CSRF Considerations

- REST API uses JWT in the `Authorization` header (not cookies). No cookies → no CSRF vulnerability.
- WebSocket uses JWT in the initial handshake query parameter (not cookies).
- No session cookies used anywhere → CSRF is not a concern for this architecture.

---

## 10. Rate Limiting

Implemented via `express-rate-limit` middleware.

| Endpoint Group | Limit | Window |
|---|---|---|
| POST /auth/login | 10 requests | per 15 minutes per IP |
| POST /auth/register | 5 requests | per hour per IP |
| POST /auth/password/forgot | 5 requests | per hour per IP |
| POST /auth/password/verify-otp | 10 requests | per 15 minutes per IP |
| POST /lock/command | 30 requests | per minute per user |
| All other endpoints | 100 requests | per minute per user |

Rate limit exceeded → **429 Too Many Requests** with `Retry-After` header.

---

## 11. MQTT Security

For v1 (demo scope), MQTT security is minimal but documented for v2 improvement:

**v1 (Demo):**
- Mosquitto broker configured with username/password authentication.
- Username: `smartbag_pi`, Password: strong random string in `.env`.
- TLS not configured for local demo (acceptable for LAN-only demo).
- Broker only accessible from trusted network.

**v2 (Production requirements):**
- TLS (port 8883) for all MQTT connections.
- Per-device client certificates for hardware authentication.
- ACL (Access Control List): each device can only publish to its own topic (`smartbag/{its-deviceId}/#`).
- Backend subscriber has read-only ACL on `smartbag/+/#`.

---

## 12. Lock Command Security

The lock command is a high-security endpoint because it controls physical hardware.

Security measures:
1. **Authentication required:** Valid JWT access token.
2. **Ownership check:** User must own the device they're sending the command to.
3. **Idempotency key:** Client sends a UUID v4 `idempotency_key` with each command. Backend checks if a lock event with this key already exists — if yes, returns the existing result without re-executing. Prevents double-fire from network retries.
4. **Command rate limit:** 30 commands/minute per user (prevents rapid lock/unlock spam that could damage servo).
5. **Device online check:** If device is offline, command is rejected with 503 — not queued. This prevents stale commands from executing when the device comes back online unexpectedly.
6. **Audit log:** Every lock command logged to `lock_events` and `activity_logs` with user ID, timestamp, action, and result.

---

## 13. Environment Variable Handling

All secrets and configuration are managed through environment variables. No hardcoded secrets in source code.

**Required environment variables:**

```bash
# Server
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/smartbag

# JWT
JWT_SECRET=<minimum-64-char-random-string>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=smartbag_pi
MQTT_PASSWORD=<strong-random-password>

# Firebase
FIREBASE_PROJECT_ID=smartbag-app
FIREBASE_PRIVATE_KEY=<from-service-account-json>
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@smartbag-app.iam.gserviceaccount.com

# Email (nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@smartbagpack.app
SMTP_PASS=<app-specific-password>

# Google Maps
GOOGLE_MAPS_API_KEY=<restricted-to-server-use>

# Sentry
SENTRY_DSN=https://...@sentry.io/...
```

**Rules:**
- `.env` is in `.gitignore` — never committed.
- `.env.example` is committed with all keys but no values.
- Railway environment variables configured in dashboard.
- `src/config/env.ts` validates all required env vars on startup using Zod. If any are missing: server refuses to start with a clear error message.

---

## 14. Secrets Management

- Firebase service account JSON: Do not commit the JSON file. Instead, extract individual fields into env vars (`FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`).
- Google Maps API key: Restrict to server-side only (no referrer-based restriction — IP-based restriction instead).
- Mobile app: Google Maps API key for Android is in `AndroidManifest.xml` — restrict it to the app's SHA-1 fingerprint and package name in Google Cloud Console.

---

## 15. Logging and Audit Considerations

**What to log (Winston):**
- All API requests: method, path, response status, response time (NOT request body — may contain passwords).
- All authentication events: login success/fail, logout, token refresh, password reset.
- All lock commands: user ID, action, device ID, result, timestamp.
- All geofence events: breach, return.
- All MQTT messages received (log event type and device ID, not full payload).
- All errors: stack traces in development, sanitized messages in production.

**What NOT to log:**
- Passwords (plaintext or hash).
- JWT tokens.
- Full request bodies on auth endpoints.
- GPS coordinates in debug logs (privacy).
- PII in error messages.

**Log levels:**
- `error` — exceptions, service failures
- `warn` — rate limit hits, auth failures, device offline
- `info` — API requests, MQTT messages, lock commands
- `debug` — verbose internal state (dev only)

---

## 16. File Upload Safety

v1 does not include file uploads. Profile photo upload is out of scope for v1.

If added in v2:
- Validate MIME type server-side (not by file extension).
- Limit file size to 5MB.
- Use a separate S3 bucket or Cloudflare R2 with signed URLs.
- Scan uploaded files with a virus scanner before storage.
- Never serve uploaded files from the same domain as the API.

---

## 17. Common Abuse Cases and Mitigations

| Abuse Case | Mitigation |
|---|---|
| Brute-force login | 5-attempt lockout, rate limit on /auth/login |
| Device code enumeration | Rate limit + format validation on /devices/pair |
| Replay lock commands | Idempotency keys, short command TTL |
| Token theft via network | HTTPS only in production, short access token TTL |
| Refresh token theft | Stored as hash in DB, one-time use rotation, device info logged |
| Spoofed MQTT messages | Broker auth, per-device topics (v2: client certs) |
| Geofence alert spam | State machine (INSIDE/OUTSIDE) prevents re-firing |
| Item missing alert spam | Debounce: tag must be absent for 10+ seconds |
| Account enumeration on forgot password | Generic "If email exists..." response |
| Mass notification spam | Rate limit + preference checks before sending |

---

## 18. Security Implementation Checklist

Before shipping v1, verify the following:

- [ ] `JWT_SECRET` is at least 64 characters, randomly generated.
- [ ] `.env` is in `.gitignore` and never committed.
- [ ] `bcrypt` cost factor is 12 (not 10 or less).
- [ ] All database queries go through Prisma (no string-concatenated SQL).
- [ ] Zod validation applied to every POST/PATCH/PUT request body.
- [ ] Rate limiting applied to auth endpoints.
- [ ] Refresh tokens stored as SHA-256 hashes, not plaintext.
- [ ] Refresh token rotation implemented (old token invalidated on use).
- [ ] `helmet()` middleware applied to Express app.
- [ ] CORS configured to allow only known origins (mobile app deep link + development localhost).
- [ ] Lock command idempotency key enforced.
- [ ] Device ownership checked on every device-related route.
- [ ] FCM tokens deleted from DB on user logout.
- [ ] All env vars validated on server startup.
- [ ] Sensitive data (passwords, tokens) never logged.
- [ ] MQTT broker requires username/password authentication.
- [ ] HTTPS enforced in production (handled by Railway's reverse proxy).
- [ ] Sentry error tracking configured without capturing PII.
- [ ] Access token not persisted to disk on mobile device.
- [ ] Refresh token stored in encrypted storage (Keychain/Keystore) on mobile.

---

## Implemented / Code Notes

- Security features are implemented in the codebase under `backend/src/middleware/` and `backend/src/validators/`:
  - JWT validation: `auth.middleware.ts`
  - Device ownership checks: `device-owner.middleware.ts`
  - Rate limiting: `rate-limit.middleware.ts`
  - Input validation: Zod schemas under `validators/` enforced by `validate.middleware.ts`
  - Helmet and CORS initialized in `backend/src/app.ts`.
- Refresh token storage and rotation are implemented in `user_sessions` logic in `backend/src/services/auth.service.ts` and `backend/src/utils/jwt.utils.ts`.
- Lock command idempotency is enforced in `backend/src/services/lock.service.ts` and recorded in `lock_events` table.

Notes:
- Verify `JWT_SECRET`, `MQTT_*`, and `FIREBASE_*` env vars are set before starting the server; `backend/src/config/env.ts` validates them on startup.
