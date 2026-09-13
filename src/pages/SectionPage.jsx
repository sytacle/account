import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Cloud,
  CreditCard,
  Eye,
  EyeOff,
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
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Security: real password set/change, email verification, MFA status
// ---------------------------------------------------------------------
function PasswordForm() {
  const { user, changePassword, addPassword } = useAuth();
  const hasPassword = user?.providerData?.some((p) => p.providerId === "password");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (next.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (hasPassword) {
        await changePassword(current, next);
        setNotice("Password updated.");
      } else {
        await addPassword(next);
        setNotice("Password set — you can now also sign in with email and password.");
      }
      setCurrent("");
      setNext("");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-5">
      {(error || notice) && <FormNotice tone={error ? "error" : "success"}>{error || notice}</FormNotice>}
      {hasPassword && (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">Current password</label>
          <input
            type={show ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          {hasPassword ? "New password" : "Choose a password"}
        </label>
        <div className="relative mt-1.5">
          <input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500"
          >
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {busy ? <Spinner size={16} /> : hasPassword ? "Update password" : "Set password"}
      </button>
    </form>
  );
}

function SecuritySection() {
  const { user, resendVerificationEmail, signOutUser } = useAuth();
  const navigate = useNavigate();
  const mfaCount = user?.multiFactor?.enrolledFactors?.length || 0;
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
      <SectionHeader icon={ShieldCheck} title="Security" subtitle="Protect your account and control how you sign in." />

      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Password</h3>
        </div>
        <PasswordForm />
      </Card>

      <Card className="mb-5 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        <Row
          icon={Mail}
          title="Email verification"
          description={user?.emailVerified ? "Your email is verified" : "Verify your email to help recover your account"}
          value={user?.emailVerified ? "Verified" : "Pending"}
          onClick={user?.emailVerified ? undefined : handleResend}
          action={!user?.emailVerified && <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Resend</span>}
        />
        <Row
          icon={KeyRound}
          title="Two-factor authentication"
          description={
            mfaCount > 0
              ? "An extra layer of protection is active on this account."
              : "Not enabled. Multi-factor sign-in requires SMS setup that isn't wired up in this build."
          }
          value={mfaCount > 0 ? "Enabled" : "Not enabled"}
        />
      </Card>

      {verifyNotice && <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{verifyNotice}</p>}

      <button
        onClick={handleSignOut}
        disabled={signingOut}
        className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        {signingOut ? <Spinner size={16} /> : <LogOut size={15} />} Sign out of this device
      </button>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Signing out other devices remotely requires a backend that can revoke sessions — not something a
        browser-only app can do on its own.
      </p>
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
      <SectionHeader icon={Link2} title="Linked accounts" subtitle="Connect and manage external sign-in methods." />
      {error && <div className="mb-4"><FormNotice>{error}</FormNotice></div>}
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {oauthProviders.map((item) => {
          const info = user?.providerData?.find((p) => p.providerId === item.id);
          const connected = connectedIds.has(item.id);
          const busy = busyId === item.id;
          return (
            <div key={item.id} className="flex items-center gap-4 px-5 py-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
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
  const values = (kind === "privacy" ? profile?.privacy : profile?.notifications) || {};
  const update = kind === "privacy" ? updatePrivacyPref : updateNotificationPref;
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
      <SectionHeader icon={meta.icon} title={meta.title} subtitle={meta.subtitle} />
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
      ["Storage usage", "2.4 GB of 15 GB used"],
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
      <SectionHeader icon={data.icon} title={data.title} subtitle={data.subtitle} />
      <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">
        {data.rows.map(([title, description]) => (
          <Row key={title} title={title} description={description} />
        ))}
      </Card>
      {data.note && <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">{data.note}</p>}
    </div>
  );
}

export default function SectionPage({ type }) {
  if (type === "security") return <SecuritySection />;
  if (type === "linked") return <LinkedSection />;
  if (type === "privacy" || type === "notifications") return <TogglesSection kind={type} />;
  return <StaticSection type={type} />;
}
