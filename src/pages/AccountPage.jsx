import { lazy, Suspense, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  Mail,
  Phone,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Card, Row } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";
import FormNotice from "../components/FormNotice";

const SecurityCard = lazy(() =>
  import("./AccountCards").then(({ SecurityCard: Component }) => ({
    default: Component,
  })),
);
const LinkedCard = lazy(() =>
  import("./AccountCards").then(({ LinkedCard: Component }) => ({
    default: Component,
  })),
);
const SmallCard = lazy(() =>
  import("./AccountCards").then(({ SmallCard: Component }) => ({
    default: Component,
  })),
);

function initialsFor(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }
  return (email || "?")[0].toUpperCase();
}

function ProfileImageControl({ user }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true); setError("");
    try {
      const { createProfileImageSignature, completeProfileImage } = await import("../lib/accountApi.js");
      const signature = await createProfileImageSignature(user);
      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signature.apiKey);
      body.append("timestamp", String(signature.timestamp));
      body.append("folder", signature.folder);
      body.append("signature", signature.signature);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Profile image upload failed.");
      await completeProfileImage(user, { secureUrl: result.secure_url, publicId: result.public_id, bytes: result.bytes });
      await user.reload();
      window.location.reload();
    } catch (err) { setError(friendlyAuthError(err)); } finally { setBusy(false); }
  }

  return <div className="mt-3"><label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"><Camera size={14} />{busy ? "Uploading..." : "Update profile photo"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={upload} disabled={busy} /></label>{error && <div className="mt-2"><FormNotice>{error}</FormNotice></div>}</div>;
}

function ProfileCard() {
  const { user, profile, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const [verifyNotice, setVerifyNotice] = useState("");

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
              <ProfileImageControl user={user} />
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
            <button
              type="button"
              onClick={() => navigate("/account/edit")}
              className="inline-flex items-center justify-center rounded-full border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 dark:border-blue-900/60 dark:text-blue-400 dark:hover:bg-blue-500/10"
            >
              Edit account
            </button>
          </div>
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

export default function AccountPage() {
  return (
    <div className="space-y-5">
      <ProfileCard />
      <Suspense fallback={<div className="min-h-40" aria-hidden="true" />}>
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
      </Suspense>
    </div>
  );
}
