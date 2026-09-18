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

async function initializeUserDefaults() {
  const defaultAdminUid = process.env.DEFAULT_ADMIN_UID;
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL?.trim().toLowerCase();
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const claims = user.customClaims || {};
      const isDefaultAdmin = (defaultAdminUid && user.uid === defaultAdminUid)
        || (defaultAdminEmail && user.email?.toLowerCase() === defaultAdminEmail);
      const nextClaims = { ...claims };
      let changed = false;
      if (!["free", "pro", "business"].includes(nextClaims.subscription)) {
        nextClaims.subscription = "free";
        changed = true;
      }
      if (isDefaultAdmin && (nextClaims.admin !== true || nextClaims.role !== "admin")) {
        nextClaims.admin = true;
        nextClaims.role = "admin";
        changed = true;
      }
      if (changed) await auth.setCustomUserClaims(user.uid, nextClaims);
    }
    pageToken = page.pageToken;
  } while (pageToken);
}

initializeUserDefaults().catch((error) => console.error("Failed to initialize user defaults.", error));
