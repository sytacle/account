import { Link, useNavigate } from "react-router-dom";
import { KeyRound } from "lucide-react";
import { Card, Row } from "../components/Card";
import { useAuth } from "../context/AuthContext";
import { oauthProviders } from "../data/account";

export function CardTitle({ title, subtitle }) {
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

export function SecurityCard() {
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
          description="Update or add your passkeys"
          value="Not set"
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

export function LinkedCard() {
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

export function SmallCard({ title, text, to }) {
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
