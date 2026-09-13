// Firebase app bootstrap.
//
// Only `apiKey` + `authDomain` + `projectId` are required for Auth and
// Firestore, which is what this account-management app actually uses.
// Analytics and App Check are optional extras — each is only
// initialized when its own env vars are present, so the app still
// runs (and Auth still works) if you haven't set those up yet.
import { initializeApp } from "firebase/app";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasCoreConfig = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId
);

if (!hasCoreConfig && env.DEV) {
  console.warn(
    "[firebase] VITE_FIREBASE_API_KEY / _AUTH_DOMAIN / _PROJECT_ID are not " +
      "set. Copy .env.example to .env.local and fill in your Firebase " +
      "project's web app config (Firebase Console -> Project settings -> " +
      "General -> Your apps). Auth and Firestore calls will fail until " +
      "then."
  );
}

export const app = initializeApp(firebaseConfig);

// --- Analytics (optional) ---------------------------------------------
// Skipped entirely when no measurementId is set, and also skipped on
// unsupported environments (SSR, some browsers) since getAnalytics()
// throws in those cases.
export let analytics = null;
if (firebaseConfig.measurementId) {
  import("firebase/analytics")
    .then(async ({ getAnalytics, isSupported }) => {
      if (await isSupported()) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics is non-critical — never let it block the app.
    });
}

// --- App Check (optional) ----------------------------------------------
// Skipped entirely when no reCAPTCHA site key is set. In local dev with
// a site key configured, Firebase falls back to a debug token (logged to
// the console on first run) since App Check can't get a real attestation
// from localhost.
export let appCheck = null;
if (env.VITE_RECAPTCHA_SITE_KEY) {
  if (env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  import("firebase/app-check").then(({ initializeAppCheck, ReCaptchaV3Provider }) => {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(env.VITE_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  });
}
