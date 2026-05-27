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

## Component Architecture

`packages/ui` is the reusable primitive layer. Product workspaces should compose these primitives with local data, routing, and Boreal-specific copy.

- `components/button`, `badge`, `input`, `dialog`, and related files are low-level shadcn-compatible primitives.
- `components/empty-state` standardizes accessible empty, error, warning, and success states.
- `components/resource-list` owns list rendering state: loading, error, empty, and populated items.
- `components/page-header` standardizes responsive page and section headers.
- `styles.css` owns shared Tailwind tokens, motion utilities, focus defaults, and theme variables.

Keep app logic out of this package. A component may know how to render a loading state; it must not know what a `Request`, `Supply`, payment, auth session, or route means.

## Props And API Design

### `EmptyState`

Use for empty, warning, error, success, and completion states.

```tsx
<EmptyState
  actions={<Button>Start request</Button>}
  align="start"
  description="Create the first reusable lane before routing work here."
  headingLevel={2}
  title="No active supplies yet"
  tone="neutral"
  variant="panel"
/>
```

Key props:

- `title`: required visible heading.
- `description`: optional supporting copy.
- `actions`: optional controls.
- `icon`: optional visual cue, hidden from assistive tech.
- `tone`: `neutral`, `info`, `success`, `warning`, or `destructive`.
- `variant`: `panel`, `plain`, or `inline`.
- `align`: `start` or `center`.

### `ResourceList<TItem>`

Use when a surface renders async collections. It prevents every page from re-implementing loading, error, and empty branches.

```tsx
<ResourceList
  aria-label="Open public requests"
  columns="two"
  emptyState={<EmptyState title="No requests yet" />}
  error={error}
  getKey={(request) => request.id}
  isLoading={isLoading}
  items={requests}
  layout="grid"
  renderItem={(request) => <OpenRequestCard request={request} />}
/>
```

Key props:

- `items`: typed immutable item array.
- `renderItem`: item renderer.
- `getKey`: stable key resolver.
- `isLoading`: renders an accessible `role="status"` loading region.
- `error`: renders an accessible `role="alert"` error region.
- `emptyState`, `errorState`, `loadingState`: optional full overrides.
- `layout`: `stack` or `grid`.
- `columns`: `one`, `two`, or `three`.
- `renderLoadingItem`: custom skeleton renderer.

### `PageHeader`

Use for consistent page and panel openings without baking in app-specific shell layout.

```tsx
<PageHeader
  actions={<Button>New supply</Button>}
  description="Enable supply lanes, then route work through them."
  eyebrow="Supply studio"
  size="lg"
  title="Ready to route"
/>
```

Key props:

- `title`: required heading content.
- `titleAs`: `h1`, `h2`, or `h3`.
- `description`, `eyebrow`, `meta`, `actions`: optional slots.
- `size`: `sm`, `md`, or `lg`.
- `density`: `compact`, `default`, or `spacious`.
- `align`: `start` or `center`.

## Usage Pattern

Apps should import through their local compatibility wrappers when present:

```tsx
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceList } from "@/components/ui/resource-list";
```

Shared packages may import directly:

```tsx
import { EmptyState, ResourceList } from "@boreal/ui";
```

## Production Guidelines

- Always provide an `aria-label` for `ResourceList`; it becomes the list or state-region label.
- Keep `getKey` stable. Do not use array indexes for mutable server data.
- Prefer `renderLoadingItem` for page-specific skeletons so the layout does not shift after data loads.
- Use `EmptyState` for empty and failure branches instead of raw text blocks.
- Keep title hierarchy deliberate: use `PageHeader titleAs="h1"` once per page and lower levels inside sections.
- Keep product semantics in the app. Reusable UI should expose slots and typed props, not Boreal domain branches.
