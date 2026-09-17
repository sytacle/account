import { auth } from "../firebase.js";
const subs = new Set(["free", "pro", "business"]);
const PLAN_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export async function setUserClaims(uid, patch) {
  const u = await auth.getUser(uid);
  const c = {
    role: "user",
    admin: false,
    subscription: "free",
    phoneVerified: false,
    ...(u.customClaims || {}),
    ...patch,
  };
  await auth.setCustomUserClaims(uid, c);
  return c;
}

export const setAdmin = (uid, v) =>
  setUserClaims(uid, { admin: !!v, role: v ? "admin" : "user" });

export const setDeveloper = (uid, v) =>
  setUserClaims(uid, { role: v ? "developer" : "user" });

export async function setSubscription(uid, v) {
  if (!subs.has(v)) throw new Error("Invalid subscription.");
  return setUserClaims(uid, {
    subscription: v,
    subscriptionStartedAt: new Date().toISOString(),
    subscriptionExpiresAt: new Date(Date.now() + PLAN_PERIOD_MS).toISOString(),
  });
}

export const setPhoneVerified = (uid, v) =>
  setUserClaims(uid, { phoneVerified: !!v });
