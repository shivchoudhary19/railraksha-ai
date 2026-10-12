# 0002 — Keycloak OIDC and server-held sessions

Accepted, 2026-10-12.

Keycloak owns passwords (Argon2), email verification, reset flows, TOTP, passkeys and assigned roles. The web application uses a confidential client with authorization code, PKCE S256, one-use state and nonce. Direct password grants and implicit grants are disabled. New users receive citizen only; privileged roles require administrator assignment. Operator demo users must enrol TOTP on first login.

The browser receives a random opaque HttpOnly/SameSite=Lax cookie. Access tokens stay in Redis on the server. ID tokens are verified and stored server-side, then supplied directly to the configured identity provider as the standard `id_token_hint` during RP-initiated logout. They are not API bearer tokens. The web and API independently validate issuer, audience, RS256 signature, expiry, verified email and subject. Sessions expire with access tokens; Phase 1 asks users to sign in again instead of implementing refresh-token rotation. Profile and logout mutations require exact Origin plus a constant-time CSRF comparison.

The API permits operator roles only on its workspace endpoint and admin roles only on production documentation. Page hiding is not the authorization boundary. Role grants are read from signed access tokens, never profile input. Redis failures deny application requests. Health probes remain available for diagnosis.

Local HTTP requires `SESSION_COOKIE_SECURE=false`. Production requires HTTPS and Secure cookies. Keycloak's `start-dev` and shared generated demo password must never be exposed publicly. Passkeys use localhost as the local relying-party ID; update it when moving to a real HTTPS domain.

References: [Keycloak hostname/backchannel](https://www.keycloak.org/server/hostname), [passkey configuration](https://github.com/keycloak/keycloak/blob/main/docs/documentation/server_admin/topics/authentication/passkeys.adoc), [Next.js 15 nonce CSP](https://nextjs.org/docs/15/app/guides/content-security-policy).

The web client includes Keycloak's `basic` default scope so access tokens carry the required subject claim. See the [Keycloak 25 migration notes](https://github.com/keycloak/keycloak/blob/main/docs/documentation/upgrading/topics/changes/changes-25_0_0.adoc). CSP permits form redirects only to the app and the configured identity-provider origin; Chrome applies this rule to the logout redirect chain.
