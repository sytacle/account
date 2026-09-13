import {
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
export const randomToken = (n = 48) => randomBytes(n).toString("base64url");
export const sha256 = (v) => createHash("sha256").update(v).digest("base64url");
export const pkce = (v) => sha256(v);
export function hashSecret(s) {
  const salt = randomBytes(16),
    h = scryptSync(s, salt, 64, { N: 16384, r: 8, p: 1 });
  return `${salt.toString("base64url")}.${h.toString("base64url")}`;
}
export function verifySecret(s, e) {
  if (!s || !e) return false;
  try {
    const [a, b] = e.split(".");
    const expected = Buffer.from(b, "base64url");
    const actual = scryptSync(s, Buffer.from(a, "base64url"), expected.length, {
      N: 16384,
      r: 8,
      p: 1,
    });
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}
