import { X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navItems } from "../data/account";
import Logo from "./Logo";

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <button
          aria-label="Close menu"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/30 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-950 md:sticky md:top-16 md:z-20 md:h-[calc(100vh-4rem)] md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="mb-6 flex items-center justify-between md:hidden">
          <Logo />
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={20} className="dark:text-slate-300" />
          </button>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <NavLink
              key={id}
              to={`/account/${id === "account" ? "" : id}`}
              end={id === "account"}
              onClick={onClose}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition ${isActive ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400" : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-900"}`
              }
            >
              <Icon size={19} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 hidden rounded-2xl bg-slate-950 p-4 text-white dark:bg-slate-900 dark:ring-1 dark:ring-slate-800 md:block">
          <p className="text-sm font-semibold">Build something great.</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">
            Your Sytacle account keeps everything in one place.
          </p>
          <button className="mt-3 text-xs font-semibold text-blue-300">
            Explore Sytacle →
          </button>
        </div>
      </aside>
    </>
  );
}
