import { db, FieldValue, Timestamp } from "../firebase.js";
import { ApiError } from "../lib/errors.js";
import { send } from "../lib/http.js";
import { verifyBearerToken, verifyRole } from "../auth/security.js";
import { requirePasskeyVerification } from "./passkeys.js";
import { setUserClaims } from "./claims.js";
import { config } from "../config.js"

const productCollection = () => db.collection("subscriptionProducts");
const itemCollection = (productId) =>
  productCollection().doc(productId).collection("items");
const priceCollection = (productId) =>
  productCollection().doc(productId).collection("prices");
const configRef = () => db.collection("subscriptionConfig").doc("default");

function text(value, field, max = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ApiError("invalid_request", `${field} is required.`, 400);
  
  return value.trim();
}

function optionalText(value, field, max = 2048) {
  if (value === undefined || value === null || value === "") return null;
  
  return text(value, field, max);
}

function serializeProduct(doc, items = [], prices = []) {
  const data = doc.data();
  
  return {
    id: doc.id,
    name: data.name,
    description: data.description || "",
    active: data.active !== false,
    metadata: data.metadata || {},
    items,
    prices,
  };
}

function serializeItem(doc) {
  const data = doc.data();
  
  return {
    id: doc.id,
    name: data.name,
    description: data.description || "",
    active: data.active !== false,
  };
}

function serializePrice(doc) {
  const data = doc.data();
  
  return {
    id: doc.id,
    itemId: data.itemId,
    amount: Number(data.amount || 0),
    currency: data.currency || "USD",
    interval: data.interval || "month",
    active: data.active !== false,
    trialDays: Number(data.trialDays || 0),
  };
}

async function catalogProduct(doc) {
  const [items, prices] = await Promise.all([
    itemCollection(doc.id).get(),
    priceCollection(doc.id).get(),
  ]);
  
  return serializeProduct(
    doc,
    items.docs.filter((item) => item.data().active !== false).map(serializeItem),
    prices.docs.filter((price) => price.data().active !== false).map(serializePrice),
  );
}

async function managedProduct(doc) {
  const [items, prices] = await Promise.all([
    itemCollection(doc.id).get(),
    priceCollection(doc.id).get(),
  ]);
  
  return serializeProduct(
    doc,
    items.docs.map(serializeItem),
    prices.docs.map(serializePrice),
  );
}

export async function listSubscriptionProducts(req, res) {
  await verifyBearerToken(req);
  
  const snapshot = await productCollection().get();
  const products = await Promise.all(
    snapshot.docs
      .filter((doc) => doc.data().active !== false)
      .map(catalogProduct),
  );
  
  return send(res, 200, { products });
}

export async function listManagedProducts(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const snapshot = await productCollection().get();
  
  return send(res, 200, {
    products: await Promise.all(snapshot.docs.map(managedProduct)),
  });
}

