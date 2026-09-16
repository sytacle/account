import { db, FieldValue } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";

const billingFields = [
  "name",
  "email",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
  "taxId",
];

function billingRef(uid) {
  return db.collection("users").doc(uid).collection("billing").doc("account");
}

function userCollection(uid, name) {
  return db.collection("users").doc(uid).collection("billing").doc("account").collection(name);
}

function dateValue(value) {
  return value?.toDate?.().toISOString() || null;
}

function serializePaymentMethod(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    provider: data.provider,
    type: data.type || "card",
    brand: data.brand || null,
    last4: data.last4 || null,
    expMonth: data.expMonth || null,
    expYear: data.expYear || null,
    isDefault: data.isDefault === true,
    createdAt: dateValue(data.createdAt),
  };
}

function serializePurchase(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    description: data.description || "Purchase",
    amount: Number(data.amount || 0),
    currency: data.currency || "USD",
    status: data.status || "paid",
    invoiceUrl: data.invoiceUrl || null,
    purchasedAt: dateValue(data.purchasedAt || data.createdAt),
  };
}

function serializeSubscription(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    planId: data.planId || null,
    planName: data.planName || data.planId || "Subscription",
    status: data.status || "active",
    amount: Number(data.amount || 0),
    currency: data.currency || "USD",
    interval: data.interval || "month",
    currentPeriodEnd: dateValue(data.currentPeriodEnd),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
  };
}

export async function getBilling(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await billingRef(token.uid).get();
  const account = snapshot.exists ? snapshot.data() : {};
  return send(res, 200, {
    billing: {
      name: account.name || "",
      email: account.email || token.email || "",
      addressLine1: account.addressLine1 || "",
      addressLine2: account.addressLine2 || "",
      city: account.city || "",
      state: account.state || "",
      postalCode: account.postalCode || "",
      country: account.country || "",
      taxId: account.taxId || "",
    },
  });
}

export async function updateBilling(req, res) {
  const token = await verifyBearerToken(req);
  const update = {};
  for (const field of billingFields) {
    if (req.body?.[field] === undefined) continue;
    if (typeof req.body[field] !== "string" || req.body[field].length > 256)
      throw new ApiError("invalid_request", `Invalid billing field: ${field}.`, 400);
    update[field] = req.body[field].trim();
  }
  if (!Object.keys(update).length)
    throw new ApiError("invalid_request", "At least one billing field is required.", 400);

  await billingRef(token.uid).set(
    { ...update, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return send(res, 200, { ok: true });
}

export async function listPaymentMethods(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await userCollection(token.uid, "paymentMethods").get();
  return send(res, 200, {
    paymentMethods: snapshot.docs
      .filter((doc) => doc.data().deletedAt == null)
      .map(serializePaymentMethod),
  });
}

export async function addPaymentMethod(req, res) {
  const token = await verifyBearerToken(req);
  const body = req.body || {};
  if (typeof body.providerPaymentMethodId !== "string" || !body.providerPaymentMethodId.trim())
    throw new ApiError("invalid_request", "A provider payment-method token is required.", 400);
  if (["number", "cvc", "cardNumber", "pan"].some((field) => body[field] !== undefined))
    throw new ApiError("invalid_request", "Raw card details must be sent directly to the payment provider.", 400);

  const ref = userCollection(token.uid, "paymentMethods").doc();
  await ref.set({
    provider: typeof body.provider === "string" ? body.provider.slice(0, 32) : "external",
    providerPaymentMethodId: body.providerPaymentMethodId.trim().slice(0, 256),
    type: typeof body.type === "string" ? body.type.slice(0, 32) : "card",
    brand: typeof body.brand === "string" ? body.brand.slice(0, 32) : null,
    last4: typeof body.last4 === "string" ? body.last4.slice(-4) : null,
    expMonth: Number.isInteger(body.expMonth) ? body.expMonth : null,
    expYear: Number.isInteger(body.expYear) ? body.expYear : null,
    isDefault: body.isDefault === true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return send(res, 201, { paymentMethod: serializePaymentMethod(await ref.get()) });
}

export async function removePaymentMethod(req, res) {
  const token = await verifyBearerToken(req);
  const ref = userCollection(token.uid, "paymentMethods").doc(String(req.params.paymentMethodId || ""));
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().deletedAt != null)
    throw new ApiError("not_found", "Payment method not found.", 404);
  await ref.set({ deletedAt: FieldValue.serverTimestamp() }, { merge: true });
  return send(res, 200, { ok: true });
}

export async function listPurchases(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await userCollection(token.uid, "purchases").get();
  return send(res, 200, {
    purchases: snapshot.docs
      .sort((a, b) => (b.data().purchasedAt?.toMillis?.() || 0) - (a.data().purchasedAt?.toMillis?.() || 0))
      .map(serializePurchase),
  });
}

export async function listSubscriptions(req, res) {
  const token = await verifyBearerToken(req);
  const snapshot = await userCollection(token.uid, "subscriptions").get();
  return send(res, 200, {
    subscriptions: snapshot.docs.map(serializeSubscription),
  });
}

export async function cancelSubscription(req, res) {
  const token = await verifyBearerToken(req);
  const ref = userCollection(token.uid, "subscriptions").doc(String(req.params.subscriptionId || ""));
  const snapshot = await ref.get();
  if (!snapshot.exists)
    throw new ApiError("not_found", "Subscription not found.", 404);
  await ref.set(
    { cancelAtPeriodEnd: true, updatedAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  return send(res, 200, { ok: true });
}
