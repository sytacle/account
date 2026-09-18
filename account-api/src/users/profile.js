import { db, FieldValue } from "../firebase.js";
import { verifyBearerToken } from "../auth/security.js";
import { requirePasskeyVerification } from "./passkeys.js";
import { send } from "../lib/http.js";

export async function getProfile(req, res) {
  const d = await verifyBearerToken(req),
    s = await db.collection("users").doc(d.uid).get();
  return send(res, 200, {
    uid: d.uid,
    email: d.email || null,
    displayName: d.name || null,
    photoURL: d.picture || null,
    profile: s.exists ? s.data() : {},
  });
}

export async function updateProfile(req, res) {
  const d = await requirePasskeyVerification(req),
    a = {};
  for (const f of ["displayName", "photoURL", "locale", "timezone", "zoneinfo", "location", "country", "gender"])
    if (typeof req.body?.[f] === "string" && req.body[f].length <= 2048)
      a[f] = req.body[f].trim();
  if (!Object.keys(a).length)
    return send(res, 400, { error: "invalid_request" });
  
  await db
    .collection("users")
    .doc(d.uid)
    .set({ ...a, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return send(res, 200, { ok: true });
}
