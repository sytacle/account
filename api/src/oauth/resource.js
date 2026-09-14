import { db } from "../firebase.js";
import { sha256 } from "../lib/crypto.js";
import { ApiError } from "../lib/errors.js";

export async function verifyOAuthAccessToken(req) {
  const h = req.get("authorization") || "";
  
  if (!/^Bearer\s+/i.test(h))
    throw new ApiError("unauthenticated", "Bearer access token required.", 401);
  
  const s = await db
    .collection("oauthAccessTokens")
    .doc(sha256(h.replace(/^Bearer\s+/i, "")))
    .get();
  
  if (!s.exists)
    throw new ApiError("unauthenticated", "Invalid access token.", 401);
  
  const t = s.data();
  if (t.revoked || t.expiresAt.toMillis() <= Date.now())
    throw new ApiError(
      "unauthenticated",
      "Expired or revoked access token.",
      401,
    );
  
  if (t.familyId) {
    const f = await db.collection("oauthRefreshFamilies").doc(t.familyId).get();
    if (f.exists && f.data().revoked)
      throw new ApiError("unauthenticated", "Token family revoked.", 401);
  }
  
  return t;
}
