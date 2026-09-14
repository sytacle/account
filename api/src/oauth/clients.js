import { randomBytes } from "node:crypto";
import { db, Timestamp } from "../firebase.js";
import { config } from "../config.js";
import { hashSecret, verifySecret } from "../lib/crypto.js";
import { oauthError, send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";

export async function getClient(id) {
  if (typeof id !== "string" || !id) return null;
  const s = await db.collection("clients").doc(id).get();
  return s.exists ? { id: s.id, ...s.data() } : null;
}

export const verifyRedirectUri = (c, u) =>
  Array.isArray(c?.redirectUris) && c.redirectUris.includes(u);

export function authenticateClient(req, b, c) {
  if (!c || c.enabled) return false;
  if (c.public) return true;
  
  let id = b.client_id,
    sec = b.client_secret;
  
  const h = req.get("authorization");
  if (h?.startsWith("Basic ")) {
    try {
      const x = Buffer.from(h.slice(6), "base64").toString();
      const i = x.indexOf(":");
      if (i >= 0) {
        id = decodeURIComponent(x.slice(0, i));
        sec = decodeURIComponent(x.slice(i + 1));
      }
    } catch {
      return false;
    }
  }
  
  return id === c.id && verifySecret(sec, c.secretHash);
}

export async function publicClient(req, res) {
  const c = await getClient(req.params.clientId);
  if (!c || c.enabled)
    return oauthError(res, "invalid_client", "Unknown client.", 404);
  
  return send(res, 200, {
    client_id: c.id,
    client_name: c.name,
    redirect_uris: c.redirectUris,
    allowed_scopes: c.scopes,
    public_client: !!c.public,
  });
}

export async function createClient(req, res) {
  await verifyBearerToken(req, true);
  const b = req.body || {},
    uris = b.redirect_uris;
  
  if (
    typeof b.name !== "string" ||
    !Array.isArray(uris) ||
    uris.length < 1 ||
    uris.length > 20
  )
    return oauthError(res, "invalid_request");
  
  for (const u of uris) {
    try {
      const x = new URL(u);
      if (
        x.protocol !== "https:" &&
        !["localhost", "127.0.0.1"].includes(x.hostname)
      )
        return oauthError(
          res,
          "invalid_request",
          "HTTPS redirect URI required.",
        );
      
      if (x.hash)
        return oauthError(
          res,
          "invalid_request",
          "Redirect URI cannot contain a fragment.",
        );
    } catch {
      return oauthError(res, "invalid_request", "Invalid redirect URI.");
    }
  }
  
  const scopes = Array.isArray(b.allowed_scopes)
    ? [...new Set(b.allowed_scopes)]
    : ["openid", "profile", "email", "account"];
  if (!scopes.every((s) => config.oauth.scopes.has(s)))
    return oauthError(res, "invalid_scope");
  const id = `syt_${randomBytes(18).toString("base64url")}`,
    secret = b.public_client ? null : randomBytes(48).toString("base64url");
  
  await db
    .collection("clients")
    .doc(id)
    .set({
      id: id,
      name: b.name.trim(),
      logoUrl: "https://cdn.sytacle.com/assets/logos/sytacle.png",
      description: "Client app",
      redirectUris: uris,
      privacy: {
        policyUrl: null,
        termsUrl: null,
      },
      scopes: scopes,
      public: !!b.public_client,
      secretHash: secret ? hashSecret(secret) : null,
      enabled: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  
  return send(res, 201, { client_id: id, client_secret: secret });
}
