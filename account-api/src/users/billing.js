import { db, FieldValue } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken } from "../auth/security.js";
import { requirePasskeyVerification } from "./passkeys.js";

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

function billingAccounts(uid) {
  return billingRef(uid).collection("accounts");
}

function legacyBillingAccounts(uid) {
  return db.collection("users").doc(uid).collection("billing").collection("accounts");
}

function activeBillingRef(uid) {
  return db.collection("users").doc(uid).collection("billing").doc("settings");
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
    productId: data.productId || null,
    priceId: data.priceId || null,
    status: data.status || "active",
    amount: Number(data.amount || 0),
    currency: data.currency || "USD",
    interval: data.interval || "month",
    currentPeriodEnd: dateValue(data.currentPeriodEnd),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
  };
}

function serializeBillingAccount(doc, activeAccountId) {
  const account = doc.data();
  return {
    id: doc.id,
    name: account.name || "",
    email: account.email || "",
    addressLine1: account.addressLine1 || "",
    addressLine2: account.addressLine2 || "",
    city: account.city || "",
    state: account.state || "",
    postalCode: account.postalCode || "",
    country: account.country || "",
    taxId: account.taxId || "",
    isActive: doc.id === activeAccountId,
  };
}

function billingInput(token, body) {
  const account = { name: token.name || "", email: token.email || "" };
  for (const field of billingFields) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string" || body[field].length > 256)
      throw new ApiError("invalid_request", `Invalid billing field: ${field}.`, 400);
    account[field] = body[field].trim();
  }
  if (!account.name || !account.email)
    throw new ApiError("invalid_request", "Name and billing email are required.", 400);
  return account;
}

async function activeAccountId(uid, accounts) {
  const settings = await activeBillingRef(uid).get();
  if (settings.exists && accounts.some((account) => account.id === settings.data().activeAccountId))
    return settings.data().activeAccountId;
  return accounts[0]?.id || null;
}

export async function getBilling(req, res) {
  const token = await verifyBearerToken(req);
  const [accountsSnapshot, legacyAccountsSnapshot] = await Promise.all([
    billingAccounts(token.uid).get(),
    legacyBillingAccounts(token.uid).get(),
  ]);
  const accountsById = new Map(accountsSnapshot.docs.map((account) => [account.id, account]));
  for (const account of legacyAccountsSnapshot.docs) {
    if (!accountsById.has(account.id)) accountsById.set(account.id, account);
  }
  let accounts = [...accountsById.values()];
  const legacy = await billingRef(token.uid).get();
  if (legacy.exists) accounts = [legacy, ...accounts];
  const activeId = await activeAccountId(token.uid, accounts);
  const account = accounts.find((item) => item.id === activeId)?.data() || {};
  return send(res, 200, {
    exists: accounts.length > 0,
    activeAccountId: activeId,
    accounts: accounts.map((item) => serializeBillingAccount(item, activeId)),
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

export async function createBilling(req, res) {
  const token = await requirePasskeyVerification(req);
  const ref = billingAccounts(token.uid).doc();
  const account = billingInput(token, req.body || {});
  await ref.create({
    ...account,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  const existing = await billingAccounts(token.uid).get();
  if (existing.size === 1)
    await activeBillingRef(token.uid).set({ activeAccountId: ref.id }, { merge: true });
  return send(res, 201, { account: serializeBillingAccount(await ref.get(), ref.id) });
}

export async function updateBilling(req, res) {
  const token = await requirePasskeyVerification(req);
  const activeId = (await activeBillingRef(token.uid).get()).data()?.activeAccountId;
  if (activeId && activeId !== "account") return updateBillingAccountFields(req, res, token, activeId);
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

export async function updateBillingAccount(req, res) {
  const token = await requirePasskeyVerification(req);
  return updateBillingAccountFields(req, res, token, req.params.accountId);
}

async function updateBillingAccountFields(req, res, token, accountId) {
  const ref = accountId === "account"
    ? billingRef(token.uid)
    : billingAccounts(token.uid).doc(String(accountId || ""));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ApiError("not_found", "Billing account not found.", 404);
  const update = {};
  for (const field of billingFields) {
    if (req.body?.[field] === undefined) continue;
    if (typeof req.body[field] !== "string" || req.body[field].length > 256)
      throw new ApiError("invalid_request", `Invalid billing field: ${field}.`, 400);
    update[field] = req.body[field].trim();
  }
  if (!Object.keys(update).length)
    throw new ApiError("invalid_request", "At least one billing field is required.", 400);
  await ref.set({ ...update, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return send(res, 200, { account: serializeBillingAccount(await ref.get(), accountId) });
}

export async function activateBillingAccount(req, res) {
  const token = await requirePasskeyVerification(req);
  const accountId = String(req.params.accountId || "");
  const snapshot = await billingAccounts(token.uid).doc(accountId).get();
  if (!snapshot.exists) throw new ApiError("not_found", "Billing account not found.", 404);
  await activeBillingRef(token.uid).set({ activeAccountId: accountId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return send(res, 200, { activeAccountId: accountId });
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
  const token = await requirePasskeyVerification(req);
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
  const token = await requirePasskeyVerification(req);
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
  const token = await requirePasskeyVerification(req);
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
