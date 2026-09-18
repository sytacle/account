import { auth, db, FieldValue, Timestamp } from "../firebase.js";
import { send } from "../lib/http.js";
import { config } from "../config.js"

const PLAN_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const plans = new Set(config.plans);

function asDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function nextFreeExpiry(createdAt, now) {
  let expiry = new Date(createdAt.getTime() + PLAN_PERIOD_MS);
  while (expiry <= now) expiry = new Date(expiry.getTime() + PLAN_PERIOD_MS);
  return expiry;
}

async function latestSubscription(uid) {
  const snapshot = await db
    .collection("users")
    .doc(uid)
    .collection("billing")
    .doc("account")
    .collection("subscriptions")
    .where("status", "in", ["active", "trialing"])
    .get();
  return snapshot.docs
    .map((doc) => doc.data())
    .sort((a, b) => (b.currentPeriodEnd?.toMillis?.() || 0) - (a.currentPeriodEnd?.toMillis?.() || 0))[0] || null;
}

async function syncUser(user, now) {
  const userRef = db.collection("users").doc(user.uid);
  const userSnapshot = await userRef.get();
  const profile = userSnapshot.exists ? userSnapshot.data() : {};
  const claims = user.customClaims || {};
  const createdAt = asDate(profile.accountCreatedAt || user.metadata.creationTime) || now;
  const currentPlan = plans.has(claims.subscription) ? claims.subscription : "free";
  const subscription = currentPlan === "free" ? null : await latestSubscription(user.uid);
  const claimedExpiry = asDate(claims.subscriptionExpiresAt || profile.subscriptionExpiresAt);
  const subscriptionExpiry = asDate(subscription?.currentPeriodEnd);
  let expiresAt = claimedExpiry || subscriptionExpiry || new Date(createdAt.getTime() + PLAN_PERIOD_MS);
  let plan = currentPlan;
  let startedAt = asDate(claims.subscriptionStartedAt || profile.subscriptionStartedAt) || createdAt;

  if (expiresAt <= now) {
    if (plan === "free") {
      expiresAt = nextFreeExpiry(createdAt, now);
    } else {
      plan = "free";
      startedAt = now;
      expiresAt = new Date(now.getTime() + PLAN_PERIOD_MS);
    }
  }

  const nextClaims = {
    ...claims,
    subscription: plan,
    plans: config.subscription.plans[plan],
    subscriptionStartedAt: startedAt.toISOString(),
    subscriptionExpiresAt: expiresAt.toISOString(),
  };
  
  await auth.setCustomUserClaims(user.uid, nextClaims);
  await userRef.set({
    accountCreatedAt: Timestamp.fromDate(createdAt),
    subscription: plan,
    plans: config.subscription.plans[plan],
    subscriptionStartedAt: Timestamp.fromDate(startedAt),
    subscriptionExpiresAt: Timestamp.fromDate(expiresAt),
    subscriptionLastCheckedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  
  return { uid: user.uid, plan, expiresAt: expiresAt.toISOString() };
}

export async function syncSubscriptionExpirations(req, res) {
  const expected = process.env.CRON_SECRET;
  if (!expected || req.get("authorization") !== `Bearer ${expected}`)
    return send(res, 401, { error: "unauthorized" });

  const now = new Date();
  const updated = [];
  let pageToken;
  
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) updated.push(await syncUser(user, now));
    pageToken = page.pageToken;
  } while (pageToken);

  return send(res, 200, { ok: true, checked: updated.length, updated });
}
