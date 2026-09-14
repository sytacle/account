import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  ShieldCheck,
  X,
} from "lucide-react";
import Logo from "../components/Logo";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";

const scopeLabels = {
  openid: ["Verify your identity", "Use your Sytacle Account to sign you in"],
  profile: ["Basic profile information", "Name, profile photo, and username"],
  email: [
    "Email address",
    "View the email address associated with your account",
  ],
  account: [
    "Account information",
    "Access account preferences and account status",
  ],
};

const oauthApiBaseUrl = (
  import.meta.env.VITE_OAUTH_API_URL || "https://api.sytacle.com"
).replace(/\/+$/, "");

async function oauthRequest(path, options = {}) {
  const response = await fetch(`${oauthApiBaseUrl}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error_description || body.error || "OAuth request failed.");
  }
  return body;
}

function normalizeClient(data) {
  return {
    id: data.client_id,
    name: data.client_name,
    description: data.description || "",
    logoUrl: data.logo_url || undefined,
    privacy: data.privacy || null,
    redirectUris: data.redirect_uris,
    scopes: data.allowed_scopes,
  };
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidClient(data, redirectUri) {
  if (
    !data ||
    typeof data.id !== "string" ||
    typeof data.name !== "string" ||
    !data.name.trim() ||
    !Array.isArray(data.redirectUris) ||
    !Array.isArray(data.scopes)
  )
    return false;
  if (
    typeof data.description !== "string" ||
    (data.logoUrl !== undefined && !isHttpUrl(data.logoUrl)) ||
    !isHttpUrl(redirectUri)
  )
    return false;
  return data.redirectUris.includes(redirectUri);
}

function InvalidClient() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-16 items-center border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        <Logo />
      </header>
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-slate-900">
          <AlertTriangle
            className="mx-auto text-red-600 dark:text-red-400"
            size={28}
          />
          <h1 className="mt-4 text-xl font-semibold">Invalid client</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            This authorization request is invalid, unavailable, or could not be
            verified. Return to the application and try again.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function AuthorizePage() {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState("");
  const [requestError, setRequestError] = useState("");
  const [client, setClient] = useState(null);
  const [clientState, setClientState] = useState("loading");
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const clientId = params.get("client_id") || "";
  const redirectUri = params.get("redirect_uri") || "";
  const responseType = params.get("response_type") || "code";
  const state = params.get("state") || "";
  const codeChallenge = params.get("code_challenge") || "";
  const codeChallengeMethod = params.get("code_challenge_method") || "";
  const requestedScopes = (params.get("scope") || "openid profile email")
    .split(/\s+/)
    .filter(Boolean);
  const scopes = requestedScopes.filter((scope) => scopeLabels[scope]);

  useEffect(() => {
    let active = true;
    async function loadClient() {
      if (
        !clientId ||
        clientId.includes("/") ||
        !redirectUri ||
        responseType !== "code" ||
        !codeChallenge ||
        codeChallengeMethod !== "S256"
      ) {
        setClientState("invalid");
        return;
      }
      try {
        const data = normalizeClient(
          await oauthRequest(`/v3/oauth/clients/${encodeURIComponent(clientId)}`),
        );
        if (!active) return;
        if (!isValidClient(data, redirectUri)) {
          setClientState("invalid");
          return;
        }
        setClient(data);
        setClientState("ready");
      } catch {
        if (active) setClientState("invalid");
      }
    }
    loadClient();
    return () => {
      active = false;
    };
  }, [clientId, redirectUri]);

  async function handleChange() {
    await signOutUser();
    const returnTo = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    navigate(`/account/login?returnTo=${returnTo}`, { replace: true });
  }
  function redirectWith(paramsToAdd, fragment = false) {
    const url = new URL(redirectUri);
    if (fragment) url.hash = new URLSearchParams(paramsToAdd).toString();
    else
      Object.entries(paramsToAdd).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      );
    window.location.assign(url.toString());
  }
  async function handleAllow() {
    setBusy("allow");
    setRequestError("");
    try {
      const idToken = await user.getIdToken();
      const response = await oauthRequest("/v3/oauth/authorize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: responseType,
          scope: requestedScopes.join(" "),
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          ...(state && { state }),
        }),
      });
      redirectWith({
        code: response.code,
        ...(response.state && { state: response.state }),
      });
    } catch (error) {
      setRequestError(error.message || "Authorization could not be completed.");
      setBusy("");
    }
  }
  function handleCancel() {
    setBusy("cancel");
    redirectWith({ error: "access_denied", ...(state && { state }) });
  }

  if (clientState === "loading")
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Validating application…" />
      </div>
    );
  if (clientState === "invalid") return <InvalidClient />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        <Logo />
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck size={16} /> Secure authorization
        </div>
      </header>
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-140">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-6 py-7 dark:border-slate-800 sm:px-8">
              <div className="flex items-center gap-4">
                {client.logoUrl ? (
                  <img
                    src={client.logoUrl}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-xl font-semibold text-white">
                    {client.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    OAuth 2.0
                  </p>
                  <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                    Authorize {client.name}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {client.description}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-6 sm:px-8">
              <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950/60">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-blue-600 dark:text-blue-400">
                    <ShieldCheck size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Signed in as {user?.displayName || user?.email}
                    </p>
                    {user?.displayName && (
                      <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleChange}
                    className="ml-auto shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Change
                  </button>
                </div>
              </div>
              <h2 className="mt-7 text-sm font-semibold text-slate-900 dark:text-slate-100">
                This application will be able to:
              </h2>
              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {scopes.length ? (
                  scopes.map((scope) => (
                    <div key={scope} className="flex items-center gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <Check size={17} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {scopeLabels[scope][0]}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {scopeLabels[scope][1]}
                        </p>
                      </div>
                      <ChevronRight
                        size={16}
                        className="ml-auto shrink-0 text-slate-300 dark:text-slate-600"
                      />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                    No additional permissions were requested.
                  </div>
                )}
              </div>
              <div className="mt-5 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-500/10">
                <AlertTriangle
                  size={18}
                  className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
                />
                <p className="text-xs leading-5 text-amber-800 dark:text-amber-300">
                  Only authorize applications you trust. Sytacle will never
                  share your password with this application.
                </p>
              </div>
              {requestError && (
                <p
                  className="mt-5 text-sm text-red-600 dark:text-red-400"
                  role="alert"
                >
                  {requestError}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={Boolean(busy)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {busy === "cancel" ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <X size={17} /> Cancel
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleAllow}
                  disabled={Boolean(busy)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {busy === "allow" ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      <Check size={17} /> Allow
                    </>
                  )}
                </button>
              </div>
              <div className="mt-6 border-t border-slate-100 pt-5 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
                {(client.privacy?.policyUrl || client.privacy?.termsUrl) && (
                  <p>
                    {client.privacy?.policyUrl && (
                      <a
                        href={client.privacy.policyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-600"
                      >
                        Privacy policy
                      </a>
                    )}
                    {client.privacy?.policyUrl && client.privacy?.termsUrl
                      ? " · "
                      : ""}
                    {client.privacy?.termsUrl && (
                      <a
                        href={client.privacy.termsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-600"
                      >
                        Terms of service
                      </a>
                    )}
                  </p>
                )}
                <p className="mt-3">Requesting application ID</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {clientId}
                </p>
                <p className="mt-3">Redirect URI</p>
                <p className="mt-1 break-all font-mono text-[11px] text-slate-500 dark:text-slate-400">
                  {redirectUri}
                </p>
                <p className="mt-3">
                  Response type:{" "}
                  <span className="font-mono">{responseType}</span>
                </p>
              </div>
            </div>
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400 dark:text-slate-600">
            Sytacle OAuth authorization · Review permissions before continuing
          </p>
        </div>
      </main>
    </div>
  );
}
