import { useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../config/firebase/auth.js";

const API_BASE = (
  import.meta.env.VITE_ACCOUNT_API_URL ||
  import.meta.env.VITE_OAUTH_API_URL ||
  "https://api.sytacle.com"
).replace(/\/$/, "");

function allowedOrigin(origin) {
  try {
    const url = new URL(origin);
    return url.protocol === "https:" &&
      (url.hostname === "sytacle.com" || url.hostname.endsWith(".sytacle.com"));
  } catch {
    return false;
  }
}

export default function SsoBridge() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetOrigin = params.get("origin");
    const state = params.get("state");
    const mode = params.get("mode");
    if (!window.parent || window.parent === window || !allowedOrigin(targetOrigin) || !state)
      return undefined;

    let sent = false;
    const send = (message) => {
      if (sent) return;
      sent = true;
      window.parent.postMessage({ type: "sytacle:sso:result", state, ...message }, targetOrigin);
    };

    if (mode === "logout") {
      void signOut(auth).finally(() => send({ status: "signed_out" }));
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        send({ status: "signed_out" });
        return;
      }
      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`${API_BASE}/v3/sso/exchange`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id_token: idToken,
            origin: window.location.origin,
            target_origin: targetOrigin,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || typeof data.custom_token !== "string") {
          send({ status: "unavailable" });
          return;
        }
        send({ customToken: data.custom_token });
      } catch {
        send({ status: "unavailable" });
      }
    });
    return unsubscribe;
  }, []);

  return null;
}