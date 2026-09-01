import admin from "firebase-admin";

import { envConfig } from "./environmentConfig.ts";
import logger from "./loggerConfig.ts";

let firebaseApp: admin.app.App | null = null;

const normalizePrivateKey = (raw: string): string =>
  raw.replace(/\\n/g, "\n").trim();

const isValidPrivateKeyPem = (key: string): boolean =>
  key.includes("BEGIN PRIVATE KEY") && key.includes("END PRIVATE KEY");

const initializeFirebase = (): admin.app.App | null => {
  if (firebaseApp) return firebaseApp;

  const { FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID } =
    envConfig;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    logger.warning(
      "Firebase credentials not configured. Push notifications will be disabled.",
    );
    return null;
  }

  const privateKey = normalizePrivateKey(FIREBASE_PRIVATE_KEY);
  if (!isValidPrivateKeyPem(privateKey)) {
    logger.error(
      "FIREBASE_PRIVATE_KEY is invalid. Paste the full private_key value from the Firebase service account JSON (including BEGIN/END PRIVATE KEY lines).",
    );
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
        projectId: FIREBASE_PROJECT_ID,
      }),
    });
  } catch (error) {
    logger.error("Failed to initialize Firebase Admin SDK.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }

  return firebaseApp;
};

export const getFirebaseAuth = (): admin.auth.Auth | null => {
  const app = initializeFirebase();
  if (!app) return null;
  return admin.auth(app);
};

export const getFirebaseMessaging = (): admin.messaging.Messaging | null => {
  const app = initializeFirebase();
  if (!app) return null;
  return admin.messaging(app);
};

export default initializeFirebase;
