# Boreal Desktop

This workspace is the Windows-first Electron desktop shell inside the Boreal monorepo.

## Purpose

- local operator surface
- native desktop shell for Boreal execution participation
- secure bridge to local filesystem, process, and runtime access
- local-first chat lane backed by Codex auth without exposing tokens to the renderer
- chat-first full-height desktop shell with inline Codex connect and local-only transcript state
- dark-mode desktop shell by default

## Boundary

- desktop is not a second Boreal system of record
- root canon still defines request, commitment, fulfillment, artifact, transaction, and event meaning
- reusable UI primitives belong in `../../packages/ui/`
- desktop chat history stays local by default unless work is explicitly promoted
- desktop now exposes a persisted runtime mode instead of hardcoding one Codex policy for every turn
- `Safe` mode keeps desktop on `workspace-write` with network disabled
- `Full` mode uses `danger-full-access` with network enabled for owner-approved local work
- desktop does not expose interactive Codex approval prompts yet, so the current runtime presets keep approval on `never`
- auto-resolve for owned private requests stays on its safer read-only lane even if chat runtime is set to `Full`
- desktop uses `.boreal-work` as its app-owned home for local chat state only
- desktop now keeps a real peer-backed runtime identity under `.boreal-work/desktop/peer-runtime.json` and shows that `Desktop runtime ID` in the UI
- desktop main now starts an embedded Hyperswarm peer host and upgrades that same runtime identity to a live peer-ready key without exposing actor auth as peer identity

## Initial Stack

- `Electron`
- `Vite`
- `React`
- shared UI from `@boreal/ui`

## Local Structure

- `src/main/` for Electron main-process code
- `src/main/ephemeral-stream-bus.js` for the phase-1 local-only ephemeral realtime lane
- `src/main/preload.cjs` for the typed renderer bridge
- `src/renderer/` for the React desktop shell
- `scripts/` for local development helpers

## Current UX

- first open shows only a `Connect Codex worker` screen
- when auth is missing, `Connect Codex` opens `codex login` and auto-attaches after login completes
- desktop creates `~/.boreal-work/desktop/` for local settings and chat history
- desktop now uses one built-in local lane named `Chats`
- there is no desktop project creation flow in this shell
- after connect, desktop switches to a chat-first shell with a local sidebar history and `New thread`
- sidebar footer now stays minimal: one visible `Desktop runtime ID` row plus a settings button
- worker identity, runtime mode, resolver connection, and environment details now live inside a centered desktop settings dialog
- that settings dialog now uses a wider responsive grid so long identity and environment fields fit without awkward overflow
- desktop sidebar now also exposes `Public requests`, which reads the live public-safe Boreal web pool through `GET /api/requests?scope=public`
- desktop can now connect a Boreal account through the resolver device approval flow and keep that Boreal actor separate from local Codex auth
- desktop now also exposes `My requests`, which reads owned Boreal requests through resolver bearer auth
- opening `Public requests` or `My requests` now starts on the list view instead of carrying stale request detail across surfaces
- request list and request detail now scroll independently, and request detail uses a single full-width stacked layout instead of a thin two-column activity lane
- desktop can inspect request detail and durable activity, then drive direct commitment, artifact, and fulfillment APIs without exposing Boreal tokens to the renderer
- desktop now exposes an owner-private auto-resolve lane where Boreal Desktop and Codex can create fulfillment directly, do the work, and publish delivery for owned private requests
- desktop now exposes a toggle to auto-resolve owned private open requests without creating a commitment object first
- request lists now refresh on explicit surface open, auth completion, action completion, or the manual `Refresh` button instead of a tight background poll loop
- switching from `Safe` to `Full` now requires an explicit confirmation dialog, and public or tracked-public request surfaces show extra caution text while `Full` is active
- local chat threads can be deleted from the desktop shell
- desktop remembers your last chosen model and reasoning level across restarts and new threads
- model and reasoning choices come from the live local Codex catalog, including effort levels such as `low`, `medium`, `high`, and `xhigh` when the selected model supports them
- desktop now keeps one persistent `codex app-server` session alive in Electron main for lower-latency local chat turns
- prompt turns prefer that persistent `codex app-server` path with the currently selected desktop runtime mode and fall back to one-shot `codex exec` only if the persistent lane fails
- desktop shows live turn status, compact command/reasoning activity, and early assistant text when the local Codex stream exposes it
- desktop phase 1 of `0008` is now a local-only ephemeral stream bus in Electron main for typing submission, token deltas, progress, heartbeats, presence, transient runtime logs, and tool output summaries
- desktop phase 2 now also starts a localhost-only SSE bridge on `127.0.0.1` for browser-visible ephemeral events, guarded by a random desktop session token and localhost-origin checks
- desktop now also starts an embedded Pear or Hyperswarm peer runtime in Electron main, listens on the Boreal control topic, and surfaces live peer status in desktop settings
- chat history and thread selection stay local-only under `.boreal-work` and are not synced to Boreal backend by default
- that ephemeral lane is not durable Boreal truth by default and does not create request history unless later work explicitly promotes a business-relevant outcome
- the bridge stays transport-only and does not create durable Boreal request history by itself
- public request browsing is read-only and stays sourced from Boreal web truth rather than creating a desktop-local request cache
- request execution still reads and writes Boreal web truth; desktop does not become a second request ledger
- owner-private auto-resolution should use the same web truth and emit the same durable fulfillment and artifact events instead of storing desktop-local shadow state
- participant-scoped engaged-request inbox is not implemented yet, so a responder may still need the current request id to revisit work after it leaves the public pool
- runtime mode is stored in `~/.boreal-work/desktop/settings.json`, and changing it forces the current local Codex runtime session to restart before the next turn
- this machine currently defaults to software rendering because Electron GPU startup can crash on some Windows setups here; if you want to test hardware rendering after fixing that environment issue, launch with `BOREAL_DESKTOP_ENABLE_GPU=1`
- if the desktop should read a non-default Boreal web origin, set `BOREAL_DESKTOP_WEB_BASE_URL`; otherwise it defaults to `http://127.0.0.1:3000`
- localhost bridge status, SSE URL, and restart control now appear in desktop settings
- peer runtime status, control topic, request-topic count, and restart control now also appear in desktop settings
- peer foundation is live, but peer transport still does not replace Boreal request truth, browser surfaces still use the localhost bridge, and Hyperdrive remains deferred

## Commands

Run from the monorepo root after dependencies are installed:

- `pnpm desktop:dev`
- `pnpm desktop:build`
- `pnpm desktop:start`

Or run directly against the workspace:

- `pnpm --filter @boreal/desktop dev`
- `pnpm --filter @boreal/desktop build`
- `pnpm --filter @boreal/desktop start`

## Relation To Root Canon

This workspace may implement desktop-local UX, window lifecycle, and native bridge behavior.
It may not redefine canonical Boreal business objects or turn desktop-local state into a competing request ledger.
