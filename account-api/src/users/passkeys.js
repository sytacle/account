import { randomUUID } from "node:crypto";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse } from "@simplewebauthn/server";
import { auth, db, FieldValue, Timestamp } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";
import { config } from "../config.js";

const rpId = () =>
  process.env.WEBAUTHN_RP_ID ||
  new URL(process.env.ACCOUNT_ORIGIN || "http://localhost:5173").hostname;
const credentials = (uid) =>
  db.collection("users").doc(uid).collection("passkeys");
const normalizeOrigin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
};
const allowedOrigins = () => {
  const origins = new Set();
  const configuredOrigin = normalizeOrigin(process.env.ACCOUNT_ORIGIN || "");

  if (configuredOrigin) origins.add(configuredOrigin);
  for (const value of config.corsOrigins) {
    const origin = normalizeOrigin(value);
    if (origin) origins.add(origin);
  }

  return origins;
};

export async function passkeyOptions(req, res) {
  const token = await verifyBearerToken(req);
  const challengeId = randomUUID();
  const existing = await credentials(token.uid).get();
  const options = await generateRegistrationOptions({
    rpName: "Sytacle",
    rpID: rpId(),
    userID: Buffer.from(token.uid),
    userName: token.email || token.uid,
    userDisplayName: token.name || token.email || "Sytacle user",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    excludeCredentials: existing.docs.map((doc) => ({ id: doc.id })),
  });

  await db
    .collection("users")
    .doc(token.uid)
    .collection("passkeyChallenges")
    .doc(challengeId)
    .set({ challenge: options.challenge, expiresAt: Timestamp.fromMillis(Date.now() + 300000) });

  return send(res, 200, { challengeId, publicKey: options });
}

export async function registerPasskey(req, res) {
  const token = await verifyBearerToken(req);
  const { challengeId, response, name } = req.body || {};
  if (typeof challengeId !== "string" || !response || typeof response !== "object")
    throw new ApiError("invalid_request", "Incomplete passkey response.", 400);
  
  const ref = db
    .collection("users")
    .doc(token.uid)
    .collection("passkeyChallenges")
    .doc(challengeId);
  
  const challengeDoc = await ref.get();
  const saved = challengeDoc.data();
  
  if (!challengeDoc.exists || saved.expiresAt.toMillis() < Date.now())
    throw new ApiError("invalid_request", "Passkey challenge expired.", 400);
  const validOrigins = allowedOrigins();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: saved.challenge,
    expectedOrigin: [...validOrigins],
    expectedRPID: rpId(),
  });
  if (!verification.verified)
    throw new ApiError("invalid_request", "Invalid passkey response.", 400);

  const credential = verification.registrationInfo.credential;
  await credentials(token.uid).doc(credential.id).set({
    id: credential.id,
    name: typeof name === "string" && name.trim() ? name.trim().slice(0, 80) : "Passkey",
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: response.response.transports || [],
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: null,
  });
  await ref.delete();
  return send(res, 201, { ok: true, id: credential.id });
}

export async function listPasskeys(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await credentials(token.uid).get();
  return send(res, 200, {
    passkeys: snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name || "Passkey",
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    })),
  });
}

export async function passkeyLoginOptions(req, res) {
  const challengeId = randomUUID();
  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: "required",
  });
  await db.collection("passkeyLoginChallenges").doc(challengeId).set({
    challenge: options.challenge,
    expiresAt: Timestamp.fromMillis(Date.now() + 300000),
  });
  return send(res, 200, { challengeId, publicKey: options });
}

