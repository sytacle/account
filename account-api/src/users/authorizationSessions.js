import { db, Timestamp } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";
import { sha256 } from "../lib/crypto.js";

export async function listAuthorizationSessions(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await db
    .collection("oauthRefreshFamilies")
    .where("uid", "==", token.uid)
    .limit(50)
    .get();
  const active = snapshot.docs.filter((doc) => {
    const data = doc.data();
    return (
      data.revoked !== true &&
      (!data.expiresAt || data.expiresAt.toMillis?.() > Date.now())
    );
  });
  const clients = await Promise.all(
    active.map(async (doc) => {
      const data = doc.data();
      const client = await db.collection("clients").doc(data.clientId).get();
      return {
        id: doc.id,
        clientId: data.clientId,
        clientName: client.exists ? client.data().name : "Unknown application",
        logoUrl: client.exists ? client.data().logoUrl || null : null,
        scope: Array.isArray(data.scope) ? data.scope : [],
        createdAt: data.createdAt?.toDate?.().toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.().toISOString() || null,
        expiresAt: data.expiresAt?.toDate?.().toISOString() || null,
      };
    }),
  );
  return send(res, 200, { sessions: clients });
}

export async function revokeAuthorizationSession(req, res) {
  const token = await verifyBearerToken(req);
  const sessionId = String(req.params.sessionId || "");
  if (!sessionId)
    throw new ApiError("invalid_request", "A session ID is required.", 400);

  const familyRef = db.collection("oauthRefreshFamilies").doc(sessionId);
  const familySnapshot = await familyRef.get();
  if (!familySnapshot.exists || familySnapshot.data().uid !== token.uid)
    throw new ApiError("not_found", "Authorization session not found.", 404);

  const clientId = familySnapshot.data().clientId;
  const familySnapshotForClient = await db
    .collection("oauthRefreshFamilies")
    .where("uid", "==", token.uid)
    .get();
  const batch = db.batch();
  familySnapshotForClient.docs
    .filter((doc) => doc.data().clientId === clientId)
    .forEach((doc) =>
      batch.set(
        doc.ref,
        { revoked: true, revokedAt: Timestamp.now() },
        { merge: true },
      ),
    );
  if (clientId) {
    batch.set(
      db.collection("oauthGrants").doc(sha256(`${token.uid}:${clientId}`)),
      { scope: [], updatedAt: Timestamp.now() },
      { merge: true },
    );
  }
  await batch.commit();
  return send(res, 200, { ok: true });
}