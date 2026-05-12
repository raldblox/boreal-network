# 0006 Resolver Identity And Device Approval Flow

## Context

`apps/web` now exposes direct resolver APIs for request reads, commitment writes, artifact writes, and fulfillment writes.

`apps/desktop` currently proves local Codex runtime connectivity, but repo canon already separates:

- account identity
- wallet identity
- payout identity
- runtime or desktop identity

Letting raw Codex auth act as Boreal web auth would collapse those boundaries and make request-side ownership and audit trails ambiguous.

## Decision

Adopt a Boreal-issued resolver identity layer for non-browser runtimes.

The first implementation uses:

- `ResolverClient` as the durable runtime registration record
- `ResolverAuthorization` as the short-lived device approval record
- `ResolverToken` as the durable opaque bearer-token record

The first authorization flow is device-approval based:

1. runtime calls `POST /api/auth/resolver/device/start`
2. web creates a pending resolver client plus approval code
3. user signs into Boreal web and opens `/resolver/authorize?user_code=...`
4. user approves the desktop/runtime against an existing Boreal account
5. runtime polls `POST /api/auth/resolver/device/poll`
6. web issues Boreal access plus refresh tokens

The first token model is opaque and database-backed, not JWT-based.

Resolver tokens are scoped.
Initial scopes are:

- `requests:read_public`
- `requests:read_private`
- `requests:read_activity`
- `commitments:propose`
- `commitments:accept`
- `artifacts:publish`
- `fulfillments:read`
- `fulfillments:create`
- `fulfillments:update`

Direct resolver APIs may accept either:

- browser `Auth.js` session auth
- Boreal-issued resolver bearer auth

Raw Codex credentials are never treated as the Boreal actor identity by themselves.

## Consequences

### Accepted

- web remains source of truth for Boreal actor identity
- desktop/runtime identity can be approved without becoming a second auth system
- resolver scopes can be narrowed without changing request object semantics
- bearer auth can be added to direct resolver APIs without replacing browser auth

### Rejected

- using raw Codex auth as direct Boreal API auth
- inventing a second request system of record in desktop
- using long-lived unscoped static API keys as the first resolver identity model

### Follow-up

- add richer resolver-session management surfaces in web UI
- add explicit client revocation and listing surfaces for owners
- decide whether future resolver auth should accept wallet-backed actor binding or enterprise runtime provisioning
