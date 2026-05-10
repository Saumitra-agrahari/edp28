# Deployment.md — Deployment Guide
# Smart Bag-Pack: IoT-Based Intelligent Backpack System

---

## 1. Local Development Setup

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20 LTS | Backend runtime |
| npm | 10+ | Package manager |
| PostgreSQL | 15 | Database (local or Docker) |
| Mosquitto | 2.0+ | Local MQTT broker |
| Android Studio | Latest | Android emulator |
| Xcode | 15+ | iOS simulator (macOS only) |
| Git | 2.40+ | Version control |
| Docker (optional) | 24+ | Run Postgres + Mosquitto locally |

### Step-by-Step Local Setup

#### 1. Clone the repository
```bash
git clone https://github.com/your-org/smart-bagpack.git
cd smart-bagpack
```

#### 2. Start local infrastructure (Docker recommended)
```bash
# docker-compose.yml at project root
docker-compose up -d

# This starts:
# - PostgreSQL 15 on port 5432
# - Mosquitto MQTT broker on port 1883
```

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: smartbag
      POSTGRES_PASSWORD: devpassword
      POSTGRES_DB: smartbag_dev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

  mosquitto:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf

volumes:
  pgdata:
```

`mosquitto.conf`:
```
listener 1883
allow_anonymous true
```

#### 3. Backend setup
```bash
cd backend
cp .env.example .env
# Fill in .env values (see Environment Variables section)
npm install
npx prisma migrate dev --name init
npx prisma db seed     # Seeds device codes
npm run dev            # Starts on port 3000 with ts-node-dev
```

#### 4. Mobile app setup
```bash
cd mobile
cp .env.example .env
# Fill in BACKEND_URL, GOOGLE_MAPS_KEY
npm install
npx pod-install        # iOS only
```

**Android:**
```bash
npx react-native run-android
```

**iOS:**
```bash
npx react-native run-ios
```

#### 5. Verify setup
```bash
# Health check
curl http://localhost:3000/v1/health
# Expected: { "status": "ok", "database": "connected", "mqtt": "connected" }
```

---

## 2. Environment Variables

### Backend `.env`

```bash
# ── Application ────────────────────────────
NODE_ENV=development
PORT=3000

# ── Database ────────────────────────────────
DATABASE_URL=postgresql://smartbag:devpassword@localhost:5432/smartbag_dev

# ── JWT ─────────────────────────────────────
JWT_SECRET=your-minimum-64-character-random-string-here-generate-with-openssl
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_REFRESH_EXPIRY_LONG=30d

# ── MQTT ────────────────────────────────────
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
MQTT_CLIENT_ID=smartbag-backend

# ── Firebase ────────────────────────────────
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com

# ── Email ───────────────────────────────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-app-specific-password
EMAIL_FROM="Smart Bag-Pack <noreply@yourdomain.com>"

# ── Google Maps ─────────────────────────────
GOOGLE_MAPS_API_KEY=AIza...

# ── Sentry ──────────────────────────────────
SENTRY_DSN=https://...@sentry.io/...

# ── Cleanup Jobs ────────────────────────────
GPS_RETENTION_DAYS=30
NOTIFICATION_RETENTION_DAYS=90
LOG_RETENTION_DAYS=90
SESSION_CLEANUP_INTERVAL_HOURS=24

# ── Security ────────────────────────────────
CORS_ORIGINS=http://localhost:8081,smartbag://

# ── Device Heartbeat ────────────────────────
HEARTBEAT_TIMEOUT_SECONDS=60
```

### Mobile `.env`

```bash
BACKEND_URL=http://10.0.2.2:3000/v1    # Android emulator → localhost
BACKEND_WS_URL=ws://10.0.2.2:3000
GOOGLE_MAPS_API_KEY=AIza...
SENTRY_DSN=https://...@sentry.io/...
```

> For iOS simulator: use `http://localhost:3000/v1`
> For physical device: use your machine's LAN IP: `http://192.168.1.x:3000/v1`

---

## 3. Database Setup Steps

```bash
# Create database (if not using Docker)
psql -U postgres -c "CREATE DATABASE smartbag_dev;"
psql -U postgres -c "CREATE USER smartbag WITH PASSWORD 'devpassword';"
psql -U postgres -c "GRANT ALL ON DATABASE smartbag_dev TO smartbag;"

# Run all migrations
cd backend
npx prisma migrate dev

# Verify schema
npx prisma studio   # Opens visual DB browser at localhost:5555

# Seed initial device codes
npx prisma db seed
```

