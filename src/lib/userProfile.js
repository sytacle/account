// Firestore-backed user profile.
//
// Firebase Auth stores identity (uid, email, displayName, photoURL,
// providers). Everything an account-settings page also needs but Auth
// has no field for — phone, birthday, notification/privacy toggles —
// lives in its own Firestore document at users/{uid}.
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../config/firebase/firestore.js";

export const DEFAULT_NOTIFICATION_PREFS = {
  "Project updates": true,
  Community: true,
  "Product updates": true,
  Marketing: false,
};

export const DEFAULT_PRIVACY_PREFS = {
  "Profile visibility": false,
  "Activity controls": true,
  Personalization: true,
  "Data sharing": false,
};

function profileRef(uid) {
  return doc(db, "users", uid);
}

/**
 * Ensures a users/{uid} document exists, seeding it from the
 * newly-created Firebase Auth user on first sign-in. Safe to call on
 * every sign-in — it's a no-op once the document exists.
 */
export async function ensureUserProfile(user) {
  const ref = profileRef(user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const seeded = {
    displayName: user.displayName || "",
    email: user.email || "",
    phone: user.phoneNumber || "",
    birthday: "",
    notifications: DEFAULT_NOTIFICATION_PREFS,
    privacy: DEFAULT_PRIVACY_PREFS,
    createdAt: serverTimestamp(),
    lastPasswordChangeAt: null,
  };
  await setDoc(ref, seeded);
  return seeded;
}

export function subscribeToUserProfile(uid, onChange) {
  return onSnapshot(profileRef(uid), (snap) => {
    onChange(snap.exists() ? snap.data() : null);
  });
}

export async function updateUserProfileDoc(uid, partial) {
  await setDoc(profileRef(uid), partial, { merge: true });
}
