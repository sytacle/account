import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function FormNotice({ tone = "error", children }) {
  if (!children) return null;
  const isError = tone === "error";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-2.5 text-sm leading-5 ${
        isError
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      }`}
    >
      {isError ? (
        <AlertCircle size={16} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
