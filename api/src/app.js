import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authorize } from "./oauth/authorize.js";
import { tokenExchange, revokeToken } from "./oauth/token.js";
import { createClient, publicClient } from "./oauth/clients.js";
import { userInfo } from "./oauth/userinfo.js";
import { getProfile, updateProfile } from "./users/profile.js";
import { deletePasskey, listPasskeys, passkeyOptions, registerPasskey } from "./users/passkeys.js";
import { listSessions, revokeOtherSessions, revokeSession, touchSession } from "./users/sessions.js";
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

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && config.corsOrigins.has(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Device-Session");
    res.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
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
