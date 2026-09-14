import { auth } from "../firebase.js";
import { ApiError } from "../lib/errors.js";

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
    throw new ApiError(
      "unauthenticated",
      "A Firebase ID token is required.",
      401,
    );
  
  try {
    const d = await auth.verifyIdToken(h.replace(/^Bearer\s+/i, ""), true);
    if (admin && d.admin !== true)
      throw new ApiError(
        "permission_denied",
        "Administrator access is required.",
        403,
      );
    return d;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      "unauthenticated",
      "Invalid or revoked Firebase ID token.",
      401,
    );
  }
}
