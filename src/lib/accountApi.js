const API_BASE = (
  import.meta.env.VITE_ACCOUNT_API_URL ||
  import.meta.env.VITE_OAUTH_API_URL ||
  "https://api.sytacle.com"
).replace(/\/$/, "");

const SESSION_KEY = "sytacle.accountSessionId";

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
  return data;
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
  request(
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

export const updateBilling = (user, billing) =>
  request(user, "/v3/users/me/billing", {
    method: "PATCH",
    body: JSON.stringify(billing),
  });

export const getPaymentMethods = (user) =>
  request(user, "/v3/users/me/billing/payment-methods");

export const removePaymentMethod = (user, paymentMethodId) =>
  request(
    user,
    `/v3/users/me/billing/payment-methods/${encodeURIComponent(paymentMethodId)}`,
    { method: "DELETE" },
  );

export const getPurchases = (user) =>
  request(user, "/v3/users/me/billing/purchases");

export const getSubscriptions = (user) =>
  request(user, "/v3/users/me/billing/subscriptions");

export const cancelSubscription = (user, subscriptionId) =>
  request(
    user,
    `/v3/users/me/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    { method: "POST", body: "{}" },
  );

const fromBase64 = (value) =>
  Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );

const toBase64 = (value) =>
  btoa(String.fromCharCode(...new Uint8Array(value)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export async function createPasskey(user) {
  const options = await request(user, "/v3/users/me/passkeys/options", {
    method: "POST",
    body: "{}",
  });

  const credential = await navigator.credentials.create({
    publicKey: {
      ...options.publicKey,
      challenge: fromBase64(options.publicKey.challenge),
      user: {
        ...options.publicKey.user,
        id: fromBase64(options.publicKey.user.id),
      },
    },
  });

  if (!credential?.response?.getPublicKey)
    throw new Error("This browser cannot export a passkey public key.");

  return request(user, "/v3/users/me/passkeys", {
    method: "POST",
    body: JSON.stringify({
      challengeId: options.challengeId,
      id: credential.id,
      rawId: toBase64(credential.rawId),
      clientDataJSON: toBase64(credential.response.clientDataJSON),
      publicKey: toBase64(credential.response.getPublicKey()),
    }),
  });
}

export const getListPasskeys = (user) =>
  request(user, "/v3/users/me/passkeys", { method: "GET" });
