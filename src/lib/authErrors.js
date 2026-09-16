const MESSAGES = {
  "auth/invalid-email": "That email address doesn't look right.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/user-not-found": "No account found with that email.",
  "auth/wrong-password": "Incorrect password. Try again or reset it.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/weak-password": "Use at least 6 characters for your password.",
  "auth/missing-password": "Enter a password.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in popup. Allow popups and try again.",
  "auth/account-exists-with-different-credential":
    "An account already exists with this email using a different sign-in method.",
  "auth/credential-already-in-use": "That account is already linked to a different user.",
  "auth/requires-recent-login": "For security, please sign in again before continuing.",
  "auth/too-many-requests": "Too many attempts. Wait a moment and try again.",
  "auth/network-request-failed": "Network error — check your connection and try again.",
  "auth/multi-factor-auth-required": "Verify your account with a second factor to continue.",
  passkey_required: "A registered passkey is required to continue. Add a passkey in Security first.",
  billing_account_required: "Create your billing account before subscribing.",
};

export function friendlyAuthError(error) {
  const code = error?.code || "";
  return MESSAGES[code] || error?.message || "Something went wrong. Please try again.";
}
