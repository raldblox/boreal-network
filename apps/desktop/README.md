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
- current Codex chat execution uses a `workspace-write` sandbox so normal local inspection commands work, but the desktop prompt still tells Codex not to modify files unless the owner explicitly asks
- desktop uses `.boreal-work` as its app-owned home for local chat state only

## Initial Stack

- `Electron`
- `Vite`
- `React`
- shared UI from `@boreal/ui`

## Local Structure

- `src/main/` for Electron main-process code
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
- local chat threads can be deleted from the desktop shell
- desktop remembers your last chosen model and reasoning level across restarts and new threads
- model and reasoning choices come from the live local Codex catalog, including effort levels such as `low`, `medium`, `high`, and `xhigh` when the selected model supports them
- desktop now keeps one persistent `codex app-server` session alive in Electron main for lower-latency local chat turns
- prompt turns prefer that persistent `codex app-server` path with a `workspace-write` sandbox and fall back to one-shot `codex exec` only if the persistent lane fails
- desktop shows live turn status, compact command/reasoning activity, and early assistant text when the local Codex stream exposes it
- chat history and thread selection stay local-only under `.boreal-work` and are not synced to Boreal backend by default
- this machine currently defaults to software rendering because Electron GPU startup can crash on some Windows setups here; if you want to test hardware rendering after fixing that environment issue, launch with `BOREAL_DESKTOP_ENABLE_GPU=1`

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
