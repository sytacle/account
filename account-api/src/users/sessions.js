import { db, FieldValue } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";

const sessionIdPattern = /^[a-z0-9-]{20,128}$/i;
function sessionId(value) {
  if (!sessionIdPattern.test(value || "")) throw new ApiError("invalid_request", "A valid device session ID is required.", 400);
  return value;
}
function sessions(uid) { return db.collection("users").doc(uid).collection("sessions"); }

export async function touchSession(req, res) {
  const token = await verifyBearerToken(req);
  const id = sessionId(req.body?.sessionId || req.get("x-device-session"));
  const userAgent = String(req.body?.userAgent || "Unknown device").slice(0, 512);
  const timezone = String(req.body?.timezone || "").slice(0, 128);
  await sessions(token.uid).doc(id).set({
    userAgent, timezone, createdAt: FieldValue.serverTimestamp(), lastSeenAt: FieldValue.serverTimestamp(), revokedAt: null,
  }, { merge: true });
  return send(res, 200, { ok: true, sessionId: id });
}

export async function listSessions(req, res) {
  const token = await verifyBearerToken(req);
  const currentSessionId = req.get("x-device-session") || null;
  const snapshot = await sessions(token.uid).orderBy("lastSeenAt", "desc").limit(50).get();
  return send(res, 200, { sessions: snapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, userAgent: data.userAgent || "Unknown device", timezone: data.timezone || null,
      createdAt: data.createdAt?.toDate?.().toISOString() || null, lastSeenAt: data.lastSeenAt?.toDate?.().toISOString() || null,
      revokedAt: data.revokedAt?.toDate?.().toISOString() || null,
      current: doc.id === currentSessionId };
  }) });
}

export async function revokeSession(req, res) {
  const token = await verifyBearerToken(req);
  const id = sessionId(req.params.sessionId);
  await sessions(token.uid).doc(id).set({ revokedAt: FieldValue.serverTimestamp() }, { merge: true });
  return send(res, 200, { ok: true });
}

export async function revokeOtherSessions(req, res) {
  const token = await verifyBearerToken(req);
  const current = sessionId(req.get("x-device-session"));
  const snapshot = await sessions(token.uid).get();
  const batch = db.batch();
  snapshot.docs.filter((doc) => doc.id !== current).forEach((doc) => batch.set(doc.ref, { revokedAt: FieldValue.serverTimestamp() }, { merge: true }));
  await batch.commit();
  return send(res, 200, { ok: true });
}
