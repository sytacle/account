# Sytacle Functions — production-oriented v1 API

## Routes
- POST /v1/oauth/authorize
- POST /v1/oauth/token
- POST /v1/oauth/revoke
- GET /v1/oauth/clients/:clientId
- POST /v1/oauth/clients (Firebase admin only)
- GET /v1/oauth/userinfo
- GET /v1/users/me
- PATCH /v1/users/me

Firebase Hosting rewrites /v1/** to the api function. Use a custom Firebase Hosting domain if you want https://api.sytacle.com/v1/oauth/token.

OAuth uses Authorization Code + mandatory PKCE S256, exact redirect URI matching, short-lived single-use authorization codes, hashed opaque tokens, refresh-token rotation, confidential-client secret hashing with scrypt, disabled client checks, no-store responses, and rate limiting.

Before public launch, add OAuth/OIDC conformance tests, centralized audit logs/alerts, backup/retention policy, abuse monitoring, operational key rotation, and a documented incident/revocation process.
