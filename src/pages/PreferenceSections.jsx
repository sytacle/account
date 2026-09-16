import { useState } from "react";
import { Bell, Cloud, HelpCircle, LockKeyhole } from "lucide-react";
import { Card, Row } from "../components/Card";
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

export default function PreferenceSections({ type }) {
  if (type === "privacy" || type === "notifications") {
    return <TogglesSection kind={type} />;
  }
  return <StaticSection type={type} />;
}
