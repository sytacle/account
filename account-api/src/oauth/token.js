import { db, Timestamp } from "../firebase.js";
import { config } from "../config.js";
import { randomToken, sha256, pkce } from "../lib/crypto.js";
import { oauthError, send } from "../lib/http.js";
import { authenticateClient, getClient } from "./clients.js";

export async function tokenExchange(req, res) {
  if (req.method !== "POST")
    return oauthError(res, "method_not_allowed", undefined, 405);
  
  const b = req.body || {},
    c = await getClient(b.client_id);
  
  if (!c || !authenticateClient(req, b, c))
    return oauthError(
      res,
      "invalid_client",
      "Client authentication failed.",
      401,
    );
  
  if (b.grant_type === "authorization_code") return code(b, c, res);
  if (b.grant_type === "refresh_token") return refresh(b, c, res);
  
  return oauthError(res, "unsupported_grant_type");
}

async function code(b, c, res) {
  if (!b.code || !b.redirect_uri || !b.code_verifier)
    return oauthError(res, "invalid_request");
  
  const ref = db.collection("oauthCodes").doc(sha256(b.code));
  
  let d;
  
  try {
    d = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) throw 1;
      
      const x = s.data();
      
      if (
        x.used ||
        x.clientId !== c.id ||
        x.redirectUri !== b.redirect_uri ||
        x.expiresAt.toMillis() <= Date.now() ||
        pkce(b.code_verifier) !== x.codeChallenge
      )
        throw 1;
      tx.update(ref, { used: true, usedAt: Timestamp.now() });
      return x;
    });
  } catch {
    return oauthError(res, "invalid_grant");
  }
  
  return issue(d.uid, c.id, c.name, d.scope, res);
}

async function refresh(b, c, res) {
  if (!b.refresh_token) return oauthError(res, "invalid_request");
  const ref = db.collection("oauthRefreshTokens").doc(sha256(b.refresh_token));
  
  let d;
  
  try {
    d = await db.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) throw 1;
      const x = s.data();
      if (x.clientId !== c.id || x.expiresAt.toMillis() <= Date.now()) throw 1;
      
      if (x.familyId) {
        const familyRef = db.collection("oauthRefreshFamilies").doc(x.familyId);
        const family = await tx.get(familyRef);
        
        if (family.exists && family.data().revoked) throw 1;
        if (x.revoked) {
          tx.set(
            familyRef,
            { revoked: true, revokedAt: Timestamp.now() },
            { merge: true },
          );
          throw 1;
        }
      } else if (x.revoked) throw 1;
      tx.update(ref, { revoked: true, revokedAt: Timestamp.now() });
      
      return x;
    });
  } catch {
    return oauthError(res, "invalid_grant");
  }
  
  return issue(d.uid, c.id, c.name, d.scope, res, d.familyId);
}

async function issue(uid, cid, clientName, scope, res, familyId) {
  const family = familyId || randomToken(24),
    access = randomToken(),
    refresh = randomToken(64),
    now = Date.now(),
    timestamp = Timestamp.now(),
    batch = db.batch();
  
  batch.set(db.collection("oauthAccessTokens").doc(sha256(access)), {
    uid,
    clientId: cid,
    scope,
    familyId: family,
    expiresAt: Timestamp.fromMillis(now + config.oauth.accessTtl * 1000),
    createdAt: timestamp,
  });
  
  batch.set(db.collection("oauthRefreshTokens").doc(sha256(refresh)), {
    uid,
    clientId: cid,
    scope,
    familyId: family,
    revoked: false,
    expiresAt: Timestamp.fromMillis(now + config.oauth.refreshTtl * 1000),
    createdAt: Timestamp.now(),
  });
  
  batch.set(
    db.collection("oauthRefreshFamilies").doc(family),
    {
      uid,
      clientId: cid,
      scope,
      revoked: false,
      expiresAt: Timestamp.fromMillis(now + config.oauth.refreshTtl * 1000),
      createdAt: timestamp,
      updatedAt: timestamp,
      lastUsedAt: timestamp,
    },
    { merge: true },
  );

  if (!familyId) {
    batch.set(db.collection("users").doc(uid).collection("activity").doc(), {
      type: "oauth_sign_in",
      clientId: cid,
      clientName: clientName || "Unknown application",
      familyId: family,
      createdAt: timestamp,
    });
  }
  
  await batch.commit();
  
  return send(res, 200, {
    access_token: access,
    token_type: "Bearer",
    expires_in: config.oauth.accessTtl,
    refresh_token: refresh,
    scope: scope.join(" "),
  });
}

export async function revokeToken(req, res) {
  if (req.method !== "POST")
    return oauthError(res, "method_not_allowed", undefined, 405);
  
  const b = req.body || {},
    c = await getClient(b.client_id);
  
  if (!c || !authenticateClient(req, b, c))
    return oauthError(res, "invalid_client", undefined, 401);
  
  if (typeof b.token !== "string" || !b.token)
    return oauthError(res, "invalid_request");
  
  const h = sha256(b.token);
  
  for (const col of ["oauthAccessTokens", "oauthRefreshTokens"]) {
    const r = db.collection(col).doc(h),
      s = await r.get();
    if (s.exists && s.data().clientId === c.id)
      await r.update({ revoked: true, revokedAt: Timestamp.now() });
  }
  
  return send(res, 200, {});
}
