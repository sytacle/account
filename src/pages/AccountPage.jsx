import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle2,
  KeyRound,
  Mail,
  Pencil,
  Phone,
  ShieldAlert,
  UserRound,
  X,
} from "lucide-react";
import { Card, Row } from "../components/Card";
import Spinner from "../components/Spinner";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";
import { oauthProviders } from "../data/account";
import { friendlyAuthError } from "../lib/authErrors";

function initialsFor(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }
  return (email || "?")[0].toUpperCase();
}

function ProfileCard() {
  const { user, profile, saveProfile, resendVerificationEmail } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.displayName || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [birthday, setBirthday] = useState(profile?.birthday || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [verifyNotice, setVerifyNotice] = useState("");

  function startEditing() {
    setName(user?.displayName || "");
    setPhone(profile?.phone || "");
    setBirthday(profile?.birthday || "");
    setError("");
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await saveProfile({
        displayName: name.trim(),
        phone: phone.trim(),
        birthday,
      });
      setEditing(false);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleResend() {
    setVerifyNotice("");
    try {
      await resendVerificationEmail();
      setVerifyNotice("Verification email sent — check your inbox.");
    } catch (err) {
      setVerifyNotice(friendlyAuthError(err));
    }
  }

  return (
    <>
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">
          Sytacle
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          Account
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Manage your information, security, and preferences across Sytacle.
        </p>
      </div>
      <Card className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-blue-600 text-2xl font-semibold text-white">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  className="size-20 object-cover"
                />
              ) : (
                initialsFor(user?.displayName, user?.email)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {user?.displayName || "Add your name"}
              </h2>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                {user?.email}
              </p>
              {user?.emailVerified ? (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <CheckCircle2 size={13} /> Verified
                </span>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                    <ShieldAlert size={13} /> Email not verified
                  </span>
                  <button
                    onClick={handleResend}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    Resend email
                  </button>
                </div>
              )}
              {verifyNotice && (
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {verifyNotice}
                </p>
              )}
            </div>
            {!editing && (
              <button
                onClick={startEditing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
              >
                <Pencil size={15} /> Edit profile
              </button>
            )}
          </div>

          {editing ? (
            <form
              onSubmit={handleSave}
              className="mt-6 space-y-4 border-t border-slate-100 pt-5 dark:border-slate-800"
            >
              {error && <FormNotice>{error}</FormNotice>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Full name
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Phone number
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+63 9XX XXX XXXX"
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Birthday
                  </label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? <Spinner size={16} /> : "Save changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <X size={15} /> Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-6 grid border-t border-slate-100 pt-5 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-4">
              <Info
                icon={UserRound}
                label="Full name"
                value={user?.displayName || "Not set"}
              />
              <Info icon={Mail} label="Email address" value={user?.email} />
              <Info
                icon={Phone}
                label="Phone number"
                value={profile?.phone || "Not set"}
              />
              <Info
                icon={CalendarDays}
                label="Birthday"
                value={profile?.birthday || "Not set"}
              />
            </div>
          )}
        </div>
      </Card>
    </>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex gap-3 border-slate-100 py-2 dark:border-slate-800 sm:border-r sm:px-4 first:pl-0 last:border-0">
      <Icon className="mt-0.5 text-slate-500 dark:text-slate-400" size={17} />
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-1 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}

function SecurityCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mfaCount = user?.multiFactor?.enrolledFactors?.length || 0;

  return (
    <Card>
      <CardTitle
        title="Account security"
        subtitle="Keep your account safe and secure."
      />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        <Row
          icon={KeyRound}
          title="Passkeys"
          description={"Update or add your passkeys"}
          value={"Not set"}
          onClick={() => navigate("/account/security/passkeys")}
        />
        <Row
          title="Two-factor authentication"
          description="An extra layer of protection"
          value={mfaCount > 0 ? "Enabled" : "Not enabled"}
          onClick={() =>
            navigate("/account/security/two-factor-authentication")
          }
        />
        <Row
          title="Email verification"
          description={
            user?.emailVerified
              ? "Your email is verified"
              : "Verify your email to secure recovery"
          }
          value={user?.emailVerified ? "Verified" : "Pending"}
        />
      </div>
      <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
        <Link
          to="/account/security"
          className="text-sm font-medium text-blue-700 dark:text-blue-400"
        >
          Manage security →
        </Link>
      </div>
    </Card>
  );
}

function LinkedCard() {
  const { user } = useAuth();
  const connectedIds = new Set(user?.providerData?.map((p) => p.providerId));

  return (
    <Card>
      <CardTitle
        title="Linked accounts"
        subtitle="Connect your accounts for a better experience."
      />
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {oauthProviders.map((item) => {
          const providerInfo = user?.providerData?.find(
            (p) => p.providerId === item.id,
          );
          const connected = connectedIds.has(item.id);
          return (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3.5">
              <span className="grid size-9 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {item.mark}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {item.name}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {connected
                    ? providerInfo?.email || "Connected"
                    : "Not connected"}
                </p>
              </div>
              {connected ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                  Connected
                </span>
              ) : (
                <Link
                  to="/account/linked"
                  className="rounded-full border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
                >
                  Connect
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CardTitle({ title, subtitle }) {
  return (
    <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {subtitle}
      </p>
    </div>
  );
}

export default function AccountPage() {
  return (
    <div className="space-y-5">
      <ProfileCard />
      <div className="grid gap-5 xl:grid-cols-2">
        <SecurityCard />
        <LinkedCard />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <SmallCard
          title="Privacy & personalization"
          text="Control activity, visibility, and personalization."
          to="/account/privacy"
        />
        <SmallCard
          title="Devices"
          text="Review devices currently signed in to your account."
          to="/account/devices"
        />
        <SmallCard
          title="Help & support"
          text="Find answers or contact the Sytacle support team."
          to="/account/help"
        />
      </div>
    </div>
  );
}

function SmallCard({ title, text, to }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
        {text}
      </p>
      <Link
        to={to}
        className="mt-4 inline-block text-sm font-medium text-blue-700 dark:text-blue-400"
      >
        Manage →
      </Link>
    </Card>
  );
}
