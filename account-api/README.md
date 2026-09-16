# Sytacle API — Vercel + Firebase

Vercel-ready version of the Sytacle production-oriented OAuth API.

## Architecture

- **Vercel Functions** serve the HTTP API from `api/index.js`.
- **Firebase Authentication** remains the identity provider.
- **Firebase Admin SDK** verifies Firebase ID tokens and reads/writes Auth and Firestore.
- **Firestore** stores OAuth clients, authorization codes, access tokens, refresh-token families, and user profiles.

Firebase Auth blocking triggers such as `beforeUserCreated` and `beforeUserSignedIn` are **not Vercel Functions**. If you still need those triggers, deploy them separately with Firebase Cloud Functions. They are intentionally not imported by the Vercel entrypoint.

## Public routes

- `POST /v3/oauth/authorize`
- `POST /v3/oauth/token`
- `POST /v3/oauth/revoke`
- `GET /v3/oauth/clients/:clientId`
- `POST /v3/oauth/clients` (developer or admin role required)
- `GET /v3/oauth/userinfo`
- `GET /v3/users/me`
- `PATCH /v3/users/me`
- `GET|POST|DELETE /v3/users/me/sessions`
- `DELETE /v3/users/me/sessions/:sessionId`
- `GET /v3/users/me/authorization-sessions`
- `DELETE /v3/users/me/authorization-sessions/:sessionId`
- `GET|POST|PATCH /v3/users/me/billing`
- `GET|POST /v3/users/me/billing/payment-methods`
- `DELETE /v3/users/me/billing/payment-methods/:paymentMethodId`
- `GET /v3/users/me/billing/purchases`
- `GET /v3/users/me/billing/subscriptions`
- `POST /v3/users/me/billing/subscriptions/:subscriptionId/cancel`
- `GET /v3/subscription-products`
- `POST /v3/users/me/billing/subscriptions` (developer or admin role only)
- `GET|POST|PATCH /v3/admin/subscription-products...` (admin or `billing_admin` role)
- `GET|PATCH /v3/admin/subscription-configuration` (admin or `billing_admin` role)
- `GET /health`
- `GET /admin/check` (Firebase admin token required)

The `/v3/**` rewrite makes these available without the Vercel `/api` prefix. The underlying Vercel Function remains `api/index.js`.

## Firebase environment variables

Set these in Vercel Project Settings → Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `CORS_ORIGINS` (optional comma-separated allowlist; defaults to the production
  account site and Vite's local development origin)

`FIREBASE_PRIVATE_KEY` may contain literal `\\n` sequences; the application converts them to newlines.

For local development, `GOOGLE_APPLICATION_CREDENTIALS` can also be used with Google Application Default Credentials.

## Deploy

```bash
npm install
npm run lint
npm run dev
```

Then deploy:

```bash
npm run deploy
```

## Example URLs

```text
https://api.sytacle.com/v3/oauth/authorize
https://api.sytacle.com/v3/oauth/token
https://api.sytacle.com/v3/oauth/revoke
https://api.sytacle.com/v3/oauth/userinfo
https://api.sytacle.com/v3/users/me
```

## Security notes

The consent frontend calls the client lookup and authorization endpoints directly.
Configure its `VITE_OAUTH_API_URL` value to this API's origin (for example,
`https://api.sytacle.com`).

The OAuth implementation retains the existing controls: Authorization Code + mandatory PKCE S256, exact redirect URI matching, short-lived single-use authorization codes, hashed opaque tokens, refresh-token rotation, refresh-family revocation, hashed confidential-client secrets, no-store OAuth responses, Helmet security headers, and rate limiting.

The current rate limiter is process-local. For high-scale production traffic, put a distributed limiter/WAF in front of the API.

Before public third-party OAuth launch, add OAuth/OIDC conformance tests, structured audit/security logging, alerting, abuse monitoring, secret rotation, backup/retention policies, and a documented incident/revocation process.

## Device sessions

The Account client assigns each browser installation a random device-session ID and
registers its user agent and last-seen time at `POST /v3/users/me/sessions`.
Sessions can be listed and remotely ended through the protected endpoints above.

Authorization sessions list the enabled OAuth applications with an active
refresh-token family for the signed-in account. OAuth grants are stored per
account and client, so a repeat authorization request for already granted
scopes can be completed without showing consent again.
A revoked session is rejected whenever it presents `X-Device-Session`; deployers
should configure `VITE_ACCOUNT_API_URL` to this API origin.
