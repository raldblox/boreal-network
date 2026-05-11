# Boreal Desktop

This workspace is the Windows-first Electron desktop shell inside the Boreal monorepo.

## Purpose

- local operator surface
- native desktop shell for Boreal execution participation
- secure bridge to local filesystem, process, and runtime access
- local-first chat lane backed by Codex auth without exposing tokens to the renderer

## Boundary

- desktop is not a second Boreal system of record
- root canon still defines request, commitment, fulfillment, artifact, transaction, and event meaning
- reusable UI primitives belong in `../../packages/ui/`
- desktop chat history stays local by default unless work is explicitly promoted
- current Codex chat execution is read-only until the desktop app has an explicit approval flow for write actions

## Initial Stack

- `Electron`
- `Vite`
- `React`
- shared UI from `@boreal/ui`

## Local Structure

- `src/main/` for Electron main-process code
- `src/main/preload.js` for the typed renderer bridge
- `src/renderer/` for the React desktop shell
- `scripts/` for local development helpers

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
