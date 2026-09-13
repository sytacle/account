const n = (k, d) => {
  const v = Number.parseInt(process.env[k] || "", 10);
  return Number.isFinite(v) && v > 0 ? v : d;
};
export const config = {
  region: process.env.FUNCTIONS_REGION || "asia-southeast1",
  oauth: {
    codeTtl: n("OAUTH_CODE_TTL_SECONDS", 300),
    accessTtl: n("OAUTH_ACCESS_TOKEN_TTL_SECONDS", 3600),
    refreshTtl: n("OAUTH_REFRESH_TOKEN_TTL_SECONDS", 2592000),
    scopes: new Set(["openid", "profile", "email"]),
  },
};
