export default function Spinner({ label, size = 22 }) {
  return (
    <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
      <span
        className="inline-block animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500"
        style={{ width: size, height: size }}
        role="status"
        aria-label={label || "Loading"}
      />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}
