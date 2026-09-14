# Sytacle Account Management

A functional account-management app built with Vite, React 19, Tailwind CSS 4,
Firebase Authentication, and Firestore. Light/dark theme throughout, real
passwordless email-link sign-in (plus Google/GitHub OAuth), and a working profile,
security, and linked-accounts flow.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Firebase project's web config, then follow the
setup checklist at the bottom of `.env.example` to enable Email Link
(passwordless) sign-in, Google and GitHub sign-in, create a Firestore database,
deploy the Firestore rules, and register OAuth clients. Without a real
Firebase project configured, the app will load but every sign-in attempt will
fail.

```bash
npm run dev
```

## What's real vs. illustrative

**Real, backed by Firebase:**
- Passwordless email-link sign-in (including automatic new-account creation)
- "Continue with Google" / "Continue with GitHub" (Firebase OAuth)
- Editable profile (name, phone, birthday — the latter two stored in
  Firestore since Firebase Auth has no field for them)
- Passkey-ready security controls (WebAuthn-capable browsers are detected before enrollment)
- Firebase SMS multi-factor authentication enrollment and removal
- Connect/disconnect Google and GitHub as sign-in methods
- Notification and privacy toggles, persisted per-user in Firestore
- Protected routes — signed-out visitors are redirected to `/account/login`
  and returned to where they were headed after signing in

**Illustrative only** (would need a backend beyond this frontend):
- **Passkey verification** requires a WebAuthn verifier and relying-party configuration in the Account API before credentials can be enrolled.
- **Payments** / **Data & storage** — no billing or storage backend is wired up

## Routes

- `/` — Account management dashboard (requires sign-in)
- `/account/login` — Passwordless sign in / create account
- `/oauth/authorize` — OAuth 2.0 authorization/consent UI (requires sign-in)

### OAuth authorize demo

The consent screen uses the OAuth API for both client lookup and authorization.
Set `VITE_OAUTH_API_URL` to that API's origin (it defaults to
`https://api.sytacle.com`), then open a PKCE authorization request such as:

`/oauth/authorize?client_id=demo-app&redirect_uri=https%3A%2F%2Facme.example%2Fcallback&response_type=code&scope=openid%20profile%20email&state=abc123&code_challenge=<S256_CHALLENGE>&code_challenge_method=S256`

Create and enable `clients/demo-app` first using
[`firebase/clients/demo-app.json`](firebase/clients/demo-app.json). On **Allow**,
the page sends the Firebase ID token and authorization request to the API. The
API verifies the enabled client, registered redirect URI, requested scopes, and
PKCE challenge before returning a single-use authorization code for the browser
to send to the registered `redirect_uri`.

## Production build

```bash
npm run build
npm run preview
```
