import { auth, db } from "../firebase.js";
import { verifyOAuthAccessToken } from "./resource.js";
import { send } from "../lib/http.js";
export async function userInfo(req, res) {
  const t = await verifyOAuthAccessToken(req),
    u = await auth.getUser(t.uid),
    s = new Set(t.scope || []),
    b = { sub: u.uid };
  if (s.has("profile")) {
    b.name = u.displayName || undefined;
    b.picture = u.photoURL || undefined;
  }
  if (s.has("email")) {
    b.email = u.email || undefined;
    b.email_verified = !!u.emailVerified;
  }
  const p = await db.collection("users").doc(u.uid).get();
  if (p.exists && s.has("profile")) {
    const x = p.data();
    if (x.locale) b.locale = x.locale;
    if (x.timezone) b.zoneinfo = x.timezone;
  }
  return send(res, 200, b);
}
