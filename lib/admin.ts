import { initializeApp, getApps, getApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const APP_NAME = "hr-system-admin";

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    if (raw.trim().startsWith("{")) {
      return JSON.parse(raw) as ServiceAccount;
    }
    return JSON.parse(Buffer.from(raw, "base64").toString("utf-8")) as ServiceAccount;
  } catch {
    return null;
  }
}

const sa = parseServiceAccount();

if (sa && !getApps().some((a) => a.name === APP_NAME)) {
  initializeApp({ credential: cert(sa) }, APP_NAME);
}

const app = sa && getApps().length ? getApp(APP_NAME) : null;

export const adminAuth: Auth | null = app ? getAuth(app) : null;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const isAdminReady = Boolean(app);
