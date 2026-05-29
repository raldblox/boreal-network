export type ArchitectureLayer = {
  name: string;
  responsibility: string;
  productionRole: string;
  components: string[];
};

export type FileStructureEntry = {
  path: string;
  responsibility: string;
};

export type DatabaseTableEntry = {
  table: string;
  canonicalObject?: string;
  responsibility: string;
  scaleNotes: string[];
};

export type ApiEndpointGroup = {
  group: string;
  endpoints: string[];
  responsibility: string;
};

export type UiSurfaceEntry = {
  surface: string;
  route: string;
  responsibility: string;
};

export type ProductionHardeningEntry = {
  area: string;
  currentBaseline: string;
  scalePath: string;
};

export const mvpArchitecture = {
  title: "Boreal production MVP architecture",
  summary:
    "A minimal scalable slice for request-native work commerce, built on the existing Next.js, Auth.js, Neon Postgres, Drizzle, and shadcn/ui workspace.",
  boundary:
    "This describes the scalable MVP architecture and implementation inventory. It does not claim the current deployment has already been load-tested to millions of users.",
  principles: [
    "`Request` stays the durable demand root.",
    "`Supply` is the published capability surface.",
    "`Commitment` gates commercial approval.",
    "`Fulfillment` owns execution truth.",
    "`Artifact`, `Transaction`, and `RequestEvent` carry proof, money state, and append-only history.",
    "Support systems attach to canonical objects instead of replacing them.",
  ],
  layers: [
    {
      name: "Interface layer",
      responsibility:
        "Render buyer intake, request rooms, supply management, services, account, and operator-facing architecture surfaces.",
      productionRole:
        "Stateless Next.js App Router pages and server components that can scale horizontally behind Vercel or any Node-compatible edge.",
      components: [
        "apps/web/app",
        "apps/web/components/chat",
        "apps/web/components/request",
        "apps/web/components/services",
        "apps/web/components/supply",
      ],
    },
    {
      name: "Account and resolver identity layer",
      responsibility:
        "Authenticate browser users while keeping desktop or runtime resolver identity scoped and separate.",
      productionRole:
        "Auth.js sessions for accounts, resolver device approval and bearer tokens for non-browser runtimes.",
      components: [
        "apps/web/app/(auth)",
        "apps/web/lib/account-auth.ts",
        "apps/web/lib/account-webauthn.ts",
        "apps/web/lib/resolver-server.ts",
      ],
    },
    {
      name: "Request-commerce domain layer",
      responsibility:
        "Normalize request intake, route supply, gate commitment, start fulfillment, publish artifacts, and record payments.",
      productionRole:
        "Typed server modules keep canonical object semantics out of route handlers and UI components.",
      components: [
        "apps/web/lib/request.ts",
        "apps/web/lib/request-server.ts",
        "apps/web/lib/supply.ts",
        "apps/web/lib/supply-server.ts",
        "apps/web/lib/payment-server.ts",
      ],
    },
    {
      name: "Durable data layer",
      responsibility:
        "Store account, chat, canonical request-commerce objects, support objects, and append-only activity.",
      productionRole:
        "Neon Postgres plus Drizzle schema and migrations, with indexed request, supply, transaction, event, and ledger access paths.",
      components: [
        "apps/web/lib/db/schema.ts",
        "apps/web/lib/db/queries.ts",
        "apps/web/lib/db/migrations",
      ],
    },
    {
      name: "Integration layer",
      responsibility:
        "Connect provider work, first-party services, payment processor flow, object storage, and desktop runtime feedback.",
      productionRole:
        "Support layers persist durable outcomes back into `Fulfillment`, `Artifact`, `Transaction`, and `RequestEvent`.",
      components: [
        "apps/web/lib/boreal-workers",
        "apps/web/lib/providers/runway",
        "apps/web/lib/workflow-pack-server.ts",
        "apps/web/lib/paypal.ts",
        "apps/web/lib/desktop-runtime-bridge.ts",
      ],
    },
    {
      name: "Evaluation and verification layer",
      responsibility:
        "Keep planner, matcher, policy, auth, and request-processing behavior testable against canon.",
      productionRole:
        "Playwright coverage plus request-processing eval runners protect the MVP from semantic drift as features expand.",
      components: [
        "apps/web/tests",
        "tests/contracts",
        "fixtures/request",
      ],
    },
  ] satisfies ArchitectureLayer[],
  fileStructure: [
    {
      path: "apps/web/app",
      responsibility:
        "App Router pages and API route handlers for product surfaces and server actions.",
    },
    {
      path: "apps/web/components",
      responsibility:
        "Web-specific UI composition for chat, request rooms, services, supply studio, and reusable local UI wrappers.",
    },
    {
      path: "apps/web/lib",
      responsibility:
        "Typed domain, server, provider, payment, resolver, and utility modules.",
    },
    {
      path: "apps/web/lib/db",
      responsibility:
        "Drizzle table schema, migrations, query helpers, and database connection behavior.",
    },
    {
      path: "apps/web/tests",
      responsibility:
        "Browser and route-level tests for core product behavior.",
    },
    {
      path: "packages/ui",
      responsibility:
        "Shared React and Tailwind primitives used by web and desktop without redefining Boreal domain semantics.",
    },
    {
      path: "schemas",
      responsibility:
        "Machine-readable JSON Schema, OpenAPI, and async event contracts.",
    },
    {
      path: "fixtures",
      responsibility:
        "Deterministic request, supply, and eval samples used to verify canonical behavior.",
    },
  ] satisfies FileStructureEntry[],
  databaseTables: [
    {
      table: "User",
      responsibility:
        "Browser account identity, username or email login, anonymous guest lane, and account profile metadata.",
      scaleNotes: [
        "Unique username-normalized index prevents ambiguous account handles.",
        "Keep wallet, payout, and resolver identity separate from account identity.",
      ],
    },
    {
      table: "Request",
      canonicalObject: "Request",
      responsibility:
        "Durable demand root carrying current brief, visibility, routing, active refs, latest summary, and derived projections.",
      scaleNotes: [
        "Fetch by owner and status for private dashboards.",
        "Expose only public-safe projections for open public request reads.",
      ],
    },
    {
      table: "Supply",
      canonicalObject: "Supply",
      responsibility:
        "Published or draft capability records owned by actors, including profile, capability, pricing, availability, source, and bindings.",
      scaleNotes: [
        "Index by owner and status for supply studio reads.",
        "Public discovery can add visibility and capability indexes without changing the root object.",
      ],
    },
    {
      table: "Commitment",
      canonicalObject: "Commitment",
      responsibility:
        "Commercial or approval boundary for quotes, proposals, assignments, milestones, and acceptances.",
      scaleNotes: [
        "Keep accepted commitment lookup request-scoped.",
        "Preserve superseded commitments as durable history.",
      ],
    },
    {
      table: "Fulfillment",
      canonicalObject: "Fulfillment",
      responsibility:
        "Accepted execution lane with lead, contributors, selected supply, status, artifacts, steps, and provider metadata.",
      scaleNotes: [
        "Retry and provider polling operate on the same fulfillment lane.",
        "Do not create new requests for internal sub-work.",
      ],
    },
    {
      table: "Artifact",
      canonicalObject: "Artifact",
      responsibility:
        "Stable proof, receipt, delivery, file, media, link, or document-backed output references.",
      scaleNotes: [
        "Store large media in object storage and persist object references.",
        "Authorize media preview through request-scoped reads.",
      ],
    },
    {
      table: "Transaction",
      canonicalObject: "Transaction",
      responsibility:
        "Request-attached payment, verification, settlement, payout, refund, or dispute state.",
      scaleNotes: [
        "Use request and status indexes for payment timelines.",
        "Idempotency keeps retries from double-settling money state.",
      ],
    },
    {
      table: "RequestEvent",
      canonicalObject: "RequestEvent",
      responsibility:
        "Append-only request activity ledger with sequence, causation, correlation, idempotency, actor, and payload.",
      scaleNotes: [
        "Unique request sequence supports replayable timelines.",
        "Keep token deltas and transient runtime logs out unless promoted.",
      ],
    },
    {
      table: "BuyerCreditAccount / BuyerCreditLedgerEntry",
      responsibility:
        "First-party buyer-credit balance and append-only credit ledger for top-ups, grants, debits, restores, and reversals.",
      scaleNotes: [
        "Account plus idempotency unique index prevents duplicate ledger effects.",
        "Spending credit on a request still creates request-attached `Transaction` truth.",
      ],
    },
    {
      table: "WorkflowPack / WorkflowPackVersion / WorkflowAdapterRun",
      responsibility:
        "Reusable workflow-backed supply support objects and adapter run state.",
      scaleNotes: [
        "Workflow definitions do not replace buyer-authored request briefs.",
        "Adapter success is not accepted completion without artifacts and closure truth.",
      ],
    },
  ] satisfies DatabaseTableEntry[],
  apiEndpointGroups: [
    {
      group: "Requests",
      responsibility:
        "Create drafts, open requests, read private or public-safe projections, and update allowed request fields.",
      endpoints: [
        "GET /api/requests",
        "POST /api/requests",
        "PATCH /api/requests",
        "GET /api/requests/{id}",
        "PATCH /api/requests/{id}",
        "GET /api/requests/{id}/activity",
      ],
    },
    {
      group: "Commitments and fulfillment",
      responsibility:
        "Propose, accept, create, update, retry, and inspect approved execution lanes.",
      endpoints: [
        "POST /api/requests/{id}/commitments",
        "PATCH /api/commitments/{id}",
        "POST /api/requests/{id}/fulfillments",
        "GET /api/fulfillments/{id}",
        "PATCH /api/fulfillments/{id}",
        "POST /api/fulfillments/{id}/retry",
      ],
    },
    {
      group: "Artifacts and media",
      responsibility:
        "Publish stable proof and delivery references, upload files, and authorize media previews.",
      endpoints: [
        "POST /api/requests/{id}/artifacts",
        "GET /api/requests/{id}/artifacts/{artifactId}/media",
        "POST /api/files/upload",
        "GET /api/files/blob",
      ],
    },
    {
      group: "Supply",
      responsibility:
        "Create, read, update, publish, pause, retire, or delete owner-scoped capability records.",
      endpoints: [
        "GET /api/supplies",
        "POST /api/supplies",
        "GET /api/supplies/{id}",
        "PATCH /api/supplies/{id}",
        "DELETE /api/supplies/{id}",
      ],
    },
    {
      group: "Payments and buyer credit",
      responsibility:
        "Create first-party credit top-ups, apply credit to requests, and record request-attached transactions.",
      endpoints: [
        "GET /api/buyer-credits/account",
        "GET /api/buyer-credits/ledger",
        "POST /api/buyer-credits/topups",
        "POST /api/buyer-credits/apply",
        "POST /api/paypal/create-order",
        "GET /api/paypal/capture",
        "POST /api/paypal/webhook",
        "GET /api/requests/{id}/transactions",
        "POST /api/requests/{id}/transactions",
      ],
    },
    {
      group: "Services and workflow-backed supply",
      responsibility:
        "Expose curated first-party service checkout and workflow-backed supply bootstrap lanes.",
      endpoints: [
        "POST /api/services/character-call-starter/checkout",
        "POST /api/services/character-call-starter/session",
        "POST /api/workflow-supplies/runway/character-call-starter",
        "POST /api/workflow-supplies/runway/founder-avatar-clip-pack",
      ],
    },
    {
      group: "Resolver auth",
      responsibility:
        "Approve desktop or runtime clients and issue scoped bearer tokens separate from account sessions.",
      endpoints: [
        "POST /api/auth/resolver/device/start",
        "POST /api/auth/resolver/device/poll",
        "POST /api/auth/resolver/token/refresh",
        "POST /api/auth/resolver/token/revoke",
      ],
    },
  ] satisfies ApiEndpointGroup[],
  uiSurfaces: [
    {
      surface: "Home",
      route: "/",
      responsibility:
        "Public first viewport and access paths for request posting, services, supply whitelist, account, and desktop.",
    },
    {
      surface: "Post request",
      route: "/?mode=request",
      responsibility:
        "Explicit request-mode intake that creates one draft only after the first request turn or explicit create action.",
    },
    {
      surface: "Request room",
      route: "/chat/{id}",
      responsibility:
        "Monitored workroom for request status, current plan, activity, artifacts, commitments, and fulfillment state.",
    },
    {
      surface: "Open requests",
      route: "/open-requests",
      responsibility:
        "Public-safe demand browsing for open public requests without leaking owner-only routing fields.",
    },
    {
      surface: "Services",
      route: "/services",
      responsibility:
        "Curated first-party service buying flow that still resolves into `Supply`, `Request`, `Transaction`, and `Fulfillment` truth.",
    },
    {
      surface: "Supply studio",
      route: "/supplies",
      responsibility:
        "Owner-scoped supply draft, publish, pause, retire, and selection workflows.",
    },
    {
      surface: "Account and security",
      route: "/account",
      responsibility:
        "User profile, buyer-credit, top-up, and WebAuthn passkey management surfaces.",
    },
    {
      surface: "Desktop runtime",
      route: "/download/boreal-desktop",
      responsibility:
        "Desktop setup and local runtime connection guidance without treating local transport as durable request truth.",
    },
    {
      surface: "Architecture",
      route: "/architecture",
      responsibility:
        "Human-readable implementation map of the production MVP slice.",
    },
  ] satisfies UiSurfaceEntry[],
  productionHardening: [
    {
      area: "Horizontal web scale",
      currentBaseline:
        "Next.js App Router with stateless server routes and server components.",
      scalePath:
        "Run multiple web instances, keep session and durable state outside process memory, and isolate long-running provider work from request latency.",
    },
    {
      area: "Database scale",
      currentBaseline:
        "Neon Postgres with Drizzle schema, migrations, connection reuse, and request-scoped indexes.",
      scalePath:
        "Add read replicas, connection pooling, partition high-volume `RequestEvent` streams, and add targeted indexes from query telemetry.",
    },
    {
      area: "Write safety",
      currentBaseline:
        "Idempotency keys and request-attached transaction, event, and ledger records.",
      scalePath:
        "Make every money-moving and lifecycle-changing endpoint idempotent and replay-safe under retries, webhooks, and worker replays.",
    },
    {
      area: "Async execution",
      currentBaseline:
        "Provider and workflow support objects attach outputs back to fulfillment lanes and artifacts.",
      scalePath:
        "Move provider execution to queue-backed workers with durable retry state, dead-letter queues, and request-event summaries.",
    },
    {
      area: "Object storage",
      currentBaseline:
        "Artifacts can point to document, external, or object references.",
      scalePath:
        "Store generated media and rich files in object storage with signed reads, checksum metadata, and request-scoped authorization.",
    },
    {
      area: "Observability",
      currentBaseline:
        "OpenTelemetry packages are installed and request-event history is durable.",
      scalePath:
        "Add trace ids to API mutations, provider jobs, and event writes, then monitor latency, error budgets, webhook replay, and worker retry rates.",
    },
    {
      area: "Security",
      currentBaseline:
        "Auth.js account sessions, WebAuthn support objects, resolver bearer tokens, and role-scoped server helpers.",
      scalePath:
        "Add rate limits, bot protection, audit exports, stricter CSP, webhook verification monitoring, secret rotation, and scoped service accounts.",
    },
    {
      area: "Product verification",
      currentBaseline:
        "Playwright tests plus request-processing contract and benchmark runners.",
      scalePath:
        "Add load tests, contract tests for every public mutation, payment replay tests, and eval dashboards for planner and matcher regressions.",
    },
  ] satisfies ProductionHardeningEntry[],
} as const;

export type MvpArchitecture = typeof mvpArchitecture;
