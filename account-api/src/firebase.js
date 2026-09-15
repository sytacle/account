import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";

function createCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  // Useful for local development with GOOGLE_APPLICATION_CREDENTIALS or
  // other Google Application Default Credentials.
  return undefined;
}

if (!getApps().length) {
  const credential = createCredential();
  initializeApp(credential ? { credential } : undefined);
}

export const auth = getAuth();
export const db = getFirestore();
export { Timestamp, FieldValue };
