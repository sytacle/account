import { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../components/Card";
import FormNotice from "../components/FormNotice";
import Spinner from "../components/Spinner";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";

const fields = [
  ["displayName", "Full name", "text"],
  ["phone", "Phone number", "tel"],
  ["birthday", "Birthday", "date"],
  ["location", "Location", "text"],
  ["locale", "Language / locale", "text"],
  ["zoneinfo", "Time zone", "text"],
];

export default function EditAccountPage() {
  const { user, profile, saveProfile } = useAuth();
  const [form, setForm] = useState({
    displayName: user?.displayName || "",
    phone: profile?.phone || "",
    birthday: profile?.birthday || "",
    location: profile?.location || "",
    locale: profile?.locale || "",
    zoneinfo: profile?.zoneinfo || profile?.timezone || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveProfile(form);
      setNotice("Account information saved.");
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <Link
        to="/account/"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400"
      >
        <ArrowLeft size={16} /> Back to account
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Edit account
        </h1>
        <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Update your personal information and account metadata.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
          {error && <FormNotice>{error}</FormNotice>}
          {notice && (
            <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {notice}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map(([key, label, type]) => (
              <label key={key}>
                <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  {label}
                </span>
                <input
                  type={type}
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                  className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? <Spinner size={16} /> : "Save changes"}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Passkey verification is required.
            </span>
          </div>
        </form>
      </Card>

      <Card className="mt-5">
        <div className="border-b border-slate-100 px-5 py-5 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">
            Account identity
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Identity data managed by Sytacle and Firebase Authentication.
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          <div className="flex items-center gap-3 px-5 py-4">
            <ShieldCheck size={18} className="text-slate-500" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Email address
              </p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {user?.email || "Not available"}
              </p>
            </div>
            {user?.emailVerified && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={14} /> Verified
              </span>
            )}
          </div>
          <div className="px-5 py-4">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              OAuth sign-in providers
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {user?.providerData?.length
                ? user.providerData
                    .map((provider) => provider.providerId)
                    .join(", ")
                : "No OAuth providers connected"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
