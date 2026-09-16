import { auth } from "./firebase.js";
import { config } from "./config.js";
import { ApiError } from "./lib/errors.js";
import { send } from "./lib/http.js";

export function isSsoOrigin(origin) {
  return typeof origin === "string" && config.sso.origins.has(origin);
}

export function ssoCors(req, res, next) {
  const origin = req.get("origin");
  if (isSsoOrigin(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
}

export async function exchangeSsoToken(req, res) {
  if (req.method !== "POST")
    return send(res, 405, { error: "method_not_allowed" });

  const origin = req.get("origin");
  const body = req.body || {};
  if (!isSsoOrigin(origin) || body.origin !== origin || !isSsoOrigin(body.target_origin))
    return send(res, 403, { error: "origin_not_allowed" });

  if (typeof body.id_token !== "string" || body.id_token.length > 8192)
    return send(res, 400, { error: "invalid_request" });

  try {
    const decoded = await auth.verifyIdToken(body.id_token, true);
    const customToken = await auth.createCustomToken(decoded.uid, {
      sso: true,
    });
    return send(res, 200, { custom_token: customToken });
  } catch {
    throw new ApiError("unauthenticated", "Invalid or revoked Firebase ID token.", 401);
  }
}