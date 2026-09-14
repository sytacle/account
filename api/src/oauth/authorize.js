import { db, Timestamp } from "../firebase.js";
import { config } from "../config.js";
import { randomToken, sha256 } from "../lib/crypto.js";
import { oauthError, send, scopes } from "../lib/http.js";
import { getClient, verifyRedirectUri } from "./clients.js";
import { verifyBearerToken } from "../auth/security.js";

export async function authorize(req, res) {
  if (req.method !== "POST")
    return oauthError(res, "method_not_allowed", undefined, 405);
  
  const u = await verifyBearerToken(req),
    b = req.body || {},
    c = await getClient(b.client_id),
    s = scopes(b.scope);
  
  if (!c || c.enabled !== true) return oauthError(res, "invalid_client");
  if (!verifyRedirectUri(c, b.redirect_uri))
    return oauthError(
      res,
      "invalid_request",
      "redirect_uri is not registered.",
    );
  
  if (b.response_type !== "code")
    return oauthError(res, "unsupported_response_type");
  
  if (
    !s.length ||
    s.some((x) => !config.oauth.scopes.has(x) || !c.scopes.includes(x))
  )
    return oauthError(res, "invalid_scope");
  
  if (
    b.code_challenge_method !== "S256" ||
    typeof b.code_challenge !== "string"
  )
    return oauthError(res, "invalid_request", "PKCE S256 is required.");
  
  const code = randomToken(32);
  
  await db
    .collection("oauthCodes")
    .doc(sha256(code))
    .create({
      uid: u.uid,
      clientId: c.id,
      redirectUri: b.redirect_uri,
      scope: s,
      codeChallenge: b.code_challenge,
      used: false,
      expiresAt: Timestamp.fromMillis(Date.now() + config.oauth.codeTtl * 1000),
      createdAt: Timestamp.now(),
    });
  return send(res, 200, {
    code,
    state: typeof b.state === "string" ? b.state : null,
  });
}
