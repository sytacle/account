import { db } from "../firebase.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";

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