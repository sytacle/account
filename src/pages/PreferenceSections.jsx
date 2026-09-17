import { useEffect, useState } from "react";
import { Bell, Cloud, Download, ExternalLink, HelpCircle, LockKeyhole, Trash2 } from "lucide-react";
import { Card, Row } from "../components/Card";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";

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

const staticContent = {
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
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function StorageSection() {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function load() {
    try {
      const { getStorage } = await import("../lib/accountApi.js");
      const result = await getStorage(user);
      setFiles(result.files || []);
      setTotalFiles(result.totalFiles || 0);
      setTotalBytes(result.totalBytes || 0);
    } catch (err) {
      setError(err.message || "Unable to load storage.");
    }
  }

  useEffect(() => { load(); }, [user]);

  async function remove(file) {
    if (!window.confirm(`Delete ${file.name}?`)) return;
    setBusy(file.id); setError("");
    try {
      const { deleteStorageFile } = await import("../lib/accountApi.js");
      await deleteStorageFile(user, file.id);
      await load();
    } catch (err) { setError(err.message || "Unable to delete file."); } finally { setBusy(""); }
  }

  async function download(file) {
    try {
      const { getStorageDownloadUrl } = await import("../lib/accountApi.js");
      const result = await getStorageDownloadUrl(user, file.id);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (err) { setError(err.message || "Unable to download file."); }
  }

  return <div className="max-w-3xl">
    <SectionHeader icon={Cloud} title="Data & storage" subtitle="Manage your files, profile photos, and storage usage." />
    <Card className="mb-5 p-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs text-slate-500 dark:text-slate-400">Account storage</p><p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{formatBytes(totalBytes)}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{totalFiles} {totalFiles === 1 ? "file" : "files"}</p></div><a href="https://cloud.sytacle.com" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"><ExternalLink size={16} />Open Cloud</a></div></Card>
    {error && <FormNotice>{error}</FormNotice>}
    <Card className="divide-y divide-slate-100 overflow-hidden dark:divide-slate-800">{files.length ? files.map((file) => <div key={file.id} className="flex items-center gap-3 px-5 py-4"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{file.name}</p><p className="text-xs text-slate-500 dark:text-slate-400">{formatBytes(file.size)} · {file.provider}</p></div><button type="button" title="Download file" onClick={() => download(file)} className="text-slate-500 hover:text-blue-600"><Download size={17} /></button><button type="button" title="Delete file" onClick={() => remove(file)} disabled={Boolean(busy)} className="text-slate-500 hover:text-rose-600 disabled:opacity-50"><Trash2 size={17} /></button></div>) : <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">No files uploaded yet.</p>}</Card>
  </div>;
}

export default function PreferenceSections({ type }) {
  if (type === "privacy" || type === "notifications") {
    return <TogglesSection kind={type} />;
  }
  if (type === "storage") return <StorageSection />;
  return <StaticSection type={type} />;
}
