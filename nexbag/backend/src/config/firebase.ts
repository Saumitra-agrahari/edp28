import * as admin from 'firebase-admin';
import { env } from './env';
import { logger } from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export function initFirebase(): void {
  // Skip Firebase init in dev if credentials not configured (lenient dev mode)
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_PRIVATE_KEY || !env.FIREBASE_CLIENT_EMAIL) {
    logger.warn('Firebase credentials not configured — FCM push notifications disabled (dev mode)');
    return;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID,
        privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    logger.info('Firebase Admin SDK initialized');
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin SDK', { err });
  }
}

export function getMessaging(): admin.messaging.Messaging | null {
  if (!firebaseApp) return null;
  return admin.messaging(firebaseApp);
}

export function isFirebaseReady(): boolean {
  return firebaseApp !== null;
}
