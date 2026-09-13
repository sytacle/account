import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Grid2X2,
  LogOut,
  Menu,
  Moon,
  Search,
  Sun,
  Monitor,
  UserRound,
} from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";

function initialsFor(name, email) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
  }
  return (email || "?")[0].toUpperCase();
}

export default function Header({ onMenu }) {
  const { theme, setTheme } = useTheme();
  const { user, signOutUser } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const cycleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const ThemeIcon =
    theme === "dark"
      ? Moon
      : theme === "light"
        ? Sun
        : Monitor;

  async function handleSignOut() {
    setMenuOpen(false);
    await signOutUser();
    navigate("/account/login", { replace: true });
  }

  return (
    <header
      className="
        sticky top-0 z-30 flex h-16 items-center
        border-b border-slate-200/80
        bg-white/95 px-4 backdrop-blur
        dark:border-slate-800
        dark:bg-slate-950/95
        md:px-6
      "
    >
      <button
        onClick={onMenu}
        className="
          mr-3 rounded-full p-2
          text-slate-600 hover:bg-slate-100
          dark:text-slate-300 dark:hover:bg-slate-800
          md:hidden
        "
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <div className="md:hidden">
        <Logo compact />
      </div>

      <div className="hidden md:block">
        <Logo />
      </div>

      <div className="mx-auto hidden w-full max-w-xl px-8 lg:block">
        <div
          className="
            flex h-11 items-center gap-3 rounded-full
            bg-slate-100 px-4 text-sm text-slate-500
            focus-within:bg-white
            focus-within:ring-2 focus-within:ring-blue-100
            dark:bg-slate-900
            dark:text-slate-400
            dark:focus-within:bg-slate-900
            dark:focus-within:ring-blue-900/50
          "
        >
          <Search size={18} />

          <input
            className="
              w-full bg-transparent outline-none
              placeholder:text-slate-500
              dark:text-slate-200
              dark:placeholder:text-slate-500
            "
            placeholder="Search Sytacle or settings"
          />

          <kbd
            className="
              rounded border border-slate-200
              bg-white px-1.5 py-0.5
              text-[10px] text-slate-400
              dark:border-slate-700
              dark:bg-slate-800
              dark:text-slate-500
            "
          >
            Ctrl K
          </kbd>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        {/* Theme switcher */}
        <button
          onClick={cycleTheme}
          className="
            rounded-full p-2
            text-slate-600 hover:bg-slate-100
            dark:text-slate-300 dark:hover:bg-slate-800
          "
          aria-label={`Theme: ${theme}. Click to change theme`}
          title={`Theme: ${theme}`}
        >
          <ThemeIcon size={20} />
        </button>

        {/* Apps */}
        <button
          className="
            hidden rounded-full p-2
            text-slate-600 hover:bg-slate-100
            dark:text-slate-300 dark:hover:bg-slate-800
            sm:block
          "
          aria-label="Apps"
        >
          <Grid2X2 size={20} />
        </button>

        {/* Account */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="grid size-9 place-items-center overflow-hidden rounded-full bg-blue-600 text-sm font-semibold text-white"
            aria-label="Account menu"
            aria-expanded={menuOpen}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="size-9 object-cover" />
            ) : (
              initialsFor(user?.displayName, user?.email)
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 z-40 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-lg dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {user?.displayName || "Sytacle user"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={() => { setMenuOpen(false); navigate("/account/"); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <UserRound size={16} /> Manage your account
              </button>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                <LogOut size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
