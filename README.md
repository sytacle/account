# Sytacle Account Management

A functional account-management app built with Vite, React 19, Tailwind CSS 4,
Firebase Authentication, and Firestore. Light/dark theme throughout, real
sign-in (email/password + Google/GitHub OAuth), and a working profile,
security, and linked-accounts flow.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase project's web config, then follow the
setup checklist at the bottom of `.env.example` to turn on Email/Password,
Google, and GitHub sign-in and create a Firestore database. Without a real
Firebase project configured, the app will load but every sign-in attempt will
fail.

```bash
npm run dev
```

## What's real vs. illustrative

**Real, backed by Firebase:**
- Email/password sign-up and sign-in, with email verification
- "Continue with Google" / "Continue with GitHub" (Firebase OAuth)
- Password reset by email
- Editable profile (name, phone, birthday — the latter two stored in
  Firestore since Firebase Auth has no field for them)
- Change password (or set one, for accounts created via Google/GitHub only)
- Connect/disconnect Google and GitHub as sign-in methods
- Notification and privacy toggles, persisted per-user in Firestore
- Protected routes — signed-out visitors are redirected to `/account/login`
  and returned to where they were headed after signing in

**Illustrative only** (would need a backend beyond this frontend):
- The **Devices** tab's session list — real "signed in on these devices"
  tracking needs server-side login/session logging
- "Sign out of all devices" — Firebase's client SDK can only sign out the
  current session; revoking other sessions requires the Admin SDK
- **Payments** / **Data & storage** — no billing or storage backend is wired
  up
- Two-factor authentication status is read from the real Firebase user
  object, but there's no enrollment flow here (SMS-based MFA needs its own
  reCAPTCHA + phone-verification UI)

## Routes

- `/` — Account management dashboard (requires sign-in)
- `/account/login` — Sign in / create account
- `/oauth/authorize` — OAuth 2.0 authorization/consent UI (requires sign-in)

### OAuth authorize demo

`/oauth/authorize?client_id=demo-app&client_name=Acme%20App&redirect_uri=https%3A%2F%2Facme.example%2Fcallback&response_type=code&scope=openid%20profile%20email&state=abc123`

This screen shows the real signed-in Sytacle user and, on **Allow**, redirects
the browser back to `redirect_uri` with a generated `code` (or a token in the
hash, for `response_type=token`) and the original `state` — the same redirect
leg a real authorization server performs. What it still can't do is act as a
real authorization server: there's no backend here to register client apps,
verify `redirect_uri` ownership, or exchange that code for a token, so the
code isn't cryptographically meaningful. Wiring that up for real means adding
a server (e.g. Cloud Functions) that owns client registration and token
issuance.

## Production build

```bash
npm run build
npm run preview
```
