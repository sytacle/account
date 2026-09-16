import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "../config/firebase/auth.js";

const HUB_ORIGIN = (
  import.meta.env.VITE_SSO_HUB_ORIGIN || "https://sytacle.com"
).replace(/\/$/, "");
const API_BASE = (
  import.meta.env.VITE_ACCOUNT_API_URL ||
  import.meta.env.VITE_OAUTH_API_URL ||
  "https://api.sytacle.com"
).replace(/\/$/, "");
const REQUEST_TIMEOUT_MS = 2500;

function isRelyingOrigin(origin) {
  try {
    const url = new URL(origin);
    return (
      url.protocol === "https:" &&
      (url.hostname === "sytacle.com" || url.hostname.endsWith(".sytacle.com"))
    );
  } catch {
    return false;
  }
}

export function isSsoHub() {
  return window.location.origin === HUB_ORIGIN;
}

export async function syncSilentSso() {
  const targetOrigin = window.location.origin;
  if (isSsoHub() || !isRelyingOrigin(targetOrigin)) return "ignored";

  const state = crypto.randomUUID();
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.setAttribute("aria-hidden", "true");
  frame.src = `${HUB_ORIGIN}/sso/bridge?origin=${encodeURIComponent(targetOrigin)}&state=${encodeURIComponent(state)}`;

  return new Promise((resolve) => {
    let settled = false;
    const finish = async (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      frame.remove();
      if (result?.customToken) {
        try {
          await signInWithCustomToken(auth, result.customToken);
          resolve("signed_in");
          return;
        } catch {
          await signOut(auth).catch(() => {});
        }
      } else if (result?.status === "signed_out") {
        await signOut(auth).catch(() => {});
      }
      resolve(result?.status || "unavailable");
    };

    const onMessage = (event) => {
      if (
        event.origin !== HUB_ORIGIN ||
        event.source !== frame.contentWindow ||
        event.data?.type !== "sytacle:sso:result" ||
        event.data.state !== state
      )
        return;
      void finish(event.data);
    };

    const timeout = setTimeout(() => void finish({ status: "timeout" }), REQUEST_TIMEOUT_MS);
    window.addEventListener("message", onMessage);
    document.body.append(frame);
  });
}

export async function logoutHub() {
  const targetOrigin = window.location.origin;
  if (isSsoHub() || !isRelyingOrigin(targetOrigin)) return;

  const state = crypto.randomUUID();
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.setAttribute("aria-hidden", "true");
  frame.src = `${HUB_ORIGIN}/sso/bridge?mode=logout&origin=${encodeURIComponent(targetOrigin)}&state=${encodeURIComponent(state)}`;

  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      frame.remove();
      resolve();
    }, REQUEST_TIMEOUT_MS);
    const onMessage = (event) => {
      if (
        event.origin !== HUB_ORIGIN ||
        event.source !== frame.contentWindow ||
        event.data?.type !== "sytacle:sso:result" ||
        event.data.state !== state
      )
        return;
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      frame.remove();
      resolve();
    };
    window.addEventListener("message", onMessage);
    document.body.append(frame);
  });
}

export function startSilentSso() {
  if (isSsoHub()) return () => {};

  let active = true;
  let running = false;
  const run = async () => {
    if (!active || running) return;
    running = true;
    try {
      await syncSilentSso();
    } finally {
      running = false;
    }
  };

  void run();
  const interval = window.setInterval(run, 60_000);
  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") void run();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  return () => {
    active = false;
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}