export async function createProduct(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const body = req.body || {};
  const ref = productCollection().doc();
  
  await ref.set({
    name: text(body.name, "name"),
    description: optionalText(body.description, "description") || "",
    active: body.active !== false,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : {},
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  return send(res, 201, { product: await catalogProduct(await ref.get()) });
}

export async function updateProduct(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const ref = productCollection().doc(req.params.productId);
  const snapshot = await ref.get();
  
  if (!snapshot.exists) throw new ApiError("not_found", "Product not found.", 404);
  
  const body = req.body || {};
  const update = { updatedAt: FieldValue.serverTimestamp() };
  
  if (body.name !== undefined) update.name = text(body.name, "name");
  
  if (body.description !== undefined)
    update.description = optionalText(body.description, "description") || "";
  
  if (body.active !== undefined) update.active = body.active === true;
  
  if (body.metadata !== undefined && typeof body.metadata === "object")
    update.metadata = body.metadata;
  
  await ref.set(update, { merge: true });
  
  return send(res, 200, { product: await catalogProduct(await ref.get()) });
}

export async function createItem(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const product = await productCollection().doc(req.params.productId).get();
  if (!product.exists) throw new ApiError("not_found", "Product not found.", 404);
  
  const body = req.body || {};
  const ref = itemCollection(product.id).doc();
  
  await ref.set({
    name: text(body.name, "name"),
    description: optionalText(body.description, "description") || "",
    active: body.active !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  return send(res, 201, { item: serializeItem(await ref.get()) });
}

export async function updateItem(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const ref = itemCollection(req.params.productId).doc(req.params.itemId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new ApiError("not_found", "Product item not found.", 404);
  
  const body = req.body || {};
  const update = { updatedAt: FieldValue.serverTimestamp() };
  
  if (body.name !== undefined) update.name = text(body.name, "name");
  if (body.description !== undefined)
    update.description = optionalText(body.description, "description") || "";
  
  if (body.active !== undefined) update.active = body.active === true;
  
  await ref.set(update, { merge: true });
  
  return send(res, 200, { item: serializeItem(await ref.get()) });
}

export async function createPrice(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const product = await productCollection().doc(req.params.productId).get();
  if (!product.exists) throw new ApiError("not_found", "Product not found.", 404);
  
  const body = req.body || {};
  const itemId = text(body.itemId, "itemId");
  const item = await itemCollection(product.id).doc(itemId).get();
  
  if (!item.exists) throw new ApiError("not_found", "Product item not found.", 404);
  
  const amount = Number(body.amount);
  
  if (!Number.isFinite(amount) || amount < 0)
    throw new ApiError("invalid_request", "amount must be a non-negative number.", 400);
  
  if (!["day", "week", "month", "year", "one_time"].includes(body.interval))
    throw new ApiError("invalid_request", "interval is invalid.", 400);
  
  const ref = priceCollection(product.id).doc();
  
  await ref.set({
    itemId,
    amount,
    currency: text(body.currency || "USD", "currency", 8).toUpperCase(),
    interval: body.interval,
    trialDays: Math.max(0, Number(body.trialDays || 0)),
    active: body.active !== false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  return send(res, 201, { price: serializePrice(await ref.get()) });
}

export async function updatePrice(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const ref = priceCollection(req.params.productId).doc(req.params.priceId);
  const snapshot = await ref.get();
  
  if (!snapshot.exists) throw new ApiError("not_found", "Price not found.", 404);
  
  const body = req.body || {};
  const update = { updatedAt: FieldValue.serverTimestamp() };
  
  if (body.active !== undefined) update.active = body.active === true;
  
  if (body.amount !== undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0)
      throw new ApiError("invalid_request", "amount must be a non-negative number.", 400);
    update.amount = amount;
  }
  
  if (body.trialDays !== undefined) update.trialDays = Math.max(0, Number(body.trialDays));
  
  await ref.set(update, { merge: true });
  
  return send(res, 200, { price: serializePrice(await ref.get()) });
}

export async function getSubscriptionConfig(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  const snapshot = await configRef().get();
  
  return send(res, 200, { configuration: snapshot.exists ? snapshot.data() : {} });
}

export async function updateSubscriptionConfig(req, res) {
  await verifyRole(req, ["admin", "billing_admin"]);
  
  const body = req.body || {};
  const update = { updatedAt: FieldValue.serverTimestamp() };
  
  if (body.defaultCurrency !== undefined)
    update.defaultCurrency = text(body.defaultCurrency, "defaultCurrency", 8).toUpperCase();
  
  if (body.allowMultipleSubscriptions !== undefined)
    update.allowMultipleSubscriptions = body.allowMultipleSubscriptions === true;
  
  if (body.gracePeriodDays !== undefined) {
    const days = Number(body.gracePeriodDays);
    if (!Number.isInteger(days) || days < 0 || days > 90)
      throw new ApiError("invalid_request", "gracePeriodDays must be between 0 and 90.", 400);
    update.gracePeriodDays = days;
  }
  
  await configRef().set(update, { merge: true });
  
  return send(res, 200, { ok: true });
}

export async function createSubscription(req, res) {
  const token = await requirePasskeyVerification(req);
  
  if (token.admin !== true && !["developer", "admin"].includes(token.role))
    throw new ApiError("permission_denied", "Developer or admin role required.", 403);
  
  const billingRoot = db.collection("users").doc(token.uid).collection("billing");
  const legacyBilling = await billingRoot.doc("account").get();
  const billingAccounts = await billingRoot.doc("account").collection("accounts").get();
  
  if (!legacyBilling.exists && billingAccounts.empty)
    throw new ApiError("billing_account_required", "Create a billing account before subscribing.", 409);

  const priceId = text(req.body?.priceId, "priceId");
  const productId = text(req.body?.productId, "productId");
  const priceSnapshot = await priceCollection(productId).doc(priceId).get();
  
  if (!priceSnapshot.exists || priceSnapshot.data().active === false)
    throw new ApiError("not_found", "Subscription price not found or inactive.", 404);

  const configSnapshot = await configRef().get();
  const configuration = configSnapshot.exists ? configSnapshot.data() : {};
  const subscriptions = db.collection("users").doc(token.uid).collection("billing").doc("account").collection("subscriptions");
  const active = await subscriptions.where("status", "in", ["active", "trialing"]).get();
  
  if (configuration.allowMultipleSubscriptions !== true && !active.empty)
    throw new ApiError("subscription_exists", "An active subscription already exists.", 409);

  const productSnapshot = await productCollection().doc(productId).get();
  if (productSnapshot.data().active === false)
    throw new ApiError("not_found", "Subscription product is inactive.", 404);
  
  const itemSnapshot = await itemCollection(productId).doc(priceSnapshot.data().itemId).get();
  
  if (!itemSnapshot.exists || itemSnapshot.data().active === false)
    throw new ApiError("not_found", "Subscription item is inactive.", 404);
  
  const now = new Date();
  const periodEnd = new Date(now);
  const interval = priceSnapshot.data().interval;
  
  if (interval === "year") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else if (interval === "month") periodEnd.setMonth(periodEnd.getMonth() + 1);
  else if (interval === "week") periodEnd.setDate(periodEnd.getDate() + 7);
  else periodEnd.setDate(periodEnd.getDate() + 1);

  const ref = subscriptions.doc();
  const status = priceSnapshot.data().trialDays > 0 ? "trialing" : "active";
  const planKey = config.plans.includes(productId)
    ? productId
    : config.plans.find((plan) => productSnapshot.data().name?.toLowerCase().includes(plan)) || "pro";
  
  await ref.set({
    productId,
    productName: productSnapshot.data().name,
    itemId: itemSnapshot.exists ? itemSnapshot.data().name : priceSnapshot.data().itemId,
    priceId,
    planId: priceId,
    planName: itemSnapshot.exists ? itemSnapshot.data().name : productSnapshot.data().name,
    amount: priceSnapshot.data().amount,
    currency: priceSnapshot.data().currency,
    interval,
    status,
    startedAt: FieldValue.serverTimestamp(),
    currentPeriodEnd: Timestamp.fromDate(periodEnd),
    cancelAtPeriodEnd: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  
  await setUserClaims(token.uid, {
    subscription: planKey,
    subscriptionStartedAt: now.toISOString(),
    subscriptionExpiresAt: periodEnd.toISOString(),
  });
  
  await db.collection("users").doc(token.uid).set({
    subscription: planKey,
    subscriptionStartedAt: Timestamp.fromDate(now),
    subscriptionExpiresAt: Timestamp.fromDate(periodEnd),
  }, { merge: true });
  
  return send(res, 201, { subscription: { id: ref.id, status } });
}