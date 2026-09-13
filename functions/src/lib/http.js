export function send(res, status, body) {
  return res
    .status(status)
    .set("Cache-Control", "no-store")
    .set("Pragma", "no-cache")
    .json(body);
}
export function oauthError(res, error, description, status = 400) {
  const b = { error };
  if (description) b.error_description = description;
  return send(res, status, b);
}
export function scopes(v) {
  return typeof v === "string"
    ? [...new Set(v.trim().split(/\s+/).filter(Boolean))]
    : [];
}
