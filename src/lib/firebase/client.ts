import { type FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

type WebConfig = {
  apiKey: string;
  authDomain?: string;
  databaseURL?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
};

function webConfig(): WebConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId,
  };
}

export function isFirebaseWebConfigured() {
  return webConfig() !== null;
}

export function getFirebaseApp(): FirebaseApp {
  const config = webConfig();
  if (!config) {
    throw new Error("Firebase web config is incomplete.");
  }
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

export function getClientFirestore() {
  return getFirestore(getFirebaseApp());
}

export function getClientAuth() {
  return getAuth(getFirebaseApp());
}

export function getClientStorage() {
  return getStorage(getFirebaseApp());
}
