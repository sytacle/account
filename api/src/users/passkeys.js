import { randomBytes, randomUUID } from "node:crypto";
import { db, FieldValue, Timestamp } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";

const b64 = (v) => Buffer.from(v).toString("base64url");
const rpId = () =>
  process.env.WEBAUTHN_RP_ID ||
  new URL(process.env.ACCOUNT_ORIGIN || "http://localhost:5173").hostname;

const origin = () => process.env.ACCOUNT_ORIGIN || "http://localhost:5173";
const credentials = (uid) =>
  db.collection("users").doc(uid).collection("passkeys");

export async function passkeyOptions(req, res) {
  const token = await verifyBearerToken(req);
  const challengeId = randomUUID();
  const challenge = b64(randomBytes(32));
  
  await db
    .collection("users")
    .doc(token.uid)
    .collection("passkeyChallenges")
    .doc(challengeId)
    .set({ challenge, expiresAt: Timestamp.fromMillis(Date.now() + 300000) });
  
  return send(res, 200, {
    challengeId,
    publicKey: {
      challenge,
      rp: { id: rpId(), name: "Sytacle" },
      user: {
        id: b64(Buffer.from(token.uid)),
        name: token.email || token.uid,
        displayName: token.name || token.email || "Sytacle user",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        residentKey: "required",
        userVerification: "required",
      },
      attestation: "none",
    },
  });
}

export async function registerPasskey(req, res) {
  const token = await verifyBearerToken(req);
  const { challengeId, id, rawId, clientDataJSON, publicKey } = req.body || {};
  
  if (
    ![challengeId, id, rawId, clientDataJSON, publicKey].every(
      (v) => typeof v === "string" && v.length < 20000,
    )
  )
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
  const clientData = JSON.parse(
    Buffer.from(clientDataJSON, "base64url").toString("utf8"),
  );
  
  if (
    clientData.type !== "webauthn.create" ||
    clientData.challenge !== saved.challenge ||
    clientData.origin !== origin()
  )
    throw new ApiError("invalid_request", "Invalid passkey response.", 400);
  
  await credentials(token.uid)
    .doc(rawId)
    .set({
      id,
      publicKey,
      createdAt: FieldValue.serverTimestamp(),
      lastUsedAt: null,
    });
  await ref.delete();
  return send(res, 201, { ok: true, id: rawId });
}

export async function listPasskeys(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await credentials(token.uid).get();
  return send(res, 200, {
    passkeys: snapshot.docs.map((doc) => ({
      id: doc.id,
      createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
    })),
  });
}

export async function deletePasskey(req, res) {
  const token = await verifyBearerToken(req);
  await credentials(token.uid).doc(req.params.credentialId).delete();
  return send(res, 200, { ok: true });
}