export async function passkeyLogin(req, res) {
  const { challengeId, response } = req.body || {};
  if (typeof challengeId !== "string" || !response || typeof response !== "object")
    throw new ApiError("invalid_request", "Incomplete passkey login response.", 400);

  const challengeRef = db.collection("passkeyLoginChallenges").doc(challengeId);
  const challengeDoc = await challengeRef.get();
  if (!challengeDoc.exists || challengeDoc.data().expiresAt.toMillis() < Date.now())
    throw new ApiError("invalid_request", "Passkey login challenge expired.", 400);

  const credentialSnapshot = await db
    .collectionGroup("passkeys")
    .where("id", "==", response.id)
    .limit(1)
    .get();
  if (credentialSnapshot.empty)
    throw new ApiError("unauthenticated", "Passkey was not recognized.", 401);

  const credentialDoc = credentialSnapshot.docs[0];
  const credentialData = credentialDoc.data();
  const userDoc = credentialDoc.ref.parent.parent;
  const validOrigins = allowedOrigins();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeDoc.data().challenge,
    expectedOrigin: [...validOrigins],
    expectedRPID: rpId(),
    credential: {
      id: credentialData.id,
      publicKey: Uint8Array.from(Buffer.from(credentialData.publicKey, "base64url")),
      counter: credentialData.counter || 0,
      transports: credentialData.transports || [],
    },
  });
  if (!verification.verified)
    throw new ApiError("unauthenticated", "Passkey verification failed.", 401);

  await credentialDoc.ref.set({
    counter: verification.authenticationInfo.newCounter,
    lastUsedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await challengeRef.delete();
  return send(res, 200, { token: await auth.createCustomToken(userDoc.id) });
}

export async function passkeyStepUpOptions(req, res) {
  const token = await verifyBearerToken(req);
  const existing = await credentials(token.uid).get();
  if (existing.empty)
    throw new ApiError("passkey_required", "Register a passkey before confirming sensitive actions.", 412);
  const challengeId = randomUUID();
  const options = await generateAuthenticationOptions({
    rpID: rpId(),
    userVerification: "required",
    allowCredentials: existing.docs.map((doc) => ({
      id: doc.id,
      transports: doc.data().transports || [],
    })),
  });
  await db.collection("users").doc(token.uid).collection("passkeyStepUpChallenges").doc(challengeId).set({
    challenge: options.challenge,
    expiresAt: Timestamp.fromMillis(Date.now() + 300000),
  });
  return send(res, 200, { challengeId, publicKey: options });
}

export async function verifyPasskeyStepUp(req, res) {
  const token = await verifyBearerToken(req);
  const { challengeId, response } = req.body || {};
  if (typeof challengeId !== "string" || !response || typeof response !== "object")
    throw new ApiError("invalid_request", "Incomplete passkey verification response.", 400);

  const challengeRef = db.collection("users").doc(token.uid).collection("passkeyStepUpChallenges").doc(challengeId);
  const challengeDoc = await challengeRef.get();
  if (!challengeDoc.exists || challengeDoc.data().expiresAt.toMillis() < Date.now())
    throw new ApiError("invalid_request", "Passkey verification challenge expired.", 400);

  const credentialRef = credentials(token.uid).doc(response.id);
  const credentialDoc = await credentialRef.get();
  if (!credentialDoc.exists)
    throw new ApiError("unauthenticated", "Passkey was not recognized.", 401);
  const credential = credentialDoc.data();
  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeDoc.data().challenge,
    expectedOrigin: [...allowedOrigins()],
    expectedRPID: rpId(),
    credential: {
      id: credential.id,
      publicKey: Uint8Array.from(Buffer.from(credential.publicKey, "base64url")),
      counter: credential.counter || 0,
      transports: credential.transports || [],
    },
  });
  if (!verification.verified)
    throw new ApiError("unauthenticated", "Passkey verification failed.", 401);

  await credentialRef.set({
    counter: verification.authenticationInfo.newCounter,
    lastUsedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  await challengeRef.delete();
  const verificationToken = randomUUID();
  await db.collection("passkeyVerificationTokens").doc(verificationToken).set({
    uid: token.uid,
    used: false,
    expiresAt: Timestamp.fromMillis(Date.now() + 120000),
    createdAt: FieldValue.serverTimestamp(),
  });
  return send(res, 200, { verificationToken });
}

export async function requirePasskeyVerification(req) {
  const token = await verifyBearerToken(req);
  const verificationToken = req.get("x-passkey-verification");
  if (!verificationToken)
    throw new ApiError("passkey_required", "Passkey verification is required.", 428);

  const ref = db.collection("passkeyVerificationTokens").doc(verificationToken);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data();
    if (!snapshot.exists || data.uid !== token.uid || data.used || data.expiresAt.toMillis() < Date.now())
      throw new ApiError("passkey_required", "Passkey verification is required.", 428);
    transaction.update(ref, { used: true, usedAt: FieldValue.serverTimestamp() });
  });
  return token;
}

export async function deletePasskey(req, res) {
  const token = await requirePasskeyVerification(req);
  await credentials(token.uid).doc(req.params.credentialId).delete();
  return send(res, 200, { ok: true });
}
