import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  Cloud,
  CreditCard,
  HelpCircle,
  KeyRound,
  Link2,
  LockKeyhole,
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

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400">
        <Icon size={24} />
      </span>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
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
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mb-5 overflow-hidden">
      <div className="p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Passkeys
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Use your device’s screen lock, fingerprint, or security key to sign
          in. Passkey registration is available when your organization enables
          the WebAuthn service.
        </p>
        <button
          type="button"
          disabled={!window.PublicKeyCredential}
          onClick={async () => {
            setBusy(true);
            setNotice("");
            try {
              const { createPasskey } = await import("../lib/accountApi.js");
              await createPasskey(user);
              setNotice("Passkey added successfully.");
            } catch (err) {
              setNotice(friendlyAuthError(err));
            } finally {
              setBusy(false);
            }
          }}
          className="mt-4 inline-flex h-10 items-center rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add a passkey"}
        </button>
        <Row
          icon={KeyRound}
          title="Chrome Android - Linux 2.3.0"
          description="Added on September 15, 2026 at 7:05 AM UTC+8"
          value="Manage"
          onClick={() => navigate("/account/security/passkeys/cP876ktRE")}
        />
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
      <div className="p-5 space-y-4">
        {error && <FormNotice>{error}</FormNotice>}
        {factors.map((factor) => (
          <div
            key={factor.uid}
            className="flex items-center justify-between text-sm"
          >
            <span>{factor.phoneNumber || factor.displayName || "SMS"}</span>
            <button
              onClick={() => unenrollMfa(factor.uid)}
              className="text-blue-600"
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
              className="h-11 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white"
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
              className="h-11 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white"
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
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
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
                  className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {busy ? <Spinner size={14} /> : "Disconnect"}
                </button>
              ) : (
                <button
                  onClick={() => handleConnect(item.id)}
                  disabled={busy}
                  className="rounded-full border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60 dark:border-blue-900/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
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

// ---------------------------------------------------------------------
// Privacy / Notifications: real toggles, persisted to Firestore
// ---------------------------------------------------------------------
const toggleMeta = {
  privacy: {
    icon: LockKeyhole,
    title: "Privacy",
    subtitle: "Control what information you share and how it is used.",
    fields: [
      ["Profile visibility", "Choose who can see your profile."],
      ["Activity controls", "Manage saved activity and preferences."],
      ["Personalization", "Control personalized recommendations."],
      ["Data sharing", "Review information shared with Sytacle services."],
    ],
  },
  notifications: {
    icon: Bell,
    title: "Notifications",
    subtitle: "Choose what you want to be notified about.",
    fields: [
      ["Project updates", "Comments, mentions, and activity in your projects."],
      ["Community", "Replies, follows, and new members."],
      ["Product updates", "New features, improvements, and announcements."],
      ["Marketing", "Tips, offers, and promotional content."],
    ],
  },
};

function TogglesSection({ kind }) {
  const { profile, updatePrivacyPref, updateNotificationPref } = useAuth();
  const meta = toggleMeta[kind];
  const values =
    (kind === "privacy" ? profile?.privacy : profile?.notifications) || {};
  const update =
    kind === "privacy" ? updatePrivacyPref : updateNotificationPref;
  const [pending, setPending] = useState("");

  async function handleToggle(key) {
    setPending(key);
    try {
      await update(key, !values[key]);
    } finally {
      setPending("");
    }
  }

  return (
    <div className="max-w-3xl">
      <SectionHeader
        icon={meta.icon}
        title={meta.title}
        subtitle={meta.subtitle}
      />
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {meta.fields.map(([title, description]) => (
          <Row
            key={title}
            title={title}
            description={description}
            action={
              <button
                onClick={() => handleToggle(title)}
                disabled={pending === title}
                className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-70 ${values[title] ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"}`}
                aria-pressed={Boolean(values[title])}
                aria-label={title}
              >
                <span
                  className={`absolute top-1 size-4 rounded-full bg-white shadow transition ${values[title] ? "left-6" : "left-1"}`}
                />
              </button>
            }
          />
        ))}
      </Card>
    </div>
  );
}

function DevicesSection() {
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
      <SectionHeader
        icon={MonitorSmartphone}
        title="Devices"
        subtitle="Review and end signed-in device sessions."
      />
      {error && (
        <div className="mb-4">
          <FormNotice>{error}</FormNotice>
        </div>
      )}
      <Card className="overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {sessions.length ? (
          sessions.map((session) => {
            const details = parseUserAgent(session.userAgent);
            const expanded = expandedId === session.id;

            return (
              <div key={session.id} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <MonitorSmartphone
                    size={18}
                    className="mt-1 text-slate-500"
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
                    <div className="mt-3 flex flex-wrap items-center gap-4">
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
                      <dl className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950/60 sm:grid-cols-2">
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
        className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
      >
        {busy === "others" ? "Ending sessions…" : "Sign out other devices"}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------
// Remaining sections stay informational (no backend to make them live)
// ---------------------------------------------------------------------
const staticContent = {
  devices: {
    title: "Devices",
    subtitle: "Devices currently signed in to your account.",
    icon: MonitorSmartphone,
    note: "Sample data shown for illustration — tracking real sessions needs server-side device logging, which this frontend-only build doesn't have.",
    rows: [
      ["This device", "Current session"],
      ["Other sessions", "Not tracked in this build"],
    ],
  },
  payments: {
    title: "Payments",
    subtitle: "Manage payment methods and billing information.",
    icon: CreditCard,
    rows: [
      ["Payment methods", "No payment methods added"],
      ["Billing profile", "Manage billing details"],
      ["Purchase history", "View Sytacle purchases and invoices"],
    ],
  },
  storage: {
    title: "Data & storage",
    subtitle: "Manage your data, storage, and downloads.",
    icon: Cloud,
    rows: [
      ["Storage usage", "2.4 MB of 5 GB used"],
      ["Export your data", "Download a copy of your Sytacle data"],
      ["Delete data", "Permanently remove selected data"],
    ],
  },
  help: {
    title: "Help",
    subtitle: "Get answers and support for your Sytacle account.",
    icon: HelpCircle,
    rows: [
      ["Help center", "Find answers to common questions"],
      ["Contact support", "Talk to a support specialist"],
      ["Send feedback", "Share your thoughts about Sytacle"],
    ],
  },
};

function StaticSection({ type }) {
  const data = staticContent[type];
  return (
    <div className="max-w-3xl">
      <SectionHeader
        icon={data.icon}
        title={data.title}
        subtitle={data.subtitle}
      />
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {data.rows.map(([title, description]) => (
          <Row key={title} title={title} description={description} />
        ))}
      </Card>
      {data.note && (
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          {data.note}
        </p>
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
  if (type === "devices") return <DevicesSection />;
  if (type === "privacy" || type === "notifications")
    return <TogglesSection kind={type} />;

  return <StaticSection type={type} />;
}
