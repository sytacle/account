import { auth } from "../firebase.js";
import { HttpsError } from "firebase-functions/v2/https";
export function normalizeEmail(e) {
  return typeof e === "string" ? e.trim().toLowerCase() : null;
}
export function getEmailDomain(e) {
  const n = normalizeEmail(e),
    i = n?.lastIndexOf("@");
  return i > 0 ? n.slice(i + 1) : null;
}
export async function verifyBearerToken(req, admin = false) {
  const h = req.get("authorization") || "";
  if (!/^Bearer\s+/i.test(h))
    throw new HttpsError("unauthenticated", "A Firebase ID token is required.");
  try {
    const d = await auth.verifyIdToken(h.replace(/^Bearer\s+/i, ""), true);
    if (admin && d.admin !== true)
      throw new HttpsError(
        "permission-denied",
        "Administrator access is required.",
      );
    return d;
  } catch (e) {
    if (e instanceof HttpsError) throw e;
    throw new HttpsError(
      "unauthenticated",
      "Invalid or revoked Firebase ID token.",
    );
  }
}
