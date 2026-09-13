import { auth } from "../firebase.js";
const subs = new Set(["free", "pro", "business"]);
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
export async function setSubscription(uid, v) {
  if (!subs.has(v)) throw new Error("Invalid subscription.");
  return setUserClaims(uid, { subscription: v });
}
export const setPhoneVerified = (uid, v) =>
  setUserClaims(uid, { phoneVerified: !!v });
