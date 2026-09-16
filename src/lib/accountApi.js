const API_BASE = (
  import.meta.env.VITE_ACCOUNT_API_URL ||
  import.meta.env.VITE_OAUTH_API_URL ||
  "https://api.sytacle.com"
).replace(/\/$/, "");

const SESSION_KEY = "sytacle.accountSessionId";
const responseCache = new Map();
const CACHE_TTL = 15_000;

function cacheKey(user, path) {
  return `${user.uid}:${path}`;
}

function invalidateCache(user, pathPrefix = "") {
  const prefix = `${user.uid}:${pathPrefix}`;
  for (const key of responseCache.keys()) {
    if (key.startsWith(prefix)) responseCache.delete(key);
  }
}

export function getDeviceSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

async function request(user, path, options = {}) {
  if (!user) throw new Error("Not signed in");
  const method = options.method || "GET";
  const key = cacheKey(user, path);
  if (method === "GET") {
    const cached = responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    responseCache.delete(key);
  } else {
    invalidateCache(user);
  }
  const token = await user.getIdToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Device-Session": getDeviceSessionId(),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error_description || data.error || "Request failed");
  if (method === "GET") {
    responseCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  }
  return data;
}

export async function verifyPasskey(user) {
  const options = await request(user, "/v3/users/me/passkeys/verify/options", {
    method: "POST",
    body: "{}",
  });
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const response = await startAuthentication({ optionsJSON: options.publicKey });
  const result = await request(user, "/v3/users/me/passkeys/verify", {
    method: "POST",
    body: JSON.stringify({ challengeId: options.challengeId, response }),
  });
  return result.verificationToken;
}

async function requestWithPasskey(user, path, options = {}) {
  const verificationToken = await verifyPasskey(user);
  return request(user, path, {
    ...options,
    headers: {
      ...options.headers,
      "X-Passkey-Verification": verificationToken,
    },
  });
}

export function registerDeviceSession(user) {
  return request(user, "/v3/users/me/sessions", {
    method: "POST",
    body: JSON.stringify({
      sessionId: getDeviceSessionId(),
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
}

export const getDeviceSessions = (user) =>
  request(user, "/v3/users/me/sessions");

export const getAuthorizationSessions = (user) =>
  request(user, "/v3/users/me/authorization-sessions");

export const revokeAuthorizationSession = (user, sessionId) =>
  requestWithPasskey(
    user,
    `/v3/users/me/authorization-sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );

export const revokeDeviceSession = (user, sessionId) =>
  request(user, `/v3/users/me/sessions/${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
  });

export const revokeOtherDeviceSessions = (user) =>
  request(user, "/v3/users/me/sessions", { method: "DELETE" });

export const getBilling = (user) => request(user, "/v3/users/me/billing");

export const createBilling = (user, billing) =>
  requestWithPasskey(user, "/v3/users/me/billing", {
    method: "POST",
    body: JSON.stringify(billing),
  });

export const updateBilling = (user, billing) =>
  requestWithPasskey(user, "/v3/users/me/billing", {
    method: "PATCH",
    body: JSON.stringify(billing),
  });

export const getPaymentMethods = (user) =>
  request(user, "/v3/users/me/billing/payment-methods");

export const addPaymentMethod = (user, paymentMethod) =>
  requestWithPasskey(user, "/v3/users/me/billing/payment-methods", {
    method: "POST",
    body: JSON.stringify(paymentMethod),
  });

export const removePaymentMethod = (user, paymentMethodId) =>
  requestWithPasskey(
    user,
    `/v3/users/me/billing/payment-methods/${encodeURIComponent(paymentMethodId)}`,
    { method: "DELETE" },
  );

export const getPurchases = (user) =>
  request(user, "/v3/users/me/billing/purchases");

export const getSubscriptions = (user) =>
  request(user, "/v3/users/me/billing/subscriptions");

export const getSubscriptionProducts = (user) =>
  request(user, "/v3/subscription-products");

export const createSubscription = (user, productId, priceId) =>
  requestWithPasskey(user, "/v3/users/me/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({ productId, priceId }),
  });

export const cancelSubscription = (user, subscriptionId) =>
  requestWithPasskey(
    user,
    `/v3/users/me/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { method: "POST", body: "{}" },
  );

export const deletePasskey = (user, credentialId) =>
  requestWithPasskey(
    user,
    `/v3/users/me/passkeys/${encodeURIComponent(credentialId)}`,
    { method: "DELETE" },
  );

export async function createPasskey(user, name = "Passkey") {
  const options = await request(user, "/v3/users/me/passkeys/options", {
    method: "POST",
    body: "{}",
  });

  const { startRegistration } = await import("@simplewebauthn/browser");
  const response = await startRegistration({ optionsJSON: options.publicKey });

  return request(user, "/v3/users/me/passkeys", {
    method: "POST",
    body: JSON.stringify({
      challengeId: options.challengeId,
      name,
      response,
    }),
  });
}

export const getListPasskeys = (user) =>
  request(user, "/v3/users/me/passkeys", { method: "GET" });

async function publicRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error_description || data.error || "Request failed");
  return data;
}

export async function signInWithPasskey() {
  const { startAuthentication } = await import("@simplewebauthn/browser");
  const options = await publicRequest("/v3/passkeys/login/options", {
    method: "POST",
    body: "{}",
  });
  const response = await startAuthentication({ optionsJSON: options.publicKey });
  const result = await publicRequest("/v3/passkeys/login", {
    method: "POST",
    body: JSON.stringify({ challengeId: options.challengeId, response }),
  });
  return result.token;
}
