# Sytacle API — Vercel + Firebase

Vercel-ready version of the Sytacle production-oriented OAuth API.

## Architecture

- **Vercel Functions** serve the HTTP API from `api/index.js`.
- **Firebase Authentication** remains the identity provider.
- **Firebase Admin SDK** verifies Firebase ID tokens and reads/writes Auth and Firestore.
- **Firestore** stores OAuth clients, authorization codes, access tokens, refresh-token families, and user profiles.

Firebase Auth blocking triggers such as `beforeUserCreated` and `beforeUserSignedIn` are **not Vercel Functions**. If you still need those triggers, deploy them separately with Firebase Cloud Functions. They are intentionally not imported by the Vercel entrypoint.

## Public routes

- `POST /v1/oauth/authorize`
- `POST /v1/oauth/token`
- `POST /v1/oauth/revoke`
- `GET /v1/oauth/clients/:clientId`
- `POST /v1/oauth/clients` (Firebase admin token required)
- `GET /v1/oauth/userinfo`
- `GET /v1/users/me`
- `PATCH /v1/users/me`
- `GET /health`
- `GET /admin/check` (Firebase admin token required)

The `/v1/**` rewrite makes these available without the Vercel `/api` prefix. The underlying Vercel Function remains `api/index.js`.

## Firebase environment variables

Set these in Vercel Project Settings → Environment Variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

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
https://api.sytacle.com/v1/oauth/authorize
https://api.sytacle.com/v1/oauth/token
https://api.sytacle.com/v1/oauth/revoke
https://api.sytacle.com/v1/oauth/userinfo
https://api.sytacle.com/v1/users/me
```

## Security notes

The OAuth implementation retains the existing controls: Authorization Code + mandatory PKCE S256, exact redirect URI matching, short-lived single-use authorization codes, hashed opaque tokens, refresh-token rotation, refresh-family revocation, hashed confidential-client secrets, no-store OAuth responses, Helmet security headers, and rate limiting.

The current rate limiter is process-local. For high-scale production traffic, put a distributed limiter/WAF in front of the API.

Before public third-party OAuth launch, add OAuth/OIDC conformance tests, structured audit/security logging, alerting, abuse monitoring, secret rotation, backup/retention policies, and a documented incident/revocation process.
