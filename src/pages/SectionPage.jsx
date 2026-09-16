import { lazy, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  AppWindow,
  KeyRound,
  Link2,
  LogOut,
  Mail,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { Card, Row } from "../components/Card";
import Spinner from "../components/Spinner";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";
import { oauthProviders } from "../data/account";
import { friendlyAuthError } from "../lib/authErrors";
const PaymentsSection = lazy(() => import("./PaymentsSection"));
const PreferenceSections = lazy(() => import("./PreferenceSections"));

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 flex items-start gap-3 sm:gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:size-12">
        <Icon size={22} className="sm:hidden" />
        <Icon size={24} className="hidden sm:block" />
      </span>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-2xl">
          {title}
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Security: passkeys, email verification, and Firebase SMS MFA
// ---------------------------------------------------------------------
function PasskeysCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [passkeys, setPasskeys] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [loadingPasskeys, setLoadingPasskeys] = useState(true);
  const supportsPasskeys =
    typeof window !== "undefined" && Boolean(window.PublicKeyCredential);

  async function loadPasskeys() {
    try {
      const { getListPasskeys } = await import("../lib/accountApi.js");
      const result = await getListPasskeys(user);
      setPasskeys(result.passkeys || []);
    } catch (err) {
      setLoadError(friendlyAuthError(err));
    } finally {
      setLoadingPasskeys(false);
    }
  }

  useEffect(() => {
    loadPasskeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Passkeys
        </h3>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Use your device’s screen lock, fingerprint, or security key to sign
          in. Passkey registration is available when your organization enables
          the WebAuthn service.
        </p>
        <button
          type="button"
          disabled={!supportsPasskeys || busy}
          onClick={async () => {
            setBusy(true);
            setNotice("");
            try {
              const { createPasskey } = await import("../lib/accountApi.js");
              await createPasskey(user);
              setNotice("Passkey added successfully.");
              await loadPasskeys();
            } catch (err) {
              setNotice(friendlyAuthError(err));
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
        >
          {busy ? "Adding…" : "Add a passkey"}
        </button>

        {loadError && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">
            {loadError}
          </p>
        )}

        {loadingPasskeys ? (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Spinner size={14} />
            Loading passkeys…
          </div>
        ) : passkeys.length > 0 ? (
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {passkeys.map((key) => (
              <Row
                key={key.id}
                icon={KeyRound}
                title={key.id}
                description={
                  "Added on " +
                  new Date(key.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                }
                value="Manage"
                onClick={() => navigate(`/account/security/passkeys/${key.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            No passkeys added yet.
          </p>
        )}

        {notice && (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {notice}
          </p>
        )}
      </div>
    </Card>
  );
}

function MfaCard() {
  const { user, enrollSmsMfa, confirmSmsMfa, unenrollMfa } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [flow, setFlow] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const factors = user?.multiFactor?.enrolledFactors || [];

  async function sendCode(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setFlow(await enrollSmsMfa(phone));
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }
  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await confirmSmsMfa(flow.verificationId, code, flow.verifier);
      setFlow(null);
      setCode("");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Two-factor authentication
        </h3>
      </div>
      <div className="space-y-4 p-5">
        {error && <FormNotice>{error}</FormNotice>}
        {factors.map((factor) => (
          <div
            key={factor.uid}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="min-w-0 truncate">
              {factor.phoneNumber || factor.displayName || "SMS"}
            </span>
            <button
              onClick={() => unenrollMfa(factor.uid)}
              className="shrink-0 text-blue-600"
            >
              Remove
            </button>
          </div>
        ))}
        {!flow ? (
          <form onSubmit={sendCode} className="flex flex-col gap-3 sm:flex-row">
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 555 5555"
              className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              disabled={busy}
              className="h-11 shrink-0 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Spinner size={16} /> : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="flex flex-col gap-3 sm:flex-row">
            <input
              required
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Verification code"
              className="h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 text-sm dark:border-slate-700 dark:bg-slate-950"
            />
            <button
              disabled={busy}
              className="h-11 shrink-0 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? <Spinner size={16} /> : "Verify and enable"}
            </button>
          </form>
        )}
        <div id="mfa-recaptcha" />
      </div>
    </Card>
  );
}

function SecurityBackLink() {
  return (
    <Link
      to="/account/security"
      className="mb-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    >
      ← Back to security
    </Link>
  );
}

function SecuritySection() {
  const { user, resendVerificationEmail, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [verifyNotice, setVerifyNotice] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  async function handleResend() {
    try {
      await resendVerificationEmail();
      setVerifyNotice("Verification email sent — check your inbox.");
    } catch (err) {
      setVerifyNotice(friendlyAuthError(err));
    }
  }
  async function handleSignOut() {
    setSigningOut(true);
    await signOutUser();
    navigate("/account/login", { replace: true });
  }

  return (
    <div className="max-w-3xl">
      <SectionHeader
        icon={ShieldCheck}
        title="Security"
        subtitle="Protect your account and control how you sign in."
      />
      <Card className="mb-5 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        <Row
          icon={KeyRound}
          title="Passkeys"
          description="Set up passkeys for faster, passwordless sign-in."
          value="Manage"
          onClick={() => navigate("/account/security/passkeys")}
        />
        <Row
          icon={ShieldCheck}
          title="Two-factor authentication"
          description="Add an extra verification step to secure your account."
          value={
            user?.multiFactor?.enrolledFactors?.length
              ? "Enabled"
              : "Not enabled"
          }
          onClick={() =>
            navigate("/account/security/two-factor-authentication")
          }
        />
        <Row
          icon={Mail}
          title="Email verification"
          description={
            user?.emailVerified
              ? "Your email is verified"
              : "Verify your email to help recover your account"
          }
          value={user?.emailVerified ? "Verified" : "Pending"}
          onClick={user?.emailVerified ? undefined : handleResend}
          action={
            !user?.emailVerified && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Resend
              </span>
            )
          }
        />
      </Card>
      {verifyNotice && (
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">
          {verifyNotice}
        </p>
      )}
      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
      >
        {signingOut ? <Spinner size={16} /> : <LogOut size={15} />} Sign out of
        this device
      </button>
    </div>
  );
}

function PasskeysSection() {
  return (
    <div className="max-w-3xl">
      <SecurityBackLink />
      <SectionHeader
        icon={KeyRound}
        title="Passkeys"
        subtitle="Add a passkey to sign in with your device, fingerprint, or security key."
      />
      <PasskeysCard />
    </div>
  );
}

function TwoFactorAuthenticationSection() {
  return (
    <div className="max-w-3xl">
      <SecurityBackLink />
      <SectionHeader
        icon={ShieldCheck}
        title="Two-factor authentication"
        subtitle="Set up SMS verification to add an extra layer of account protection."
      />
      <MfaCard />
    </div>
  );
}

// ---------------------------------------------------------------------
// Linked accounts: real connect/disconnect via Firebase provider linking
// ---------------------------------------------------------------------
function LinkedSection() {
  const { user, linkGoogle, linkGithub, unlinkProvider } = useAuth();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const connectedIds = new Set(user?.providerData?.map((p) => p.providerId));

  async function handleConnect(id) {
    setError("");
    setBusyId(id);
    try {
      if (id === "google.com") await linkGoogle();
      if (id === "github.com") await linkGithub();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusyId("");
    }
  }

  async function handleDisconnect(id) {
    setError("");
    setBusyId(id);
    try {
      await unlinkProvider(id);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="max-w-3xl">
      <SectionHeader
        icon={Link2}
        title="Linked accounts"
        subtitle="Connect and manage external sign-in methods."
      />
      {error && (
        <div className="mb-4">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {oauthProviders.map((item) => {
          const info = user?.providerData?.find(
            (p) => p.providerId === item.id,
          );
          const connected = connectedIds.has(item.id);
          const busy = busyId === item.id;
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {connected ? info?.email || "Connected" : "Not connected"}
                </p>
              </div>
              {connected ? (
                <button
                  onClick={() => handleDisconnect(item.id)}
                  disabled={busy}
                  className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {busy ? <Spinner size={14} /> : "Disconnect"}
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(item.id)}
                  disabled={busy}
                  className="shrink-0 rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  {busy ? <Spinner size={14} /> : "Connect"}
                </button>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function DevicesSection({ embedded = false }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [expandedId, setExpandedId] = useState("");

  function formatDateTime(value) {
    if (!value) return "Not available";
    return new Date(value).toLocaleString();
  }

  function parseUserAgent(userAgent) {
    const value = userAgent || "";
    const browser = /edg\//i.test(value)
      ? "Microsoft Edge"
      : /chrome\//i.test(value) && !/edg\//i.test(value)
        ? "Google Chrome"
        : /firefox\//i.test(value)
          ? "Mozilla Firefox"
          : /safari\//i.test(value) && !/chrome\//i.test(value)
            ? "Safari"
            : /opr\//i.test(value)
              ? "Opera"
              : "Unknown browser";
    const os = /windows nt 10/i.test(value)
      ? "Windows 10/11"
      : /windows nt/i.test(value)
        ? "Windows"
        : /android/i.test(value)
          ? "Android"
          : /iphone|ipad|ipod/i.test(value)
            ? "iOS"
            : /mac os x/i.test(value)
              ? "macOS"
              : /linux/i.test(value)
                ? "Linux"
                : "Unknown OS";
    const device = /mobile|iphone|android/i.test(value)
      ? "Mobile device"
      : /ipad|tablet/i.test(value)
        ? "Tablet"
        : "Desktop browser";

    return { browser, os, device };
  }

  function sessionTitle(session) {
    if (session.current) return "This device";
    const details = parseUserAgent(session.userAgent);
    return `${details.browser} on ${details.os}`;
  }

  async function load() {
    try {
      const { getDeviceSessions } = await import("../lib/accountApi.js");
      const result = await getDeviceSessions(user);
      setSessions(result.sessions);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function revoke(id) {
    setBusy(id);
    try {
      const { revokeDeviceSession } = await import("../lib/accountApi.js");
      await revokeDeviceSession(user, id);
      await load();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }
  async function revokeOthers() {
    setBusy("others");
    try {
      const { revokeOtherDeviceSessions } =
        await import("../lib/accountApi.js");
      await revokeOtherDeviceSessions(user);
      await load();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="max-w-3xl">
      {!embedded && (
        <SectionHeader
          icon={MonitorSmartphone}
          title="Sessions"
          subtitle="Review signed-in devices and authorized applications."
        />
      )}
      {error && (
        <div className="mb-4">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {sessions.length ? (
          sessions.map((session) => {
            const details = parseUserAgent(session.userAgent);
            const expanded = expandedId === session.id;

            return (
              <div key={session.id} className="px-4 py-4 sm:px-5">
                <div className="flex items-start gap-3 sm:gap-4">
                  <MonitorSmartphone
                    size={18}
                    className="mt-1 shrink-0 text-slate-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {sessionTitle(session)}
                      </p>
                      {session.current && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                          Current
                        </span>
                      )}
                      {session.revokedAt && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Revoked
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {session.current
                        ? "Current session on this device"
                        : `Last active ${formatDateTime(session.lastSeenAt)}`}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(expanded ? "" : session.id)
                        }
                        className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {expanded ? "Hide details" : "View details"}
                      </button>
                      {!session.current && (
                        <button
                          onClick={() => revoke(session.id)}
                          disabled={busy === session.id}
                          className="text-xs font-medium text-blue-600 disabled:opacity-60"
                        >
                          {busy === session.id ? "Ending…" : "Sign out"}
                        </button>
                      )}
                    </div>
                    {expanded && (
                      <dl className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950/60 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Browser
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {details.browser}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Operating system
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {details.os}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Device type
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {details.device}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Time zone
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {session.timezone || "Not available"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            First seen
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {formatDateTime(session.createdAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Last active
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {formatDateTime(session.lastSeenAt)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Session status
                          </dt>
                          <dd className="mt-1 text-slate-900 dark:text-slate-100">
                            {session.revokedAt
                              ? `Revoked on ${formatDateTime(session.revokedAt)}`
                              : session.current
                                ? "Active on this device"
                                : "Active"}
                          </dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Session ID
                          </dt>
                          <dd className="mt-1 break-all font-mono text-xs text-slate-700 dark:text-slate-300">
                            {session.id}
                          </dd>
                        </div>
                      </dl>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="px-5 py-4 text-sm text-slate-500">
            No device sessions found yet.
          </div>
        )}
      </Card>
      <button
        onClick={revokeOthers}
        disabled={busy === "others"}
        className="mt-4 w-full rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 sm:w-auto"
      >
        {busy === "others" ? "Ending sessions…" : "Sign out other devices"}
      </button>
    </div>
  );
}

function AuthorizedApplicationsSection({ embedded = false }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const { getAuthorizationSessions } = await import(
        "../lib/accountApi.js"
      );
      const result = await getAuthorizationSessions(user);
      setSessions(result.sessions || []);
    } catch (err) {
      setError(friendlyAuthError(err));
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function revoke(sessionId) {
    setBusy(sessionId);
    setError("");
    try {
      const { revokeAuthorizationSession } = await import(
        "../lib/accountApi.js"
      );
      await revokeAuthorizationSession(user, sessionId);
      const revokedSession = sessions.find((session) => session.id === sessionId);
      setSessions((current) =>
        current.filter(
          (session) => session.clientId !== revokedSession?.clientId,
        ),
      );
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="max-w-3xl">
      {!embedded && (
        <SectionHeader
          icon={AppWindow}
          title="Sessions"
          subtitle="Review signed-in devices and authorized applications."
        />
      )}
      {error && (
        <div className="mb-4">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {sessions.length ? (
          sessions.map((session) => (
            <div key={session.id} className="flex items-center gap-3 px-5 py-4">
              {session.logoUrl ? (
                <img
                  src={session.logoUrl}
                  alt=""
                  className="size-10 rounded-xl object-cover"
                />
              ) : (
                <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
                  <AppWindow size={18} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {session.clientName}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Signed in · {session.scope.join(", ") || "No scopes"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => revoke(session.id)}
                disabled={busy === session.id}
                className="shrink-0 text-xs font-medium text-rose-600 hover:text-rose-700 disabled:opacity-60 dark:text-rose-400 dark:hover:text-rose-300"
              >
                {busy === session.id ? "Revoking..." : "Revoke"}
              </button>
            </div>
          ))
        ) : (
          <p className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400">
            No applications are authorized for your account.
          </p>
        )}
      </Card>
    </div>
  );
}

function SessionsSection() {
  const [tab, setTab] = useState("devices");

  return (
    <div className="max-w-3xl">
      <SectionHeader
        icon={MonitorSmartphone}
        title="Sessions"
        subtitle="Review signed-in devices and authorized applications."
      />
      <div className="mb-5 flex gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-900">
        {[
          ["devices", "Devices"],
          ["applications", "Applications"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${tab === id ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            aria-pressed={tab === id}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "devices" ? (
        <DevicesSection embedded />
      ) : (
        <AuthorizedApplicationsSection embedded />
      )}
    </div>
  );
}

export default function SectionPage({ type }) {
  const location = useLocation();
  const securityView = location.pathname.split("/")[3] || "";

  if (type === "security" && securityView === "passkeys") {
    return <PasskeysSection />;
  }
  if (type === "security" && securityView === "two-factor-authentication") {
    return <TwoFactorAuthenticationSection />;
  }
  if (type === "security") return <SecuritySection />;
  if (type === "linked") return <LinkedSection />;
  if (type === "devices" || type === "sessions") return <SessionsSection />;
  if (type === "payments") return <PaymentsSection />;
  if (type === "privacy" || type === "notifications" || type === "storage" || type === "help")
    return <PreferenceSections type={type} />;

  return <PreferenceSections type={type} />;
}
