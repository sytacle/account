const n = (k, d) => {
  const v = Number.parseInt(process.env[k] || "", 10);
  return Number.isFinite(v) && v > 0 ? v : d;
};

export const config = {
  region: process.env.FUNCTIONS_REGION || "asia-southeast1",
  corsOrigins: new Set(
    (
      process.env.CORS_ORIGINS ||
      "https://my.sytacle.com,https://sytacle.com,https://www.sytacle.com,https://console.cloud.sytacle.com,https://cloud.sytacle.com,http://localhost:5173,http://localhost:3000"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
  sso: {
    origins: new Set(
      (
        process.env.SSO_ALLOWED_ORIGINS ||
        "https://sytacle.com,https://my.sytacle.com,https://www.sytacle.com,http://localhost:3000,http://localhost:5173"
      )
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  },
  oauth: {
    codeTtl: n("OAUTH_CODE_TTL_SECONDS", 300),
    accessTtl: n("OAUTH_ACCESS_TOKEN_TTL_SECONDS", 3600),
    refreshTtl: n("OAUTH_REFRESH_TOKEN_TTL_SECONDS", 2592000),
    scopes: new Set(["openid", "profile", "email", "account"]),
  },
};
