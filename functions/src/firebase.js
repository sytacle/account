import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
if (!getApps().length) initializeApp();
export const auth = getAuth();
export const db = getFirestore();
export { Timestamp, FieldValue };
