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

The account and billing forms load their country options from REST Countries
v5. Create an API key at [restcountries.com/sign-up](https://restcountries.com/sign-up)
and add it to `.env.local`:

```env
VITE_REST_COUNTRIES_URL=https://api.restcountries.com/countries/v5?response_fields=names.common,codes.alpha_2&limit=300
VITE_REST_COUNTRIES_API_KEY=your_api_key
```

Because Vite exposes `VITE_*` values in the browser, use a client-restricted
key. Keep private API keys behind a server-side proxy instead.

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

**Requires the Account API:**
- **Passkey verification** requires a WebAuthn verifier and relying-party configuration in the Account API before credentials can be enrolled.
- **Payments** — billing accounts, subscriptions, payment methods, and purchase history use the Account API and Firestore.
- **Data & storage** — account files use private Cloudflare R2 objects with short-lived signed upload/download URLs. File metadata and account totals are stored in Firestore.
- **Profile photos** — profile images use signed Cloudinary uploads and are mirrored to Firebase Auth and the Firestore user document.

## Data & storage

The `/account/storage` page supports:

- Uploading files to Cloudflare R2.
- Listing, downloading, and deleting account files.
- Tracking file name, provider, object key, MIME type, size, public URL, and timestamps.
- Showing the total file count and total stored bytes for the account.
- Uploading profile photos to Cloudinary from the account profile card.

Files are private by default. Downloads use short-lived signed URLs. Profile
images are stored as a managed `profile-image` record and are included in the
account storage totals.

The Account API exposes these storage routes:

```text
GET    /v3/users/me/storage
POST   /v3/users/me/storage/upload-url
POST   /v3/users/me/storage/complete
GET    /v3/users/me/storage/:fileId/download
DELETE /v3/users/me/storage/:fileId
POST   /v3/users/me/profile-image/signature
POST   /v3/users/me/profile-image/complete
```

## Account API deployment

Install and run the API from its own directory:

```bash
cd account-api
npm install
npm run lint
npm run deploy
```

Configure these server-side environment variables in Vercel. Never expose the
R2 secret or Cloudinary API secret as `VITE_*` variables.

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

CRON_SECRET=
```

Configure R2 bucket CORS to allow `PUT` requests from each deployed account-app
origin. The upload flow signs the request through the API, uploads directly
from the browser to R2, and then records the verified object metadata in
Firestore at:

```text
users/{uid}/storage/files/items/{fileId}
users/{uid}/storage/summary
```

The profile image metadata uses the fixed `profile-image` file ID. The API
updates the Firebase Auth `photoURL` and the user's Firestore `photoURL` after
Cloudinary confirms the upload.

## Subscription expiration

Vercel runs the subscription expiration job daily at 03:00 UTC through:

```text
GET /v3/cron/subscription-expirations
```

The job synchronizes `subscription`, `subscriptionStartedAt`, and
`subscriptionExpiresAt` between Firebase Auth custom claims and the user's
Firestore document. Free plans renew in 30-day cycles from account creation;
expired paid plans fall back to Free for the next 30-day cycle. Set `CRON_SECRET`
in Vercel so the scheduled route can authenticate its request.

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

## Silent SSO for multiple Sytacle domains

This app supports a lightweight Meta/Google-style silent SSO layer without introducing a new auth system. The pattern is:

- `https://my.sytacle.com` is the session hub.
- `https://sytacle.com` and other `*.sytacle.com` domains act as relying sites.
- The hub owns the browser’s real Firebase Auth session.
- A relying site loads a hidden iframe to the hub, asks it for a short-lived Firebase custom token, then calls `signInWithCustomToken` locally.
- The API verifies the hub Firebase ID token, then mints a custom token bound to the same Firebase user.

This preserves the current Firebase/Auth setup and OAuth provider flow already used by GitHub and Google.

### Architecture

1. User signs in on the hub domain with the existing Firebase Auth flow.
2. A relying domain opens a hidden iframe to `https://my.sytacle.com/sso/bridge?origin=<relying-origin>&state=<random>`.
3. The bridge checks the requesting origin is allowed, reads the current Firebase user, and calls the backend exchange endpoint.
4. The API verifies the Firebase ID token server-side and responds with `{ custom_token }`.
5. The relying domain calls Firebase `signInWithCustomToken(auth, token)`.
6. Logout triggers the hub to sign out and the relying domain clears its Firebase session after the next silent check.

### Security model

- Exact origin allowlisting only: no wildcards, no broad public endpoints.
- `Origin` and `target_origin` must match the allowlist exactly.
- The backend verifies the hub’s Firebase ID token with Admin SDK before minting any custom token.
- The custom token is short-lived and exchanged only in the browser; the hub never exposes the raw refresh token.
- No cookies are required for the silent SSO flow; this avoids the third-party cookie problem.
- CORS is narrow and only allows the exact hub or allowed relying origins.

### Backend endpoint

The API exposes a single silent SSO exchange route:

```http
POST /v3/sso/exchange
Content-Type: application/json
```

Body:

```json
{
  "id_token": "<firebase-id-token>",
  "origin": "https://sytacle.com",
  "target_origin": "https://my.sytacle.com"
}
```

Response:

```json
{
  "custom_token": "<firebase-custom-token>"
}
```

### Environment variables

Set the hub origin and exact allowlist on the deployed API:

```env
SSO_ALLOWED_ORIGINS=https://sytacle.com,https://my.sytacle.com,https://app.sytacle.com
```

Set the hub on the client app:

```env
VITE_SSO_HUB_ORIGIN=https://my.sytacle.com
```

### Browser caveat

This works best when the hub is a top-level first-party site and the relying domains are first-party subdomains. Safari and Firefox may still block or partition third-party iframe behavior, so silent SSO is not universally guaranteed without a user-visible visit to the hub or an explicit fallback login path. The system fails closed: if the hub cannot prove the session, the relying site does not sign the user in.

### Deployment checklist

- Ensure every Sytacle domain is in Firebase Auth authorized domains.
- Add each relying domain and the hub to `SSO_ALLOWED_ORIGINS`.
- Keep all domains on HTTPS.
- Deploy the API and web app together so the hub and relying sites see the same Firebase project.
- Set `VITE_SSO_HUB_ORIGIN` to the hub origin used by the iframe poller.

## Production build

```bash
npm run build
npm run preview
```
