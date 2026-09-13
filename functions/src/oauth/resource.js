import { db } from "../firebase.js";
import { sha256 } from "../lib/crypto.js";
import { HttpsError } from "firebase-functions/v2/https";
export async function verifyOAuthAccessToken(req) {
  const h = req.get("authorization") || "";
  if (!/^Bearer\s+/i.test(h))
    throw new HttpsError("unauthenticated", "Bearer access token required.");
  const s = await db
    .collection("oauthAccessTokens")
    .doc(sha256(h.replace(/^Bearer\s+/i, "")))
    .get();
  if (!s.exists)
    throw new HttpsError("unauthenticated", "Invalid access token.");
  const t = s.data();
  if (t.revoked || t.expiresAt.toMillis() <= Date.now())
    throw new HttpsError("unauthenticated", "Expired or revoked access token.");
  if (t.familyId) {
    const f = await db.collection("oauthRefreshFamilies").doc(t.familyId).get();
    if (f.exists && f.data().revoked)
      throw new HttpsError("unauthenticated", "Token family revoked.");
  }
  return t;
}
