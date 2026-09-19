import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../config/firebase/auth.js";

import Spinner from "../components/Spinner.jsx";

const API_BASE = (
  import.meta.env.VITE_ACCOUNT_API_URL ||
  import.meta.env.VITE_OAUTH_API_URL ||
  "https://api.account.sytacle.com"
).replace(/\/$/, "");

// The hub's own sign-in page. Adjust if your route differs.
const LOGIN_PATH = import.meta.env.VITE_LOGIN_PATH || "/signin";

// SECURITY: this page hands back an authentication token via redirect, so an
// open redirect here is a real account-takeover risk — anyone could send a
// user through this flow with redirect_uri pointing at an attacker-controlled
// destination and receive their token. Keep this an explicit allow-list of
// exact schemes/origins your apps actually register (e.g. your production
// app scheme, Expo's dev client scheme) — never pattern-match loosely, and
// never skip this check.
const ALLOWED_REDIRECT_PREFIXES = (
  import.meta.env.VITE_SSO_ALLOWED_REDIRECTS || ""
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedRedirect(uri) {
  if (!uri) return false;
  return ALLOWED_REDIRECT_PREFIXES.some((prefix) => uri.startsWith(prefix));
}

export default function SsoLogin() {
  const [status, setStatus] = useState("checking"); // checking | exchanging | error
  const [error, setError] = useState(null);

  const params = new URLSearchParams(window.location.search);
  const redirectUri = params.get("redirect_uri");
  const state = params.get("state");

  useEffect(() => {
    if (!redirectUri || !state) {
      setStatus("error");
      setError("Missing redirect_uri or state.");
      return undefined;
    }
    if (!isAllowedRedirect(redirectUri)) {
      setStatus("error");
      setError("This redirect destination isn't allowed.");
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Not logged in on the hub yet — send them to the real login page,
        // then bounce back here afterwards to finish the handoff.
        // NOTE: this requires LOGIN_PATH to redirect to `next` after a
        // successful sign-in — see the note below.
        const next = encodeURIComponent(window.location.href);
        window.location.replace(`${LOGIN_PATH}?returnTo=${next}`);
        return;
      }

      setStatus("exchanging");
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_BASE}/v3/sso/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_token: idToken,
            origin: window.location.origin,
            // NOTE: SsoBridge passes an https origin here. For a native app,
            // redirectUri is a custom scheme / deep link, not an origin —
            // confirm with your API that it accepts and scopes tokens
            // correctly for this shape, or add a separate param (e.g.
            // client_id) if it needs one.
            target_origin: redirectUri,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || typeof data?.custom_token !== "string") {
          setStatus("error");
          setError("Sign-in couldn't complete. Please try again.");
          return;
        }

        const separator = redirectUri.includes("?") ? "&" : "?";
        const destination =
          `${redirectUri}${separator}token=${encodeURIComponent(data.custom_token)}` +
          `&state=${encodeURIComponent(state)}`;
        window.location.replace(destination);
      } catch {
        setStatus("error");
        setError("Sign-in couldn't complete. Please try again.");
      }
    });

    return unsubscribe;
  }, [redirectUri, state]);

  if (status === "error") {
    return (
      <div style={styles.wrap}>
        <p style={styles.text}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <Spinner label="Signing you in..." size={22} />
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, sans-serif",
  },
  text: { color: "#5B6479", fontSize: 14 },
};
