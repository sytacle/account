import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authorize } from "./oauth/authorize.js";
import { tokenExchange, revokeToken } from "./oauth/token.js";
import { createClient, publicClient } from "./oauth/clients.js";
import { userInfo } from "./oauth/userinfo.js";
import { getProfile, updateProfile } from "./users/profile.js";
import { verifyBearerToken } from "./auth/security.js";
import { oauthError } from "./lib/http.js";

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: false, limit: "16kb" }));

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/v1/oauth", limiter);

app.get("/health", (_req, res) =>
  res.json({ ok: true, service: "sytacle-api", version: "v1" }),
);

app.post("/v1/oauth/authorize", authorize);
app.post("/v1/oauth/token", tokenExchange);
app.post("/v1/oauth/revoke", revokeToken);
app.get("/v1/oauth/clients/:clientId", publicClient);
app.post("/v1/oauth/clients", createClient);
app.get("/v1/oauth/userinfo", userInfo);
app.get("/v1/users/me", getProfile);
app.patch("/v1/users/me", updateProfile);

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

// Small privileged health check retained from the Firebase version.
app.get("/admin/check", async (req, res) => {
  try {
    await verifyBearerToken(req, true);
    return res.json({ ok: true });
  } catch {
    return res.status(403).json({ error: "forbidden" });
  }
});

export default app;
