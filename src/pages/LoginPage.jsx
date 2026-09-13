import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Logo from "../components/Logo";
import Spinner from "../components/Spinner";
import FormNotice from "../components/FormNotice";
import { useAuth } from "../context/AuthContext";
import { friendlyAuthError } from "../lib/authErrors";

const GithubMark = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" {...props}>
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12.26c0 5.2 3.29 9.6 7.86 11.16.57.1.79-.25.79-.56 0-.28-.01-1.2-.02-2.18-3.2.72-3.87-1.42-3.87-1.42-.53-1.38-1.29-1.75-1.29-1.75-1.05-.75.08-.73.08-.73 1.17.08 1.78 1.24 1.78 1.24 1.03 1.8 2.71 1.28 3.37.98.1-.76.4-1.28.73-1.58-2.55-.3-5.24-1.33-5.24-5.88 0-1.3.44-2.36 1.16-3.19-.12-.3-.5-1.52.11-3.16 0 0 .95-.31 3.11 1.22a10.6 10.6 0 0 1 5.66 0c2.16-1.53 3.11-1.22 3.11-1.22.61 1.64.23 2.86.11 3.16.72.83 1.16 1.89 1.16 3.19 0 4.56-2.7 5.57-5.26 5.87.41.37.78 1.09.78 2.19 0 1.58-.01 2.86-.01 3.25 0 .31.21.67.8.56A11.7 11.7 0 0 0 23.5 12.26 11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);

const GoogleMark = (props) => (
  <svg viewBox="0 0 24 24" width="18" height="18" {...props}>
    <path fill="#4285F4" d="M23.52 12.27c0-.85-.07-1.48-.22-2.13H12v3.87h6.6c-.13 1.06-.85 2.66-2.45 3.73l-.02.15 3.56 2.76.25.02c2.26-2.09 3.58-5.16 3.58-8.4Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.79-2.93c-1.02.7-2.4 1.19-4.15 1.19a7.2 7.2 0 0 1-6.8-4.96l-.14.01-3.7 2.87-.05.14A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.2 14.4a7.1 7.1 0 0 1-.38-2.4c0-.84.14-1.65.37-2.4L5.18 9.5 1.44 6.6l-.12.06A12 12 0 0 0 0 12c0 1.94.46 3.77 1.32 5.4l3.88-3Z" />
    <path fill="#EA4335" d="M12 4.75c2.26 0 3.78.97 4.65 1.79l3.39-3.31C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.32 6.6l3.87 3A7.2 7.2 0 0 1 12 4.75Z" />
  </svg>
);

export default function LoginPage() {
  const { isAuthenticated, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithGithub, sendReset } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = new URLSearchParams(location.search).get("returnTo") || "/account/";

  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(null); // 'email' | 'google' | 'github' | 'reset' | null
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-white dark:bg-slate-950">
        <Spinner label="Checking your session…" />
      </div>
    );
  }
  if (isAuthenticated) return <Navigate to={returnTo} replace />;

  async function withBusy(key, fn) {
    setError("");
    setNotice("");
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(null);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    withBusy("email", async () => {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name.trim());
        setNotice("Account created — check your inbox to verify your email.");
      } else {
        await signInWithEmail(email, password);
        navigate(returnTo, { replace: true });
      }
    });
  }

  function handleForgotPassword() {
    if (!email) {
      setError("Enter your email above first, then tap \u201cForgot password\u201d.");
      return;
    }
    withBusy("reset", async () => {
      await sendReset(email);
      setNotice("Password reset email sent — check your inbox.");
    });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-100 px-5 dark:border-slate-800 sm:px-8">
        <Logo />
        <span className="text-sm text-slate-500 dark:text-slate-400">Sytacle Account</span>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-107.5">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
              <ShieldCheck size={25} />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {mode === "signup" ? "Create your account" : "Sign in"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {mode === "signup"
                ? "Set up your Sytacle Account to get started."
                : "Use your Sytacle Account to continue."}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
          >
            {(error || notice) && <FormNotice tone={error ? "error" : "success"}>{error || notice}</FormNotice>}

            {mode === "signup" && (
              <div>
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/20"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-2 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/20"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor="password">
                  Password
                </label>
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={busy === "reset"}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-11 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={busy === "email"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {busy === "email" ? (
                <Spinner size={18} />
              ) : (
                <>
                  {mode === "signup" ? "Create account" : "Sign in"} <ArrowRight size={17} />
                </>
              )}
            </button>

            <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
              OR
              <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={busy === "github"}
                onClick={() => withBusy("github", async () => {
                  await signInWithGithub();
                  navigate(returnTo, { replace: true });
                })}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {busy === "github" ? <Spinner size={18} /> : <><GithubMark /> Continue with GitHub</>}
              </button>
              <button
                type="button"
                disabled={busy === "google"}
                onClick={() => withBusy("google", async () => {
                  await signInWithGoogle();
                  navigate(returnTo, { replace: true });
                })}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {busy === "google" ? <Spinner size={18} /> : <><GoogleMark /> Continue with Google</>}
              </button>
            </div>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === "signup" ? (
              <>
                Already have a Sytacle Account?{" "}
                <button
                  onClick={() => { setMode("signin"); setError(""); setNotice(""); }}
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                Don't have a Sytacle Account?{" "}
                <button
                  onClick={() => { setMode("signup"); setError(""); setNotice(""); }}
                  className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Create account
                </button>
              </>
            )}
          </p>
          <p className="mt-8 text-center text-xs leading-5 text-slate-400 dark:text-slate-600">
            By continuing, you agree to the Sytacle Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
