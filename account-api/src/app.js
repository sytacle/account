import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authorize } from "./oauth/authorize.js";
import { tokenExchange, revokeToken } from "./oauth/token.js";
import {
  createClient,
  publicClient,
  isOriginRegistered,
} from "./oauth/clients.js";
import { userInfo } from "./oauth/userinfo.js";
import { getProfile, updateProfile } from "./users/profile.js";
import { deletePasskey, listPasskeys, passkeyOptions, registerPasskey } from "./users/passkeys.js";
import { listSessions, revokeOtherSessions, revokeSession, touchSession } from "./users/sessions.js";
import { listAuthorizationSessions, revokeAuthorizationSession } from "./users/authorizationSessions.js";
import {
  addPaymentMethod,
  cancelSubscription,
  getBilling,
  listPaymentMethods,
  listPurchases,
  listSubscriptions,
  removePaymentMethod,
  updateBilling,
} from "./users/billing.js";
import { verifyBearerToken } from "./auth/security.js";
import { oauthError } from "./lib/http.js";
import { config } from "./config.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

// Token + userinfo endpoints: any client registered through
// /v3/oauth/clients should be able to call these from its own registered
// origin — that's the "public, self-service like Google" part — without
// opening them to every origin. This has to run before the general CORS
// check below and can't rely on req.body: a CORS preflight (OPTIONS)
// carries no body, so client_id isn't available yet. isOriginRegistered()
// checks the Origin header against the origins indexed on any enabled
// client instead.
function oauthClientCors(methods) {
  return async (req, res, next) => {
    const origin = req.get("origin");
    if (origin && (config.corsOrigins.has(origin) || (await isOriginRegistered(origin)))) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Vary", "Origin");
      // userinfo needs Authorization for its bearer token; token doesn't
      // use it but sharing one header list here is harmless.
      res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.set("Access-Control-Allow-Methods", methods);
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  };
}

app.use("/v3/oauth/token", oauthClientCors("POST, OPTIONS"));
app.use("/v3/oauth/userinfo", oauthClientCors("GET, OPTIONS"));

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && config.corsOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Device-Session");
    // DELETE was missing here even though passkeys/sessions below expose
    // DELETE routes — any browser call to those would fail preflight.
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  return next();
});

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/v3/oauth", limiter);

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "sytacle-api", version: "v3" }),
);

app.get("/v3/oauth/authorize", authorize);
app.post("/v3/oauth/authorize", authorize);
app.post("/v3/oauth/token", tokenExchange);
app.post("/v3/oauth/revoke", revokeToken);
app.get("/v3/oauth/clients/:clientId", publicClient);
app.post("/v3/oauth/clients", createClient);
app.get("/v3/oauth/userinfo", userInfo);

// Small privileged health check retained from the Firebase version.
app.get("/admin/check", async (req, res) => {
  try {
    await verifyBearerToken(req, true);
    return res.json({ ok: true });
  } catch {
    return res.status(403).json({ error: "forbidden" });
  }
});
app.get("/v3/users/me", getProfile);
app.patch("/v3/users/me", updateProfile);
app.post("/v3/users/me/passkeys/options", passkeyOptions);
app.get("/v3/users/me/passkeys", listPasskeys);
app.post("/v3/users/me/passkeys", registerPasskey);
app.delete("/v3/users/me/passkeys/:credentialId", deletePasskey);
app.get("/v3/users/me/sessions", listSessions);
app.post("/v3/users/me/sessions", touchSession);
app.delete("/v3/users/me/sessions", revokeOtherSessions);
app.delete("/v3/users/me/sessions/:sessionId", revokeSession);
app.get("/v3/users/me/authorization-sessions", listAuthorizationSessions);
app.delete("/v3/users/me/authorization-sessions/:sessionId", revokeAuthorizationSession);
app.get("/v3/users/me/billing", getBilling);
app.patch("/v3/users/me/billing", updateBilling);
app.get("/v3/users/me/billing/payment-methods", listPaymentMethods);
app.post("/v3/users/me/billing/payment-methods", addPaymentMethod);
app.delete("/v3/users/me/billing/payment-methods/:paymentMethodId", removePaymentMethod);
app.get("/v3/users/me/billing/purchases", listPurchases);
app.get("/v3/users/me/billing/subscriptions", listSubscriptions);
app.post("/v3/users/me/billing/subscriptions/:subscriptionId/cancel", cancelSubscription);

app.use((req, res) =>
  oauthError(res, "not_found", `No route for ${req.method} ${req.path}.`, 404),
);

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.statusCode && err?.code) {
    return oauthError(res, err.code, err.message, err.statusCode);
  }
  return oauthError(
    res,
    "internal_server_error",
    "Internal server error.",
    500,
  );
});

export default app;
