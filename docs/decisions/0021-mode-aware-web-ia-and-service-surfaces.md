# 0021 Mode-aware web IA and service surfaces

## Status

Accepted

## Date

2026-05-27

## Context

Boreal web now exposes several adjacent work types:

- chat and scratch exploration
- private request drafting and open request rooms
- public open-request browsing
- buyer-facing service pages
- operator-facing supply management
- desktop or runtime setup

The current failure mode is not lack of routes.
The failure mode is mixing unrelated object lists and actions in one sidebar until Boreal reads like three different products at once.

The most confusing mix is:

- `Supply`
- `Request`
- chat history

rendered together without a clear mode boundary.

That weakens the accepted product reading:

- buyers should understand services and requests
- operators should manage supply
- open requests should feel like a public demand pool
- private requests should feel like a workroom
- scratch chats should not compete with durable request work

## Decision

### 1. Use work type modes, not user modes

Boreal should not split the web app primarily by buyer mode versus worker mode.

One account may buy, supply, operate, and review.

The clearer split is by work type:

- `Home`
- `Workroom`
- `Services`
- `Supply Studio`
- `Open Requests`
- `Runtime` or `Account`

### 2. Sidebar lists must be contextual

The app sidebar may show primary navigation groups, but it must not render every object history at once.

Only one contextual list should be visible at a time:

- `Workroom` shows owned requests
- `Scratch chat` shows chat history
- `Supply Studio` shows supply drafts and published supply
- `Services` shows no owner-object history by default
- `Open Requests` shows the public request pool in the main pane, not mixed with private history
- `Runtime` and account setup show no work-object history by default

### 3. Buyer-facing language should say `Services`

The canonical object remains `Supply`.

But buyer-facing service pages should use:

- `Service`
- `Plan`
- `Start request`
- `Delivery`
- `Proof`

Operator and implementation surfaces may still use:

- `Supply`
- `Supply Studio`
- `Supply draft`
- `WorkflowPack`

This keeps canon intact while making the product simpler.

### 4. Direct service links stay request-native

Service pages are surface groupings, not new roots.

The direct-link path remains:

- service family page
- preset plan
- private draft `Request`
- selected supply or service metadata
- opening, funding, fulfillment, artifact delivery, and review

When stable first-party supply ids exist, exact plan links should set `routing.preferredSupplyId`.

Until then, service pages may prefill buyer-visible request-mode context, but must not silently write plan text into `Request.brief` without buyer confirmation.

### 5. Open requests are public demand, not private workroom history

The public open-request pool should live under its own surface.

It should show public-safe request projections and avoid mixing with:

- private draft requests
- owned request history
- supply management
- scratch chats

## Consequences

### Accepted

- future sidebar work must preserve contextual object lists
- future service pages should be buyer-facing wrappers over `Supply` and `Request`, not new commerce roots
- `Supply` remains canonical and implementation-facing
- `Services` becomes the public/buyer-facing label
- open-request browsing and owned request workroom history are separate surfaces

### Rejected

- rendering supplies, requests, and chats together as equal sidebar histories
- splitting the product by fixed user personas when one account may perform several roles
- exposing raw workflow definitions or supply internals as the buyer-facing service contract
- turning service pages into a second commerce model outside `Request`

## Implementation Notes

This decision should guide:

- `apps/web/components/chat/app-sidebar.tsx`
- `apps/web/components/chat/mode-shell.tsx`
- `apps/web/components/services/service-hub.tsx`
- `apps/web/components/request/open-requests-hub.tsx`
- `apps/web/lib/service-catalog.ts`
- `docs/REQUEST_UX_NOTES.md`
- `docs/strategy/UNLISTED_SERVICE_LINKS_AND_FIRST_PARTY_CREDITS_SPEC.md`

This decision does not change:

- canonical root objects
- lifecycle states
- API contracts
- event names
- schema semantics

It changes the accepted web information architecture and visible grouping rules.
