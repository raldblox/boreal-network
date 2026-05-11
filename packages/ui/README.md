# Boreal UI

This workspace holds reusable Boreal UI primitives and shared theme styles.

## Purpose

- shared React component primitives
- shared Tailwind theme tokens and baseline styles
- narrow reusable hooks or helpers needed by those primitives

## Scope

- package app-agnostic UI here
- keep Boreal request, auth, routing, and business semantics in app workspaces
- let `apps/web/` and `apps/desktop/` wrap or compose these primitives locally

## Commands

This package is source-only for now and is consumed through the monorepo workspace graph after install.

## Relation To Root Canon

This package may standardize presentation and interaction primitives.
It may not redefine Boreal commercial, lifecycle, or contract meaning.
