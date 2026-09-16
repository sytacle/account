import { auth, db } from "../firebase.js";
import { verifyOAuthAccessToken } from "./resource.js";
import { send } from "../lib/http.js";

export async function userInfo(req, res) {
  const t = await verifyOAuthAccessToken(req);

  const u = await auth.getUser(t.uid);

  // OAuth scope can be:
  // "openid profile email account phone"
  // or an array depending on your token implementation.
  const rawScope = t.scope ?? t.scopes;

  const scopes = Array.isArray(rawScope)
    ? rawScope
    : typeof rawScope === "string"
      ? rawScope.trim().split(/\s+/).filter(Boolean)
      : [];

  const s = new Set(scopes);

  const b = {
    sub: u.uid,
  };

  /*
   * PROFILE
   */
  if (s.has("profile")) {
    if (u.displayName) {
      b.name = u.displayName;
    }

    if (u.photoURL) {
      b.picture = u.photoURL;
    }
  }

  /*
   * EMAIL
   */
  if (s.has("email")) {
    if (u.email) {
      b.email = u.email;
    }

    b.email_verified = !!u.emailVerified;
  }

  /*
   * PHONE
   */
  if (s.has("phone")) {
    if (u.phoneNumber) {
      b.phone = u.phoneNumber;
    }

    b.phone_verified = u.customClaims?.phoneVerified === true;
  }

  /*
   * ACCOUNT
   */
  if (s.has("account")) {
    b.admin = u.customClaims?.admin === true;
    b.role = u.customClaims?.role || "user";
    b.subscription = u.customClaims?.subscription || "free";
  }

  /*
   * FIRESTORE PROFILE
   */
  if (s.has("profile")) {
    const p = await db.collection("users").doc(u.uid).get();

    if (p.exists) {
      const x = p.data() || {};

      if (x.locale) {
        b.locale = x.locale;
      }

      if (x.zoneinfo || x.timezone) {
        b.zoneinfo = x.zoneinfo || x.timezone;
      }
      if (x.location) {
        b.location = x.location;
      }
    }
  }

  return send(res, 200, b);
}
