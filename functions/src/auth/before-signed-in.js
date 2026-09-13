import {
  beforeUserSignedIn as trigger,
  HttpsError,
} from "firebase-functions/v2/identity";
import { getEmailDomain, normalizeEmail } from "./security.js";
const blocked = new Set(["example.com"]);
export const beforeUserSignedIn = trigger((e) => {
  const domain = getEmailDomain(normalizeEmail(e.data?.email));
  if (domain && blocked.has(domain))
    throw new HttpsError(
      "permission-denied",
      "This account is not allowed to sign in.",
    );
  return {};
});
