import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Lenient dev mode: optional Firebase/SMTP/Google keys in development
const isDev = process.env.NODE_ENV !== 'production';

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Database — required always
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL URL'),

  // JWT — required always
  JWT_SECRET: z.string().min(64, 'JWT_SECRET must be at least 64 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  JWT_REFRESH_EXPIRY_LONG: z.string().default('30d'),

  // MQTT — required, defaults work for local Docker
  MQTT_BROKER_URL: z.string().default('mqtt://localhost:1883'),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  MQTT_CLIENT_ID: z.string().default('smartbag-backend'),

  // Firebase — optional in dev, required in production
  FIREBASE_PROJECT_ID: isDev ? z.string().optional() : z.string().min(1),
  FIREBASE_PRIVATE_KEY: isDev ? z.string().optional() : z.string().min(1),
  FIREBASE_CLIENT_EMAIL: isDev ? z.string().optional() : z.string().email(),

  // Email — optional in dev
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587').transform(Number),
  SMTP_SECURE: z.string().default('false').transform((v) => v === 'true'),
  SMTP_USER: isDev ? z.string().optional() : z.string().email(),
  SMTP_PASS: isDev ? z.string().optional() : z.string().min(1),
  EMAIL_FROM: z.string().default('Smart Bag-Pack <noreply@smartbagpack.app>'),

  // Google Maps — optional in dev
  GOOGLE_MAPS_API_KEY: isDev ? z.string().optional() : z.string().min(1),

  // Sentry — optional always
  SENTRY_DSN: z.string().optional(),

  // Data retention
  GPS_RETENTION_DAYS: z.string().default('30').transform(Number),
  NOTIFICATION_RETENTION_DAYS: z.string().default('90').transform(Number),
  LOG_RETENTION_DAYS: z.string().default('90').transform(Number),
  SESSION_CLEANUP_INTERVAL_HOURS: z.string().default('24').transform(Number),

  // Security
  CORS_ORIGINS: z.string().default('http://localhost:8081,smartbag://'),

  // Heartbeat
  HEARTBEAT_TIMEOUT_SECONDS: z.string().default('60').transform(Number),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  const missing = result.error.errors
    .map((e) => `  • ${e.path.join('.')}: ${e.message}`)
    .join('\n');
  throw new Error(`❌ Environment validation failed. Missing or invalid env vars:\n${missing}\n`);
}

export const env = result.data;

export type Env = typeof env;
