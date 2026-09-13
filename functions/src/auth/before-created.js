import {
  beforeUserCreated as trigger,
  HttpsError,
} from "firebase-functions/v2/identity";
import { getEmailDomain, normalizeEmail } from "./security.js";
const blocked = new Set(["example.com"]);
export const beforeUserCreated = trigger((e) => {
  const domain = getEmailDomain(normalizeEmail(e.data?.email));
  if (domain && blocked.has(domain))
    throw new HttpsError(
      "permission-denied",
      "This email address cannot be used to create a Sytacle account.",
    );
  return {
    displayName: e.data?.displayName?.trim() || "Sytacle User",
    customClaims: {
      role: "user",
      admin: false,
      subscription: "free",
      phoneVerified: false,
    },
  };
});