**Prisma seed file** (`prisma/seed.ts`):
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Pre-register hardware device codes
  const devices = ['SBP-A1B2C3D4E5F6', 'SBP-B2C3D4E5F6A7'];
  for (const code of devices) {
    await prisma.device.upsert({
      where: { deviceCode: code },
      update: {},
      create: { deviceCode: code, firmwareVersion: '1.0.0' },
    });
  }
  console.log('Seed complete.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

---

## 4. Migration Steps

### Development
```bash
# Create a new migration after schema change
npx prisma migrate dev --name add_quiet_hours_to_users

# This: generates SQL, applies to dev DB, regenerates Prisma client
```

### Production
```bash
# Apply pending migrations (run automatically in CI/CD before deploy)
npx prisma migrate deploy

# Never run `migrate dev` in production — use `migrate deploy`
```

### Rollback strategy
Prisma does not support automatic rollback. To roll back:
1. Write a new migration that reverses the change.
2. Apply it via `npx prisma migrate deploy`.
3. Never manually edit the migrations folder.

---

## 5. Deployment Architecture

```
Internet
  │
  ├── Mobile App (APK / IPA — distributed to test devices via EAS)
  │
  └── Railway (Backend + DB)
       ├── Node.js Express Service (auto-deploy on git push to main)
       │    ├── REST API (port 3000)
       │    ├── WebSocket Server (same port, /ws path)
       │    └── MQTT subscriber client (connects to broker)
       │
       ├── PostgreSQL 15 (Railway managed DB)
       │
       └── Mosquitto MQTT Broker
            (Option A: same Railway service, process 2)
            (Option B: DigitalOcean $6/mo droplet)
            (Option C: Raspberry Pi local broker for demo)
```

---

## 6. Backend Deployment (Railway)

### First-time setup

1. Create a [Railway](https://railway.app) account.
2. Create new project → Deploy from GitHub repo → Select `backend/` as root.
3. Railway auto-detects Node.js via `package.json`.
4. Add PostgreSQL plugin → Railway provisions managed DB and sets `DATABASE_URL` automatically.
5. Add all other env vars in Railway's Variables tab.
6. Set `npm run start` as the start command:

```json
// package.json
"scripts": {
  "build": "tsc",
  "start": "node dist/server.js",
  "dev": "ts-node-dev --respawn src/server.ts",
  "migrate": "prisma migrate deploy",
  "postinstall": "prisma generate"
}
```

7. Railway will run: `npm install → npm run build → npm start`.
8. Pre-start migration: add a Release Command in Railway settings: `npx prisma migrate deploy`.

### `Procfile` (alternative):
```
web: npx prisma migrate deploy && node dist/server.js
```

### Health check endpoint

```typescript
// GET /health — no auth required
app.get('/health', async (req, res) => {
  const dbOk = await checkDatabaseConnection();
  const mqttOk = mqttClient.connected;
  res.json({
    status: dbOk && mqttOk ? 'ok' : 'degraded',
    database: dbOk ? 'connected' : 'disconnected',
    mqtt: mqttOk ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

---

## 7. Mobile App Deployment (EAS Build)

### Setup

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### `eas.json`:
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "aab" },
      "ios": { "simulator": false }
    }
  }
}
```

### Build commands:
```bash
# Build Android APK for internal distribution/demo
eas build --platform android --profile preview

# Build iOS (requires Apple Developer account)
eas build --platform ios --profile preview
```

### Android APK Distribution
For the student demo, share the APK directly via:
- QR code link from EAS dashboard
- Download link sent to team members

---

## 8. CI/CD Pipeline (GitHub Actions)

### `.github/workflows/backend.yml`:

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: smartbag
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: smartbag_test
        ports: ["5432:5432"]

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Install dependencies
        run: cd backend && npm ci
        
---

## Implemented / Code Notes

- The repository includes the following deployable components and scripts:
  - `backend/` — Node.js + TypeScript service. Use `npm run dev` for local dev and `npm run build && npm start` for production (see `backend/package.json`).
  - `mobile/` — React Native app using Expo/EAS. Use `eas build` for native builds as documented.
  - `docker-compose.yml` at repository root spins up Postgres and Mosquitto for local testing.
- Prisma migrations and seed scripts live under `backend/prisma/`.
- Health check endpoint implemented at `GET /v1/health` (`backend/src/routes/index.ts`).

Quick local commands (backend):
```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

      - name: Run migrations
        run: cd backend && npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://smartbag:testpassword@localhost:5432/smartbag_test

      - name: Run tests
        run: cd backend && npm test
        env:
          DATABASE_URL: postgresql://smartbag:testpassword@localhost:5432/smartbag_test
          JWT_SECRET: test-jwt-secret-minimum-64-chars-long-for-ci-testing-only
          NODE_ENV: test

      - name: Build TypeScript
        run: cd backend && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - name: Deploy to Railway
        run: |
          curl -X POST "${{ secrets.RAILWAY_DEPLOY_WEBHOOK }}"
```

### `.github/workflows/mobile.yml`:

```yaml
name: Mobile CI

on:
  push:
    branches: [main]

jobs:
  lint-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: mobile/package-lock.json

      - run: cd mobile && npm ci
      - run: cd mobile && npm run lint
      - run: cd mobile && npm test -- --coverage
```

---

## 9. Production Configuration

```bash
# Production-specific settings (Railway env vars)
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGINS=smartbag://    # Mobile app deep link scheme only

# Rate limits (stricter in production)
RATE_LIMIT_AUTH_MAX=10
RATE_LIMIT_AUTH_WINDOW=900000   # 15 minutes in ms

# Production MQTT (external broker)
MQTT_BROKER_URL=mqtt://your-broker-ip:1883
MQTT_USERNAME=smartbag_backend
MQTT_PASSWORD=<strong-production-password>
```

---

## 10. Monitoring and Error Tracking

### Sentry Setup

**Backend:**
```typescript
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of transactions
});
```

**Mobile:**
```typescript
import * as Sentry from '@sentry/react-native';
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
});
```

### Railway Metrics
- Railway dashboard shows: CPU, memory, request count, response times.
- Set up Railway's built-in alerting for service down events.

### Winston Log Output (Production)
```json
{
  "level": "info",
  "message": "POST /v1/lock/command 200 145ms",
  "userId": "a1b2c3d4-...",
  "requestId": "req-uuid",
  "timestamp": "2024-01-15T08:30:00.000Z"
}
```

---

## 11. Backup and Recovery

### Database Backups
- Railway's PostgreSQL includes daily automated backups (7-day retention on free tier).
- Before any migration: manually trigger a backup via Railway dashboard.
- For additional safety: use `pg_dump` in a weekly cron script:

```bash
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

### MQTT Broker
- Mosquitto has no persistent state that needs backing up (in v1 — no retained messages).
- Configuration file (`mosquitto.conf`) is stored in version control.

### Recovery Steps
1. If DB corrupted: restore from Railway backup via dashboard.
2. If migration failed: apply rollback migration, restore from pre-migration backup.
3. If backend service crashed: Railway auto-restarts. Check Sentry for root cause.

---

## 12. Rollback Strategy

### Backend Rollback
```bash
# Railway keeps last 5 deploys; rollback via dashboard "Redeploy" on previous build
# Or via Git:
git revert HEAD
git push origin main  # Triggers new deploy
```

### Mobile App Rollback
- Mobile apps cannot be force-updated on users' devices.
- If a critical bug in a released build: push a hotfix build via EAS immediately.
- EAS OTA updates can push JS bundle fixes without a full App Store release.

---

## 13. Post-Deployment Verification Checklist

Run these checks after every deployment to production:

**API Health:**
- [ ] `GET /health` returns `{ status: "ok", database: "connected", mqtt: "connected" }`
- [ ] `POST /auth/login` works with test credentials → returns JWT tokens
- [ ] `GET /devices/me` returns device data for paired test account

**WebSocket:**
- [ ] WebSocket connection established with valid JWT (use wscat or Postman WS)
- [ ] `ping` event receives `pong` response

**RFID:**
- [ ] Publish test MQTT message to `smartbag/{deviceId}/rfid/tags`
- [ ] Verify app receives `rfid.update` WebSocket event

**GPS:**
- [ ] Publish test MQTT message to `smartbag/{deviceId}/gps/location`
- [ ] Verify app map updates

**Lock:**
- [ ] `POST /lock/command` with valid auth → returns 200 with PENDING status

**Notifications:**
- [ ] Trigger a test FCM push → verify delivery on test device

**Database:**
- [ ] Verify latest migration is applied: `npx prisma migrate status`

**Monitoring:**
- [ ] Sentry receiving events (trigger a test error, verify in Sentry dashboard)
- [ ] Railway service metrics show normal CPU and memory
