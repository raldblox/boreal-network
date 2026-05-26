# 0017 Regular account auth and WebAuthn MFA

## Status

Accepted

## Date

2026-05-23

## Context

`apps/web` currently uses:

- `Auth.js`
- one regular credentials path keyed by email plus password
- one guest path

That baseline is enough for early scaffold work, but it is too weak and too narrow for Boreal's longer-lived account model.

The next regular-account step should:

- support a stable human-readable login handle
- keep password login familiar
- add stronger second-factor security
- preserve guest mode
- preserve the hard split between account auth and resolver or runtime auth

The repo also needs one explicit naming boundary:

- passkeys and security keys are `WebAuthn`
- `Google Authenticator` is `TOTP`
- they are not the same factor type

## Decision

### 1. Keep `Auth.js` as the account-auth baseline

`Auth.js` remains the web account-auth baseline in `apps/web`.

This decision does not replace it with a separate hosted auth stack.

### 2. Regular accounts should authenticate with `username or email + password`

The accepted regular-account login surface is:

- `username or email`
- `password`

Email remains important for contact and recovery.
Username becomes the preferred human-facing account handle.

### 3. Strong second factor should use `WebAuthn` passkeys first

The accepted stronger auth path is:

- password first
- then `WebAuthn` second factor when the account is enrolled

Supported WebAuthn authenticators may include:

- platform passkeys such as `Face ID`, `Touch ID`, or `Windows Hello`
- roaming security keys such as `YubiKey`

This is the first stronger regular-account path.

### 4. Treat passkeys and TOTP as separate lanes

`WebAuthn` and `TOTP` must not be modeled as the same thing.

For Boreal's first stronger account-auth path:

- `WebAuthn` passkeys are accepted now
- `TOTP` apps such as `Google Authenticator` remain a later fallback option
- recovery codes remain a later fallback option

### 5. Keep resolver and runtime identity separate from account auth

This decision does not change the accepted identity split:

- account auth proves Boreal user identity in web
- resolver auth binds one runtime to one Boreal account with scoped runtime permissions
- runtime or device identity is not Boreal account identity by itself

### 6. Support password-first and enrolled passkey-first login

The accepted rollout order is:

1. `username or email + password`
2. `WebAuthn` MFA enrollment and challenge
3. optional `passkey-first` sign-in for accounts with enrolled discoverable credentials
4. optional later `TOTP` and recovery-code fallback

Passkey-first login should not remove password fallback until recovery is strong enough.

Email remains required while recovery codes or another account recovery path are not yet available. Email may become optional only after a non-email recovery path exists.

## Consequences

### Accepted

- Boreal gets a familiar account path without collapsing into email-only identity
- passkeys become the preferred stronger factor without forcing passwordless login on day one
- enrolled accounts can use a familiar passwordless passkey button while password remains the fallback
- `YubiKey` and device passkeys can share one `WebAuthn` factor lane
- future authenticator-app support can be added without polluting the passkey model
- resolver auth remains cleanly separate from account auth

### Rejected

- treating desktop or resolver approval as a replacement for Boreal account auth
- treating `Google Authenticator` like a passkey
- jumping straight to passkey-only auth for all users without password and recovery fallback
- silently keeping email-only login as the durable account model

## Implementation Notes

The first implementation slice should align:

- `apps/web/app/(auth)/auth.ts`
- `apps/web/app/(auth)/actions.ts`
- `apps/web/components/chat/auth-form.tsx`
- `apps/web/lib/db/schema.ts`
- `apps/web/lib/db/queries.ts`
- `docs/API_CONTRACTS.md`
- `docs/SCHEMA_LOGICAL.md`
- `docs/TEST_MATRIX.md`
- `docs/LIVE_VS_TARGET.md`
- `apps/web/README.md`

Support auth aggregates may include:

- `AccountPasskeyCredential`
- `AccountAuthChallenge`
- optional later `AccountRecoveryCode`

These are support auth objects, not new Boreal commerce roots.
