import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";

export default function CustomSelect({ value, onChange, options, placeholder = "Select an option" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);
  const selected = options.find((option) => option.value === value);
  const filtered = options.filter((option) => option.label.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    function close(event) {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    }
    function escape(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function choose(option) {
    onChange(option.value);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(!open)} className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-300 bg-white px-3.5 text-left text-sm outline-none transition hover:border-blue-400 focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <span className={selected ? "truncate" : "truncate text-slate-400 dark:text-slate-500"}>{selected?.label || placeholder}</span>
        <ChevronDown size={17} className={`ml-2 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-2 dark:border-slate-800">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 dark:bg-slate-950">
              <Search size={15} className="shrink-0 text-slate-400" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search options" aria-label="Search options" className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-slate-100" />
            </div>
          </div>
          <div role="listbox" className="max-h-60 overflow-y-auto p-1">
            {filtered.length ? filtered.map((option) => (
              <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option)} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-500/10 dark:hover:text-blue-400">
                <span className="truncate">{option.label}</span>
                {option.value === value && <Check size={16} className="ml-2 shrink-0 text-blue-600 dark:text-blue-400" />}
              </button>
            )) : <p className="px-3 py-3 text-sm text-slate-500">No matches found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
