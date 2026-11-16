import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (typeof window !== "undefined") {
  throw new Error("Firebase Admin SDK cannot run in the browser.");
}

function privateKey() {
  const key = process.env.FIREBASE_PRIVATE_KEY;
  if (!key) return null;
  return key.includes("\\n") ? key.replace(/\\n/g, "\n") : key;
}

function serviceAccountReady() {
  const email = process.env.FIREBASE_CLIENT_EMAIL ?? "";
  const key = privateKey();
  return (
    Boolean(process.env.FIREBASE_PROJECT_ID) &&
    email.length > 0 &&
    !email.includes("xxxxx") &&
    Boolean(key?.includes("BEGIN PRIVATE KEY"))
  );
}

export function isAdminConfigured() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST) || serviceAccountReady();
}

export function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]!;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is missing.");
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    return initializeApp({ projectId });
  }
  if (!serviceAccountReady()) {
    throw new Error(
      "Firebase Admin is not configured. Set a real FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or FIRESTORE_EMULATOR_HOST.",
    );
  }
  return initializeApp({
    credential: cert({
      projectId,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: privateKey()!,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

export function getAdminFirestore() {
  return getFirestore(getAdminApp());
}

export function getAdminStorage() {
  return getStorage(getAdminApp());
}
