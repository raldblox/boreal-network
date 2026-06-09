# Test Matrix

This file defines what must be verifiable as Boreal Network evolves.

## Test Families

### Contract tests

Verify:

- JSON Schema validity
- OpenAPI validity
- AsyncAPI or event schema validity
- sample payload compatibility
- ephemeral realtime channel shapes do not drift into durable event schemas accidentally
- desktop-local ephemeral IPC envelopes keep stable lane, channel-kind, correlation, and source fields without pretending to be durable request events
- supply schema and supply OpenAPI stay aligned on status, visibility, pricing mode, source kind, and binding shape
- embodied-planning conventions stay aligned across request, supply, artifact, and eval surfaces when Boreal uses them
- agent discovery documents, agent cards, OpenAPI exports, JSON Schema exports, and AsyncAPI exports point to the same canonical object and endpoint names

### Commercial canon tests

Verify:

- commercial category matches thesis language
- positioning docs do not contradict root object canon
- ICP and wedge stay consistent with business model and competitive map
- pitch facts do not overclaim beyond canon or cited market evidence
- live-versus-target boundaries match the current machine-modeled layer and do not overstate implementation status
- request-grant language does not imply passive investment upside, yield, dividend, or tax-deductible donation treatment
- public solution language points back to completed `Request` plus accepted `Artifact` truth instead of creating a new root
- public solution copy separates free inspection from credit-consuming inference or execution runs

### Lifecycle tests

Verify:

- allowed transitions succeed
- invalid transitions fail
- terminal states stay terminal
- request summaries reflect history correctly

### Invariant tests

Verify:

- one request root remains durable across the lifecycle
- one supply owner remains stable across draft, publish, pause, and retire transitions
- no fulfillment exists without a request
- no accepted execution exists without an accepted route or commitment
- funding-required requests point to valid commercial context
- optional request grants attach to the same request lifecycle instead of forking a second funding flow
- delivered work can be traced to artifacts and events
- public solution projections can be traced to completed requests and accepted artifacts
- public solution inspection leaves the source request state unchanged
- public solution runs or forks create a new request or accepted execution lane that references the source artifact
- reusable prompt runs create a private scratch-chat fork that references the source chat and source message without mutating the public source chat or creating a `Request`
- file, media, PDF, audio, video, binary, and archive deliveries can be traced through stable artifact references without inflating the request root
- non-substitutable embodied work cannot be resolved through generated summaries alone when the request requires explicit proof

### Authorization tests

Verify:

- only authorized actors can mutate a request
- participant roles are enforced
- payment and payout visibility respect ownership and role boundaries
- public scratch-chat user prompts are readable for reusable-prompt analysis, while private scratch-chat prompts are forbidden unless the viewer owns the chat
- regular login should accept either username or email when both map to the same account
- username normalization and uniqueness should prevent ambiguous or duplicate regular-account handles
- password success alone should not complete login when the account has enrolled required `WebAuthn` MFA
- `WebAuthn` MFA challenges should expire, single-use correctly, and reject replay
- `WebAuthn` challenge creation should reject origins outside the configured allowlist and should not derive production RP ID or origin from forwarded request headers
- passkey-first login should issue a session from an enrolled discoverable credential without username or password input
- passkey-first login should reject expired challenges, unknown credential ids, and replayed challenge ids
- resolver bearer scopes are enforced independently from browser sessions
- raw runtime identity cannot be treated as Boreal request ownership without Boreal-issued resolver approval
- peer or localhost realtime session auth cannot be treated as Boreal actor auth by itself
- raw runtime or resolver identity cannot be treated as supply ownership by itself
- external-agent scopes should grant the minimum required read or write capability and should not make anonymous public inspection equivalent to mutation authority

### Request-flow taxonomy tests

For the actor-neutral request-flow taxonomy machine model, verify:

- every `RequestFlowStage` has explicit in, out, done-here, not-done-here, authority, next-stage, recovery, and adapter-mapping fields
- every `RequestFlowCard` references an existing stage and declares whether it is human, agent, system, or hybrid-facing
- every current `RequestFlowNodeDescriptor` carries a taxonomy binding with `stageId`, `cardKind`, `actorModes`, authority boundary, done/not-done scope, and `nextActionIntents`
- rendering a card never grants permission, records approval, authorizes payment, writes durable history, or proves completion
- drag or connection affordances may expose a virtual next-card handoff when the target card is not present yet, but that option must stay read-only and carry the same non-authority flags as visible-card actions
- every write-capable action references route auth, participant or owner authority, request-specific policy, idempotency, and canonical write boundaries
- every completion-facing card references required `Artifact`, `Fulfillment`, `RequestEvent`, `Transaction`, and owner-review truth instead of relying on workflow success or prompt output
- every n8n import/export mapping declares credential slots, unsupported features, human checkpoints, proof requirements, sidecar requirements, and lossiness
- raw workflow JSON, n8n nodes, A2A tasks, MCP tools, x402 payloads, and adapter runs never become canonical root objects
- forbidden root names such as `Work`, `Job`, `Order`, `Issue`, `Offer`, `Intent`, `Task`, `Workflow`, and `Solution` are rejected or limited to documented UI or adapter language

### Agent-native readiness tests

Verify:

- a fresh agent can discover Boreal from `/llms.txt` and a public agent-start guide without private route knowledge
- `/agents/actions.md` renders public-safe contract-linked walkthroughs for inspect, make request, apply, submit, monitor, run, and optimize intents
- `/agents/action-cards.example.json`, `schemas/json/agent-action-cards.schema.json`, and `fixtures/agent/action-cards.sample.json` render checked human-first action cards for make-request, apply, submit proof, monitor, run, optimize, and recovery UX while preserving canonical read/write and handoff boundaries
- `/agents/workflows.json` renders a machine-readable workflow catalog that names policy checkpoints, required scopes, idempotency-required actions, stop conditions, completion signals, and canonical write boundaries
- `/agents/client-kit.json` and `schemas/json/agent-client-kit.schema.json` render a machine-readable client-generation manifest that groups OpenAPI, JSON Schema, AsyncAPI, validation, preparation, sandbox, and target protocol sources into separate public-read, guardrail, authorized-work, payment, sandbox, and target-adapter client surfaces
- `/agents/journeys.json` and `schemas/json/agent-journeys.schema.json` render machine-readable role journeys for requester, solver, monitor, optimizer, payment, and onboarding agents without becoming workflow authority, permission, payment authority, completion proof, or durable truth
- `/agents/standards.json` and `schemas/json/agent-standards.schema.json` render a machine-readable standards matrix that separates live Boreal contract standards from target MCP, A2A, OAuth delegation, and x402 adapter layers
- `/agents/access-review.json` renders a machine-readable access review profile that tells external agents how operators evaluate conformance reports, requested scopes, rate limits, revocation triggers, decision outcomes, and target adapter claims without issuing credentials or granting permission
- `/agents/auth.json` renders a machine-readable auth profile that names anonymous, account-session, resolver-bearer, and target OAuth-compatible agent classes; required scopes; approval rules; idempotency requirements; and explicit non-grants
- `POST /agents/auth/prepare` and `schemas/json/agent-auth-preparation.schema.json` prepare action-specific auth routing, scopes, approval, request policy, and idempotency requirements before live actions without issuing credentials, granting permission, recording approval, granting production access, authorizing spend, proving completion, or writing durable history
- `/agents/conformance.json` renders a machine-readable conformance checklist that tells agent builders how to verify discovery, auth, human handoff, work actions, proof, payment, recovery, sandbox, and protocol boundaries before production use
- `schemas/json/agent-conformance-report.schema.json` and `fixtures/agent/conformance-report.sample.json` define a report shape for sandbox replay evidence, requested scopes, protocol claims, secret-handling posture, and human-review questions without granting credentials or certification
- `/agents/conformance-report.example.json` renders the checked conformance report sample as a public example package without becoming a submission endpoint, credential, permission grant, certification, approval record, payment authorization, completion proof, or root object
- `/agents/production-access-packet.example.json`, `schemas/json/agent-production-access-packet.schema.json`, and `fixtures/agent/production-access-packet.sample.json` define a checked packet shape for external agents requesting scoped operator review with represented actor, minimal scopes, sandbox evidence, rate limits, human escalation, data handling, idempotency, payment boundary, and target-protocol claims without issuing credentials, granting permission, creating a production sandbox, authorizing spend, or proving completion
- `POST /agents/access-review/prepare` and `schemas/json/agent-access-review-preparation.schema.json` prepare manual operator-review handoff packets for validated production access packets without creating persistent review submissions, issuing credentials, granting permission, recording approval, creating production sandboxes, authorizing payment, proving completion, or writing durable history
- `POST /agents/intake/validate` and `schemas/json/agent-intake-validation.schema.json` validate conformance reports and production access packets before human or operator review without creating a review submission, issuing credentials, granting permission, recording approval, authorizing spend, creating a production sandbox, writing durable history, or proving completion
- `/agents/completion.json` renders a machine-readable completion profile that tells agents what proof packet, Artifact, Fulfillment, RequestEvent, Transaction, and owner-review truth is required before claiming draft-ready, proposal-submitted, proof-submitted, waiting-for-acceptance, run-started, or completed states
- `POST /agents/completion/validate` and `schemas/json/agent-completion-validation.schema.json` validate completion claim packets before agents render or act on proof-submitted, waiting-for-owner, run-started, or completed language without proving completion, closing requests, accepting review, publishing artifacts, advancing fulfillment, authorizing payment, granting permission, or writing durable history
- `/agents/delegation.json` and `schemas/json/agent-delegation.schema.json` render a machine-readable human-first delegation profile that names consent screens, scopes, auth modes, revocation paths, per-action approval expiry, policy checkpoints, and non-grants without issuing credentials, recording approval, authorizing spend, starting fulfillment, or proving completion
- `/agents/evidence.json` renders a machine-readable evidence profile that tells agents how to package delivery, proof, receipts, media, files, redaction statements, review signals, and retry-safe artifact submissions without leaking secrets or claiming completion too early
- `/agents/error-examples.json` renders RFC 9457-style problem examples for auth, scope, idempotency, rate-limit, monitor, fulfillment, payment, and unknown-write failures without turning error envelopes into durable history or retry authority
- `/agents/execution.json` renders a machine-readable execution profile that tells agents when a `Fulfillment` lane may start, why worker sub-work defaults to `FulfillmentStep`, when direct-owner execution is a narrow exception, how to treat runtime signals as ephemeral by default, and when retry or escalation should preserve the same lane
- `/agents/human-handoffs.json` renders a machine-readable handoff profile that tells agents when to ask humans, show drafts, request approval, stop, escalate stale or blocked work, and use precise claim-state language without granting permission or proving completion
- `/agents/human-handoff-packets.example.json` renders checked human-facing packet examples for draft approval, Commitment review, proof review, monitor escalation, and payment authorization without recording approval, granting permission, authorizing spend, or proving completion
- `/agents/http.json` and `schemas/json/agent-http.schema.json` render a unified current-route HTTP reference that names OpenAPI sources, route families, auth, scopes, idempotency, non-HTTP fallbacks, and canonical reads or writes without becoming a new API surface, granting permission, making target adapters live, or proving completion
- `/agents/ux.json` and `schemas/json/agent-ux.schema.json` render a human-first process and UX profile that names discovery, consent, action, monitor, proof review, payment, optimization, and completion surfaces without becoming a workflow engine, approval record, permission grant, payment authorization, adapter, or completion proof
- `/agents/monitoring.json` renders a machine-readable monitoring profile that tells agents how to use `after_sequence`, persist `cursor.nextAfterSequence`, detect stale work, escalate human decisions, and distinguish live cursor polling from target signed push delivery
- `POST /agents/monitoring/prepare` and `schemas/json/agent-monitoring-preparation.schema.json` prepare a cursor polling plan, escalation handoff, and target webhook receiver boundary without reading activity, creating subscriptions, activating signed push delivery, writing heartbeat events, authorizing payment, granting permission, or proving completion
- `POST /agents/monitoring/validate` and `schemas/json/agent-monitoring-validation.schema.json` validate monitor mode, cursor checkpoint persistence, private-access posture, escalation triggers, no-heartbeat behavior, no-completion claims, and target signed-webhook receiver shape without reading activity, granting permission, creating subscriptions, activating push delivery, writing heartbeat events, authorizing payment, or proving completion
- `POST /agents/sandbox/replay` and `schemas/json/agent-sandbox-replay.schema.json` validate sandbox replay scenario id, expected step order, idempotency keys, terminal state, canonical writes, and non-authority boundaries without accepting production access, creating review submissions, issuing credentials, granting permission, creating a production sandbox, authorizing payment, proving completion, or writing durable history
- `/agents/onboarding.json` renders a machine-readable onboarding profile that tells external agents how to move from public discovery to role classification, contract sandbox validation, scoped live HTTP use, target production access review, and target protocol adapter readiness without treating target credentials or adapters as live
- `/agents/opportunities.json` renders a machine-readable read-only opportunity discovery profile that tells agents how to rank public request projections, build local opportunity cards, and choose apply, submit, monitor, run, or optimize next actions without treating fit scores as permission, assignment, payment authority, or completion proof
- `/agents/optimization.json` renders a machine-readable optimization profile that tells agents which brief, proposal, evidence, monitor, and public-solution reuse improvements are draft-only, which facts must not be invented, and which mutations require owner approval
- `POST /agents/optimization/prepare` and `schemas/json/agent-optimization-preparation.schema.json` prepare a draft-only optimization plan, output contract, owner-approval gate, and next preflight handoff without generating content, mutating requests, recording approval, granting permission, authorizing payment, proving completion, or writing durable history
- `/agents/payments.json` renders a machine-readable payment profile that tells agents when public inspection is free, when account-session spend authority is required, which mutations require idempotency, how buyer credit and paid runs reconcile into `Transaction`, and why x402 remains target-only until explicit endpoint activation
- `/agents/prompts.json` renders a machine-readable prompt catalog that tells agents how to draft briefs, applications, proof packets, monitor summaries, optimization suggestions, and recovery packets without treating prompt output as a mutation, approval, proof, payment, or completion event
- `/agents/protocols.md` renders public-safe MCP, A2A, and x402 mapping rules and keeps each protocol below Boreal canonical object truth
- `/agents/protocols.json` renders a machine-readable protocol profile that names MCP, A2A, and x402 roles, official spec URLs, adapter mappings, non-goals, durable writes, implementation order, and canonical boundaries
- `/agents/protocol-adapter-samples.json` renders target-only MCP, A2A, and x402 sample payloads mapped to Boreal HTTP routes, scopes, idempotency, policy gates, canonical writes, and promotion rules without granting permission or making adapters live
- `/agents/recovery.json` renders a machine-readable recovery profile that tells agents when to stop, retry with the same idempotency key, resume from cursor, inspect transaction truth, retry a blocked fulfillment lane, or escalate to a human
- `/agents/readiness.json` renders a machine-readable readiness profile that names live and target capability bands, standard planes, agent UX stages, go/no-go checks, current limitations, and next implementation priorities without granting permission or making target adapters live
- `/agents/tools.json` renders a machine-readable tool registry that maps inspect, make draft, apply, submit proof, monitor, run public solution, reconcile payment, optimize draft, validation, and preparation intents into safe HTTP calls, target MCP/A2A mappings, idempotency, non-authority checks, and canonical write boundaries
- `/agents/write-sandbox.json` and `schemas/json/agent-write-sandbox.schema.json` render the target isolated write-sandbox requirements from decision `0025`, including segregated non-production environment, sandbox credential requirements, process order, minimum flow coverage, activation gates, standards, and explicit non-authority boundaries without issuing credentials, granting permission, authorizing payment, proving completion, or writing durable production history
- `POST /agents/write-sandbox/prepare` and `schemas/json/agent-write-sandbox-preparation.schema.json` prepare decision `0025` activation plans by checking environment, credential, production-rejection, route-enforcement, fixture, human-UX, payment, completion, and operator-handoff gates without issuing credentials, creating a live sandbox, granting production access, authorizing payment, proving completion, submitting review state, or writing durable history
- `/agents/sandbox.md` and `/agents/sandbox.json` render a contract-only sandbox with deterministic mock identities, sample IDs, payloads, replay scenarios, request-level action affordances, request-level action card render hints, and canonical boundaries
- `schemas/json/agent-sandbox.schema.json` and `fixtures/agent/sandbox-manifest.sample.json` stay parseable and aligned with the public sandbox contract
- `pnpm contracts:agent-sandbox` validates sandbox fixture coverage for inspect, request-level action affordances, request-level action card render hints, make-request, apply, submit, monitor, run, signed webhook, optimize, replay, paid-run shape, error examples, human handoff packet examples, production access packet examples, protocol adapter samples, and idempotent recovery flows
- sandbox mock credentials, mock sessions, sample webhook secrets, and sample object ids are never accepted as production mutation authority
- `pnpm web:test:agent-sandbox-production-boundary` verifies production mutation routes reject mock sandbox bearer tokens, mock sandbox sessions, sandbox cookies, and sandbox context headers with `application/problem+json` before actor resolution, body parsing, payment movement, canonical writes, or `RequestEvent` creation
- sandbox replay scenarios may simulate owner acceptance, fulfillment creation, paid-run reconciliation, and recovery order, but they must never claim production writes, credentials, payment settlement, or completion proof
- sandbox replay validation must keep `acceptedByProduction`, `reviewSubmissionCreated`, `credentialsIssued`, `permissionGranted`, `productionSandboxCreated`, `paymentAuthorized`, `completionProven`, and `durableWriteCreated` false
- any future isolated write sandbox governed by decision `0025-agent-isolated-write-sandbox-boundary` must prove environment separation, sandbox credential revocation, production rejection of sandbox credentials, route-level scopes, idempotency, rate limits, seeded sandbox fixtures, RFC 9457-style failures, no real payment movement, no production `RequestEvent` writes, and operator-review handoff before it is marked live
- write-sandbox preparation must keep `acceptedByProduction`, `sandboxCredentialsIssued`, `credentialsIssued`, `permissionGranted`, `productionAccessGranted`, `productionSandboxCreated`, `liveSandboxCreated`, `reviewSubmissionCreated`, `paymentAuthorized`, `completionProven`, and `durableWriteCreated` false for both ready and blocked plans
- `/.well-known/agent-card.json` exposes only public-safe identity, endpoint, capability, auth, and skill metadata
- the public agent card and `/openapi.json` expose the same action catalog for inspect, make request, apply, submit, monitor, run, and optimize intents
- the public agent action preflight endpoint validates pass and fail shapes for inspect, make-request, apply, owner-private direct fulfillment, submit, monitor, run, and optimize prerequisites before real governed routes are attempted, including selected published `Supply`, request-fit fingerprint checks for application actions, and request-flow context enum/non-authority checks when present
- direct named-agent `prepare_application` responses must expose `packetStatus`, `qualificationGate`, and lane-specific `requiredNextAction`, keeping disqualified packets `blocked_until_qualified` with blocked reasons and `canRunSubmissionPreflight=false` before any preflight or sketched mutation attempt
- named Boreal agent `prepare_application`, `scan_request_candidates`, and `scan_public_open_requests` packets must carry route-facing `requestFlowContext` when request constraints provide stage, card, action, preset-plan, or pre-execution metadata, and that context must stay non-authoritative guidance rather than approval or assignment; `/agents/actions/preflight` should reject unknown request-flow values or missing context non-authority flags
- named Boreal agent `prepare_application`, `scan_request_candidates`, and `scan_public_open_requests` packets must carry a lane-specific `submissionPreflight` handoff requiring `/agents/actions/preflight`, `apply_to_request` for commitment applications or `create_owner_private_fulfillment` for owner-private direct fulfillment, represented actor, idempotency, visible `requestFit`, route-facing `requestFlowContext` when present, a concrete `preflightRequest` body, selected `Supply`, `agentActionPolicy`, and lane-specific route-policy rechecks before any sketched `Commitment` or `Fulfillment` route can be attempted
- static named-agent contract assets must expose `scan_public_open_requests`, `RequestFlowContext`, and request-flow preflight fields so agent discovery, OpenAPI, JSON Schema, and prepared application packets stay machine-readable and synchronized
- home-beta showcase cards and workrooms must reuse the public request worker-readiness projection so human and named-agent readiness appears as listing guidance without assigning workers, creating `Commitment`, starting `Fulfillment`, or attaching `Supply`
- named Boreal agent board and scan paths must respect public projection `Request.derived.workerEligibility` skip guidance for human-first, raw-not-planned, and no-agent-signal requests before preparing application packets, while allowing explicit human-first agent-support roles to wake compatible named agents
- named Boreal agent packets must carry `authorizedExecutionHandoff` for multi-step model, provider, tool, proof, and retry sequencing while keeping provider calls blocked before authorized fulfillment and excluding secret values
- direct commitment route-handler contract tests must expose selected-supply mismatch as `bad_request:api` and pass the selected `supplyId` through to `Commitment` creation when route policy accepts it
- direct fulfillment route-handler contract tests must expose missing Boreal-managed worker-key approval as `bad_request:api` instead of a generic database failure, and must pass the matching worker key through when present
- no-commitment direct fulfillment creation must reject missing `ownerPrivateDirectApproval`, missing selected `Supply`, selected-supply mismatch, missing Boreal-managed worker key, and worker-key mismatch before creating `Fulfillment`, `FulfillmentStep`, or `RequestEvent` truth
- the public agent card and `/openapi.json` link to the workflow catalog and keep workflows below `Request` truth
- each catalog action names canonical reads, canonical writes, availability, auth boundary, standard contract links, and guardrails
- public request projections expose request-level `agentActionAffordances` that map concrete request ids to inspect, apply, submit, monitor, run, and optimize affordances without exposing owner-only routing or granting mutation authority
- public request projections expose request-level `agentActionCardHints` that map concrete request ids to human-visible card labels, CTAs, policy checkpoints, handoff prompts, canonical reads, and conditional writes without exposing owner-only routing or becoming permission, approval, payment authority, durable history, or completion proof
- public request projections may expose `derived.workerEligibility` as read-only scanner guidance while still excluding owner-only routing, full candidate pools, match internals, and any permission or assignment claim
- request detail reads expose request-level `agentActionPolicy` decisions that distinguish anonymous, session, and resolver actors; resolver decisions should report missing scopes instead of implying permission
- request detail reads expose actor-specific `agentActionCardHints` derived from `agentActionPolicy`, and blocked or missing-scope cards must render stop or recovery requirements instead of implying the agent can proceed
- agent start, action playbook, workflow catalog, UX profile, client kit, tool registry, and readiness profile all describe `agentActionCardHints` as render hints and keep `agentActionPolicy` as the write permission gate
- public OpenAPI exports expose machine-readable `security` requirements, `BorealAccountSession`, `ResolverBearer`, `x-boreal-auth-boundary`, and `x-boreal-required-scopes` where live agent-facing routes enforce session or resolver gates
- the public agent access review profile stays operator-review policy and does not issue credentials, grant permission, certify an agent, record human approval, authorize spend, prove completion, or make target protocol adapters live
- the public agent auth profile keeps OAuth-compatible external-agent authorization as target direction unless a live route contract says otherwise
- the public agent auth preparation endpoint stays plan-only and does not issue credentials, grant permission, record human approval, grant production access, authorize spend, prove completion, write durable history, or override live endpoint policy
- the public agent conformance profile stays a checklist and does not certify an agent, grant production credentials, record human approval, authorize spend, or prove completion
- the public agent conformance report stays operator-review input and does not become a production credential, permission grant, human approval record, payment authorization, completion proof, or canonical root object
- the public agent conformance report example stays sample evidence shape and does not submit access requests, grant production access, certify agents, or record operator approval
- the public production access packet example stays operator-review input and does not submit access requests, issue credentials, grant permission, record operator approval, authorize spend, create a production sandbox, certify agents, prove completion, or become a canonical root object
- the public agent access review preparation endpoint stays handoff-only; both pass and fail responses must keep `acceptedByProduction`, `reviewSubmissionCreated`, `credentialsIssued`, `permissionGranted`, `productionSandboxCreated`, `paymentAuthorized`, `completionProven`, and `durableWriteCreated` false
- the public agent intake validation endpoint stays preflight-only; both pass and fail responses must keep `acceptedByProduction`, `reviewSubmissionCreated`, `credentialsIssued`, `permissionGranted`, `paymentAuthorized`, and `completionProven` false
- the public agent action preflight endpoint stays validation-only; both pass and fail responses must keep `permissionGranted`, `approvalRecorded`, `credentialIssued`, `paymentAuthorized`, `completionProven`, and `durableWriteCreated` false
- the public agent action card examples stay render examples only and must not become permission grants, human or operator approval records, payment authorizations, `Commitment` proposals, `Artifact` publications, request mutations, durable `RequestEvent` records, retry authority, or completion proof
- the public agent client kit stays a descriptive generation manifest and must not become a generated SDK package, production credential, permission grant, operator approval record, new API surface, adapter implementation, payment authority, completion proof, or durable truth object
- the public agent journey profile stays a descriptive role map and must not become a workflow engine, permission grant, credential issuer, approval record, payment authorization, completion proof, adapter, generated SDK package, or canonical root object
- the public agent standards profile stays a descriptive standards matrix and must not become an adapter implementation, permission grant, credential issuer, approval record, payment authorization, completion proof, generated SDK package, workflow engine, or canonical root object
- the public agent completion profile keeps chat output, MCP tool success, A2A task status, provider callbacks, runtime logs, and payment settlement below canonical completion truth unless promoted into `Artifact`, `Fulfillment`, `Transaction`, or `RequestEvent` records
- the public agent completion validation endpoint stays validation-only; both pass and fail responses must keep `completionProven`, `requestClosed`, `reviewAccepted`, `artifactPublished`, `fulfillmentAdvanced`, `requestEventWritten`, `paymentAuthorized`, `permissionGranted`, and `durableWriteCreated` false
- the public agent delegation profile keeps consent screens, scope strings, OAuth grants, resolver bearer tokens, session cookies, and revocation receipts below `Request` truth; it must not issue credentials, grant permission, record human approval, authorize spend, start fulfillment, prove completion, or become a canonical root object
- the public agent evidence profile keeps evidence packets, file uploads, screenshots, provider callbacks, tool traces, MCP tool results, A2A artifacts, and runtime logs below `Request` truth; `Artifact` remains the durable evidence object
- the public agent evidence validation endpoint stays preflight-only; both pass and fail responses must keep `artifactPublished`, `reviewAccepted`, `completionProven`, `paymentAuthorized`, `permissionGranted`, and `durableWriteCreated` false
- the public agent error examples keep HTTP problem details, retry attempts, rate-limit responses, provider errors, x402 payloads, and webhook delivery attempts below `Request` truth; problem envelopes must not grant permission, record approval, authorize payment, write history, or prove completion
- the public agent execution profile keeps runtime sessions, desktop threads, provider tasks, MCP sessions, A2A tasks, x402 payments, stdout, local logs, and tool traces below root truth; `Fulfillment` and `FulfillmentStep` remain execution truth under `Request`
- the public agent human handoff profile keeps approval prompts, notifications, UX cards, A2A tasks, MCP tools, runtime logs, and chat transcripts below `Request` truth; it must not record approval, authorize spend, create a workflow engine, or claim completion by itself
- the public agent human handoff packet examples keep handoff cards, decision prompts, agent scratchpads, notifications, MCP tool results, A2A tasks, x402 payloads, runtime logs, and chat transcripts below `Request` truth; they must not become approval records, payment authorizations, production credentials, or completion proof
- the public agent HTTP profile keeps HTTP routes, OpenAPI operations, problem details, idempotency keys, tool responses, and the profile itself below `Request` truth; it must not become a new API surface, permission grant, credential issuer, MCP server, A2A adapter, x402 endpoint, or completion proof
- the public agent monitoring profile keeps monitor loops, heartbeats, cursor checkpoints, webhook deliveries, local timers, notifications, A2A task status, and MCP polling results below `Request` truth unless a governed route promotes real business truth
- the public agent monitoring validation endpoint keeps monitor-plan checks below `Request` truth and must return false for subscription persistence, push activation, heartbeat event creation, `RequestEvent` writes, payment authorization, permission grants, durable writes, and completion proof
- the public agent onboarding profile keeps production access packets, sandbox evidence, OAuth-compatible delegation requests, MCP client info, A2A agent card URLs, and x402 payment metadata below `Request` truth; it must not issue credentials, grant production access, authorize writes, or prove completion
- the public agent opportunity discovery profile keeps opportunity cards, fit scores, ranked lists, recommended actions, public board rows, and agent-local caches below `Request` truth; it must not grant permission, assign supply, create a match result, start fulfillment, authorize payment, or prove completion
- the public agent optimization profile keeps suggested patches, prompt rewrites, analysis notes, MCP prompts, A2A messages, and tool traces below durable truth unless a human approves a governed mutation path
- the public agent optimization preparation endpoint stays plan-only; both pass and fail responses must keep `durableWriteCreated`, `requestMutated`, `commitmentSubmitted`, `artifactPublished`, `fulfillmentStarted`, `ownerApprovalRecorded`, `policyOverridden`, `permissionGranted`, `paymentAuthorized`, and `completionProven` false
- the public agent payment profile keeps buyer-credit support ledger truth distinct from request-attached `Transaction` truth, blocks resolver bearer spend authority in live routes, and prevents `Order`, x402 payload, PayPal order, stablecoin hash, or credit debit from becoming a canonical root or completion proof
- the public agent prompt catalog keeps prompt outputs, MCP prompts, local drafts, recovery packets, proposal drafts, proof packet drafts, and monitor summaries below durable truth until a governed route writes `Request`, `Commitment`, `Artifact`, `Fulfillment`, `Transaction`, or `RequestEvent` truth
- the public agent readiness profile keeps OAuth-compatible external-agent auth, MCP, A2A, x402, signed push delivery, and production sandbox credentials target-only until live contracts exist, while still pointing agents to live HTTP, JSON Schema, AsyncAPI, auth, completion, recovery, and sandbox surfaces
- the public agent tool registry keeps MCP tools and A2A operations target-only until adapters exist, preserves HTTP as the live invocation baseline, and prevents tool calls, tool success, raw traces, MCP resources, MCP prompts, or A2A tasks from becoming canonical roots
- public agent tool-registry validation and preparation entries remain non-write tools; they must not execute actions, persist approvals, publish artifacts, accept review, authorize payment, grant permission, prove completion, or write durable history
- the public agent UX profile keeps UX cards, consent sheets, monitor panels, optimization diffs, and completion banners below canonical `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, and `RequestEvent` truth
- the public agent protocol adapter samples keep MCP tool calls, A2A tasks, A2A artifact envelopes, and x402 payment payloads target-only and below `Request`, `Artifact`, `Transaction`, and `RequestEvent` truth until governed routes promote them
- public agent discovery links resolve to public-safe OpenAPI, JSON Schema, and AsyncAPI contracts
- `apps/web/tests/contracts/agent-discovery.test.ts` covers the public agent card, start guide, action playbook, client-kit manifest, journey profile, standards profile, sandbox guide, sandbox manifest, action catalog, discovery index, allowlisted contract assets, and absence of obvious secret material in exported contracts
- public request inspection remains anonymous-safe and excludes draft, private, owner-only routing, private transcript, and planner-internal fields
- an agent can prepare an auth route plan for an action and receive required scheme, scope, approval, policy, and idempotency feedback while pass and fail responses keep credential, permission, payment, completion, and durable-write flags false
- an agent can validate a completion claim packet through `POST /agents/completion/validate` and receive matched rule, required truth, missing fields, warnings, and safe next steps while pass and fail responses keep closure, review, artifact, fulfillment, payment, permission, completion, and durable-write flags false
- an authenticated requester agent can draft or update a request without opening it automatically
- an authenticated solver agent can propose a commitment through the same request-bound commitment endpoint a human responder would use
- an authenticated solver agent can publish artifacts only after commitment acceptance or owner-private direct authorization
- an agent monitor can read durable request activity with `after_sequence`, persist `cursor.nextAfterSequence`, and resume from that stable checkpoint without promoting heartbeats into `RequestEvent`
- an agent monitor can prepare a cursor polling plan through `POST /agents/monitoring/prepare` and receive escalation handoff context without reading activity, creating subscriptions, activating signed push delivery, writing heartbeat events, granting permission, authorizing payment, or proving completion
- an agent monitor can preflight a poll-cursor monitor plan through `POST /agents/monitoring/validate` and receive missing fields or warnings without creating a subscription, activating signed push delivery, writing heartbeat events, or proving completion
- an agent can prepare draft-only optimization through `POST /agents/optimization/prepare` and receive allowed surface, no-invention rules, output contract, owner-approval gate, and next preflight guidance while pass and fail responses keep mutation, approval, payment, completion, and durable-write flags false
- cursor-resumed request activity reads return newer events in replay order; latest reads without `after_sequence` remain newest-first
- signed monitor webhook profile helpers should sign and verify raw callback bodies with `Boreal-Webhook-*` headers, reject tampered bodies, and enforce timestamp tolerance
- MCP tools, when implemented, enforce the same scopes, idempotency keys, and business gates as HTTP routes
- A2A tasks, when implemented, map to Boreal request-bound operations without replacing `Request` as the durable root
- A2A artifacts, when implemented, map to Boreal `Artifact` truth and preserve owner review requirements
- x402-paid agent calls, when implemented, reconcile into Boreal `Transaction` truth and do not imply fulfillment completion by themselves
- `standards/agent-protocol-profile.md` stays listed in `standards/README.md` and preserves the same MCP/A2A/x402 boundaries as public discovery

### Idempotency tests

Verify:

- `pnpm contracts:idempotency` covers the seeded payment, buyer-credit, commitment, artifact, and fulfillment mutation replay contract
- duplicate create actions do not fork business truth
- duplicate payment verification does not double-settle
- duplicate buyer-credit top-up or apply-credit requests with the same idempotency key do not double-change credit balance
- duplicate curated service checkout requests with the same idempotency key do not fork the `Request` or double-debit buyer credit
- duplicate PayPal return capture and verified PayPal webhook delivery for the same buyer-credit top-up do not double-settle available credit
- duplicate request transaction requests with the same idempotency key do not create duplicate request-attached transactions
- duplicate request-grant contributions with the same idempotency key do not double-fund the request
- duplicate solution-run credit requests with the same idempotency key do not double-debit buyer credit or fork duplicate run requests
- duplicate `POST /api/requests/{id}/solution-runs` calls with the same idempotency key return the same run `Request`, source artifact reference, buyer-credit debit, and request `Transaction`
- duplicate reusable-prompt runs with the same idempotency key return the same private chat fork and do not create duplicate chats, debit buyer credit, or create transaction truth
- duplicate event replay does not double-apply side effects

### Payment webhook tests

Verify:

- PayPal create-order creates one pending buyer-credit ledger entry and stores the PayPal order reference without creating a request `Transaction`
- PayPal return capture settles only a matching authenticated owner's pending buyer-credit ledger entry
- PayPal webhook handling rejects missing or failed PayPal signature verification before any ledger mutation
- PayPal webhook and checkout errors returned to callers do not include upstream PayPal response bodies or processor diagnostics
- PayPal `PAYMENT.CAPTURE.COMPLETED` webhook settlement moves pending credit to available credit exactly once
- PayPal capture amount and currency must match the pending buyer-credit ledger entry before settlement

### Replay and projection tests

Verify:

- request summaries rebuild from the event stream
- event ordering is stable within a request
- deleted projections can be rebuilt

### Repository topology tests

Verify:

- no unregistered top-level namespaces are introduced
- every active namespace root has `README.md` and `AGENTS.md`
- every active workspace root has `README.md` and `AGENTS.md`
- active workspace registry matches actual folders
- workspace docs agree with root canon
- app, package, skill, and standards workspaces do not redefine canonical root object names
- generic workspace names such as `network-node`, `node2`, or `misc` are blocked unless explicitly approved in canon docs
- root manifests and workspace manifests agree on active JS or TS workspaces
- account-auth decisions stay aligned with accepted web auth canon instead of drifting back to email-only or runtime-collapsed assumptions
- docs contain no unresolved merge-conflict markers
- every strategy and decision file is discoverable from its directory README
- strategy and decision README files expose lifecycle state registers
- active pilot, launch, and document-lifecycle docs stay discoverable from `docs/README.md` and `docs/INDEX.md`

### Request-processing contract tests

Verify:

- `pnpm contracts:reusable-prompts` covers deterministic reusable prompt analysis and free chat-fork fixture invariants
- not every chat turn creates a durable request
- entering `New request` mode alone does not create a durable request
- fuzzy chat-only clarification sends in `New request` mode may save private chat history and ask one focused briefing question without creating a durable request
- web briefing-workspace submits in `New request` mode create or update one draft request through hidden briefing-source turns instead of visible user bubbles or completed draft tool rows
- pre-open briefing composer keeps the raw submitted prompt visible, disables while loading, and enables resubmission only after the prompt or attachments change
- `New request` mode creates at most one draft request once the brief is ready enough for useful plans or the buyer explicitly asks to create it
- raw request planner mode creates or updates one draft request from buyer text without LLM briefing, title or summary polish, body-derived key generation, generated phases, generated roles, candidate matching, execution classification, assignment copy, route summary, or proof-planning projections
- raw request drafts can switch back to assisted planning on the same `Request`, preserve the buyer-authored body, and rebuild planner projections without forking request history
- preflight preview fields should be UI projections from chat history and must not create a `Request`, `RequestEvent`, `Artifact`, `Transaction`, planner output, or fulfillment truth
- selecting one supply from the supply hub may pin preflight context without creating a durable request
- an explicit create-from-supply action may create one private draft request and pin `routing.preferredSupplyId` without auto-sending synthetic prompt text
- request creation with `preferredSupplyId` should return the draft with seeded `seeking` and worker-facing output defaults when those fields were still empty
- owner-private preferred-supply draft seeding may also add truthful route-facing derived defaults such as candidate pool, route family, execution kind, payment mode, matching mode, and route summary
- supply-started draft requests should not auto-open the raw request-object panel before the owner writes the worker prompt
- home beta work cards should expose a typed taxonomy with `Request` as canonical root, listing kind, worker attachment state, next canonical boundary, explicit in/out scope, shared request-flow stage/card binding, actor modes, authority boundary, and next action intents
- `pnpm web:test:request-flow-taxonomy` should keep the actor-neutral request-flow taxonomy schema, fixture, TypeScript profile, public schema registry, closed stage/card enums, authority gates, write/idempotency requirements, and n8n sidecar/lossiness rules aligned before drag-to-mutate or import/export behavior can be added
- service request starter cards should show service path known but worker or `Supply` attachment pending until checkout or request routing, and must not count the worker slot as completed
- service families should carry typed request defaults and request-flow metadata so Human Editorial Polish projects as `human_service` plus `documentation_support`, starts at `request_intake`, and stays under owner-approval/no-assignment authority instead of generic `provider_capability` or live worker supply
- service preset plans should declare their request-flow plan stages, pre-execution gates, and planned action intents before they can be reused by home/beta cards, request prefill, or future agent scanning
- service plan request prefill should include visible routing context, request-flow stage/card metadata, and no-assignment boundary text instead of silently granting worker, `Supply`, `Fulfillment`, or `Artifact` authority
- request-briefing prompt and normalizer contract tests should keep `Service routing context:` as route-facing starter defaults that may seed structured actor, supply, output, service-family, service-plan, attachment-mode, request-flow stage/card, next-action, preset-plan-stage, and pre-execution fields without becoming buyer-authored scope, worker assignment, `Supply` attachment, proof, payment authority, or completion truth; coverage should include human-service, provider-video, and provider-handoff service starters
- request-briefing assist or optimizer profiles in request mode must still create at most one draft request on first send
- request draft extraction is deterministic for canonical fixtures
- request-briefing assist or optimizer profiles may improve wording clarity but must not invent budget, deadline, deliverables, actor requirements, or constraints
- request-briefing and planner flows must surface non-substitutable embodied work instead of flattening it into digital-only tasks
- live-model request-processing benchmark runs must capture frozen prompt preset id, model id, temperature, seed, and raw provider request-response metadata for later audit
- live-model request-processing benchmark runs should report exact contract metrics and separate semantic-coverage metrics so label drift is visible without being confused for planning collapse
- live-model request-processing benchmark runs should also separate provider-call success, JSON-parse success, and post-parse planning quality so unavailable models are not misread as planning regressions
- only `open` plus `public` requests appear in the public request pool
- draft and private requests do not leak through public request fetch endpoints
- public solution projections require completed public requests with `activeRefs.acceptedArtifactId`
- draft request-object JSON accepts edits only while the request status is `draft`
- non-draft request-object JSON is read-only and shows the full canonical object
- `save draft` and `open request` normalize the latest draft-input projection before the durable `Request` is written
- draft request-input JSON accepts edits only for `visibility`, `brief`, `seeking`, `budget`, and `deadline`
- draft request-input JSON should reject or ignore attempts to persist ids, status, routing, active refs, latest summary, timestamps, or planner-derived fields
- inline draft briefing edits accept only buyer-authored `brief` fields, buyer-authored constraints such as location, time, and proof, plus `budget` and `deadline`
- title plus body should be enough for `ready_to_open`; `brief.summary` should stay optional
- one-turn request briefing should preserve explicitly stated budget or deadline in structured canonical fields instead of only embedding them in freeform brief text
- request mode may ask clarifying questions before draft readiness when missing location, access, timing, or proof fields materially change embodied execution safety
- request mode should ask one focused briefing question at a time before draft creation when the ask is fuzzy
- draft creation should render an inline briefing or plan review in the chat timeline instead of leaving only completed tool-call UI
- request-intake pending state should render the same plan/review container skeleton that will receive the generated draft, and should suppress generic `Thinking...` while that skeleton is visible
- raw draft review should show the captured request and open readiness only, with no fallback plan steps, planner-pending phase, flow-plan nodes, or generated proof notes
- draft inline plan review should offer a compact stepper and optional flow review without replacing pre-open request mode with a planner dashboard
- draft flow review should render `Request` plus one or more parallel `Plan` cards and must not show worker or delivery nodes before the request opens
- draft flow review should reuse the same buyer-facing plan-step projection as the stepper, with numbered plan cards and non-overlapping fixed-height flow nodes
- flow, stepper, and task-board cards should share the same buyer-facing process-card surface, including status-accent badges, icons, descriptions, checklist rows, tags, and selected-card affordance without generating separate plan content
- flow-card drag actions should be typed by card kind: `Request` to request-plan projection, `phase` or `stage` to worker application preparation, `worker` to delivery review, and `delivery` or `step` to proof inspection, with every action preserving non-authority flags before any real mutation route
- editing a user chat message and resending should delete trailing owned messages, append the replacement prompt, show pending generation feedback, and avoid leaving the old assistant answer in the visible timeline
- chat transcript and edit-resend cleanup endpoints should reject malformed chat or message ids before database access so bad client state is reported as API input failure instead of opaque database failure
- chat transcript reads should keep draft or private request envelopes owner-only while allowing public opened request envelopes without the owner's private transcript
- chat/message hot-path indexes should cover owner history, transcript load, edit-resend cleanup, and hourly quota counting before request chat volume can turn those routes into scan-heavy database failures
- `Open request` should remain disabled until `readyForOpen` is true
- public storefront, exterior, or street-facing photo requests should become `readyForOpen` when geography, timing, and proof are clear, without forcing `access_requirements` unless controlled access, pickup, dropoff, or handoff is stated
- draft-mode plans should not expose supply path, role candidates, workers, capability lanes, feasibility grids, ranking, or assignment projections to the primary buyer preflight surface
- structured matching intent should land in top-level `seeking` rather than relying on generated `brief.tags`
- selected or pinned supply should stay in `routing.preferredSupplyId` and must not be rewritten into fake buyer-authored brief text
- preselected supply may narrow the likely route but must not imply a real match or assigned worker before matching, selection, or fulfillment attachment actually happened
- preselected supply may make the request feel faster, but must not bypass clarification, proof, funding, approval, or safety rules
- pinned supply that does not yet truthfully fit the current route should stay candidate-only in planner outputs instead of becoming selected lead truth
- clearing pinned supply should remove only the preferred-supply route bias and must not leave stale direct-route hints in draft-derived state
- owner-safe planner prompt context may include preferred-supply and bounded candidate-supply summaries after retrieval, while responder or public lanes must not inherit owner-private routing hints
- open request rooms should not force every user message through draft brief mutation tools
- owner support chat in an opened request should retain the private briefing transcript and continue as chat history without turning every turn into `RequestEvent` activity
- public responders or outside viewers should not receive the owner's private preflight transcript through the open request chat context by default
- public open request activity should be fetchable from a durable request activity endpoint
- public open request detail should be fetchable by id through a direct request API surface
- direct request commitment and artifact endpoints should create durable activity without going through the chat route
- request activity reads should validate `after_sequence` and `limit`, cap the limit, and return a cursor envelope that agents can safely persist
- request activity webhook receivers, when implemented, should deduplicate by delivery id and persist the same `cursor.nextAfterSequence` checkpoint used by polling monitors
- direct request commitment and artifact endpoints should honor idempotency keys on retry
- direct commitment accept endpoints should honor idempotency keys on retry
- direct fulfillment create and update endpoints should honor idempotency keys on retry
- owner-facing workroom actions should be able to roleplay a public request through commitment proposal, commitment acceptance, fulfillment creation, proof artifact publication, delivery, and owner acceptance without bypassing the canonical endpoints
- direct commitment proposal with `supplyId` should reject unpublished, wrong-owner, or wrong-resolver-binding supply rows
- direct commitment proposal with `supplyId` should reject owned and published supply rows that do not overlap the request structured `seeking.supplyKinds` or `brief.outputKinds` when those fields are present
- direct fulfillment create should require an accepted commitment
- direct fulfillment create may omit commitment only for owned private requests driven by the same owner through the desktop auto-resolution lane
- direct fulfillment create with `supplyId` should reject unpublished, wrong-owner, or wrong-resolver-binding supply rows
- direct fulfillment create with `supplyId` should reject owned and published supply rows that do not overlap the request structured `seeking.supplyKinds` or `brief.outputKinds` when those fields are present
- owner-private direct fulfillment create may attach one valid `routing.preferredSupplyId` when no explicit `supplyId` was passed
- owner-private first-party service fulfillment may be created from an `open`, `funded`, `in_progress`, or `waiting_for_owner` request without creating a second root object
- accepted responder lanes should be able to create fulfillment after owner acceptance
- direct fulfillment updates should reject invalid state transitions
- funding-required requests should not start fulfillment directly in `active`
- fulfillment planning for embodied or verification-heavy work should derive explicit execution modality and proof requirements before closure becomes possible
- owner-scoped request routing updates should allow set or clear of `routing.preferredSupplyId` only on private requests
- pinned-supply request drafts should surface the selected worker in the UI while keeping the editable brief buyer-authored
- specialized pinned supplies should not expand one generic worker lane into duplicate derived role slots when one worker is already selected
- opening one owner-private request with a pinned Boreal-managed worker may auto-create one fulfillment lane and should preserve worker prompt plus provider status in fulfillment metadata
- retryable first-party worker failures should move that same fulfillment lane to `blocked`, keep worker recovery metadata, and avoid terminally failing the request immediately
- `POST /api/fulfillments/{id}/retry` should resume the same blocked fulfillment lane and reuse stored output when the worker already finished provider execution
- `POST /api/fulfillments/{id}/retry` may also check the same active first-party worker lane when a queued provider task id is already saved, without spawning a second fulfillment
- public request projections should not expose `routing.preferredSupplyId`
- execution-grade artifacts should require an accepted commitment or active fulfillment role instead of arbitrary public responder access
- artifact publication should accept both document-backed content and richer external or object reference containers
- artifact publication should preserve optional `fulfillmentId` and `stepId` lane bindings when provided
- first-party worker artifact descriptor tests should accept document-backed content for text-like worker deliveries, accept external or object references for provider-backed assets, and keep worker handoff separate from completion authority
- video media artifacts should render an authorized inline preview from the stable object reference without exposing private storage as buyer-authored brief text
- generated plans, summaries, or chat text should not satisfy embodied proof obligations by themselves
- request grants should remain optional funding attached through participant, commitment, transaction, and event truth instead of creating a new root object
- request-grant prompts should not be rewritten into investment, yield, dividend, passive revenue-share, or tax-deductible donation claims
- solver grant payouts should require accepted work or explicit accepted review/award conditions
- public solution surfaces should require accepted artifacts and completed or accepted request truth
- inspecting a public solution should not consume credits, create transaction truth, or reopen the source request
- running a public solution should consume credits only when inference, provider API calls, workflow execution, human review, or service capacity is used
- public solution run creation should require one completed public source `Request`, one matching accepted `Artifact`, an authenticated buyer session, a positive credit amount, and an idempotency key
- paid solution runs should write credit debit and transaction truth to the run request, not mutate the completed source request
- solution forks or private adaptations should create a new `Request` referencing the source artifact instead of mutating the completed source request
- reusable prompt analysis should detect deterministic fields in public or owned scratch-chat user messages without creating requests, credits, transactions, artifacts, or events
- reusable prompt analysis should infer `[20/05/1996]` near `date of birth` as `date_of_birth`
- reusable prompt run creation should require a user text source message, authenticated session, required input values, an idempotency key, and quota availability
- reusable prompt run creation should reject assistant messages and missing required variables before creating the forked chat
- reusable prompt run creation should create a private scratch chat and store source chat id, source message id, source user id, template text, input values, run chat id, and quota policy under the forked user message provenance
- reusable prompt run creation should not create a `Request`, debit credits, create a ledger entry, or create request `Transaction` truth in V1
- reusable prompt daily quota should default to `10` free chat forks and increase to `20` after any settled buyer-credit top-up history
- reusable prompt token limits should be environment-controlled and enforced before the forked chat is created
- reusable prompt execution should publish a generated assistant answer in the forked chat when the model route succeeds, or preserve the filled user prompt and show a chat-level failure message when execution fails
- live-model benchmark scoring should not depend on a second judge LLM when exact contract or metric-based scoring already exists
- auto-improve eval runs should produce sanitized audit bundles with raw Promptfoo output, command logs, config snapshots, git state, failure classification, and non-mutating recommendations before any prompt or model-default change is made
- default nano chat routing should promote context-heavy request turns to `openai/gpt-5.4-mini` and preserve the fallback order `openai/o3-mini`, `openai/o4-mini`, `openai/gpt-5-mini`, `openai/gpt-4.1-nano` without changing the tool allowlist or mutation schemas
- the chat composer OpenAI picker should expose only the evaluated chat rotation set and should not persist or submit stale unevaluated cookie-selected models
- direct OpenAI should be the first provider attempt whenever `OPENAI_API_KEY` is configured, with Vercel Gateway retained only as the fallback provider route
- model-routing eval output should record light, token-heavy, active-request-heavy, message-heavy, activity-heavy, explicitly requested rotation, and pinned-model cases without calling provider APIs
- Promptfoo app-path evals should run a guest-auth/database preflight before `/api/chat` scoring so Neon/auth failures do not get misread as answer-quality regressions
- Promptfoo no-DB eval fallback should require an explicit local env flag and header, skip durable writes, dry-run request-brief tool output, and label the run as prompt/tool scoring only rather than persistence or auth coverage
- typing, token deltas, progress ticks, heartbeats, presence, transient runtime logs, and raw tool stdout or stderr should not create default durable request history
- resolver device approval should not issue tokens before explicit Boreal account approval
- resolver refresh rotation should revoke or replace the previous refresh token
- revoked resolver tokens should fail on subsequent request writes
- desktop resolver flows should preserve auth separation between Codex runtime identity and Boreal request-actor identity
- desktop auto-resolve toggle should only act on owned private requests when the auto mode is enabled
- desktop auto-resolve should create durable fulfillment and artifact events even when it skips commitment creation
- request-level preferred supply should outrank the desktop default supply during auto-resolve
- configured but unavailable request override or desktop default supply should block auto-resolve instead of silently falling back
- desktop tracked-request execution should bind one local thread to one selected `Request` and optional `Fulfillment` lane without syncing the full local transcript by default
- desktop should block `Full` runtime for public or external tracked request lanes
- desktop should force public or external tracked request lanes onto a dedicated `.boreal-work` request workspace instead of the app repo root
- desktop should clear extra writable roots and keep network off for public or external tracked request lanes even if broader local settings exist
- desktop localhost bridge should bind to `127.0.0.1` only, require a valid session token, and reject non-localhost origins
- desktop localhost bridge should reject missing `Origin` headers on HTTP routes instead of treating non-browser local requests as browser-safe
- desktop localhost bridge `/discover` should stay localhost-origin constrained, expose only local bridge-link metadata plus separate local readiness states for bridge, Codex worker, and Boreal resolver, never expose the live session token or token-bearing URLs, and never become a durable Boreal identity or request ledger
- desktop localhost bridge `/discover` may expose local desktop auto-resolve policy, desktop-default supply selection, and desktop-default Codex model or reasoning selection, but those fields must remain local runtime hints and must not override durable request routing truth
- desktop localhost bridge `/models` should require the same valid session token, stay localhost-origin constrained, and return only the connected desktop runtime model catalog instead of a second Boreal model ledger
- desktop localhost bridge `POST /chat` should require the same valid session token, stay localhost-origin constrained, and dispatch only one local runtime turn instead of becoming a second durable Boreal chat ledger
- desktop-model web chat dispatch should keep normal web models on the existing `/api/chat` path, while only selected `Codex/Desktop` models branch through the localhost bridge
- desktop-model web chat dispatch should stay blocked for draft request briefing lanes so request-object mutation still runs through Boreal request tools first
- matching-lab provider or LLM normalization should require a signed-in regular account, enforce route-level rate limiting, and keep heuristic parsing as the only unauthenticated mode
- resolver device-start should be rate-limited before creating pending resolver client or authorization records
- problem-intel promotion writes should require `PROBLEM_INTEL_EDIT_TOKEN` in every environment and should not reopen just because `NODE_ENV` is non-production
- desktop peer runtime should create or reuse one stable peer keypair under `.boreal-work/desktop/peer-runtime.json`
- desktop peer runtime should listen on the Boreal control topic and expose its listening state without changing Boreal actor identity semantics
- request-bound desktop turns should be able to join a Boreal request topic through the embedded peer host without promoting peer transport state into durable request truth
- timeline cards should be reconstructible from `RequestEvent` plus related object refs, with `pnpm contracts:request-room-replay` covering the seeded public-pilot lane
- route classification follows canon and complexity policy
- lead-match flow happens before decomposition for complex work
- planner outputs stay derived and rebuildable
- planner-derived lead role, role slots, phase plans, execution profile, and proof-planning fields stay outside the buyer-authored brief surface
- `leadRole` and `roleSlots` remain the canonical planner field names even when the UI explains them as capability or worker-type language
- planner outputs stay capability-first before they imply assignment-first execution
- additive planner outputs such as `outcomeClaims`, `matchCandidates`, `leadRanking`, `roleMatches`, `workerEligibility`, `assignmentProposal`, and `replanReasons` stay read-only and rebuildable
- planner-derived `workerEligibility` must classify human-first skip, human-first agent-support, raw-not-planned, no-agent-signal, and wake-named-agents cases from canonical fingerprints without assigning supply, creating commitments, starting fulfillment, calling providers, authorizing payment, writing events, or proving completion
- output-only planner hints such as `draft`, `file`, `handoff_doc`, `media`, or `video` must not wake named agents unless paired with an agent actor, agent-capable supply, agent execution kind, or agent role-slot signal
- retrieved planner candidate snapshots should truthfully rebuild `candidatePool`, `leadRanking`, and `roleMatches` from real `Supply` rows without implying attached execution
- planner outputs must not imply a real match is attached before matching actually happened for that request flow
- planner outputs must preserve embodied, local-runtime, and verification-heavy work as first-class planning realities
- plan-collapse detection should trigger clarification or block-and-escalate when required embodied work is being omitted
- public request-pool projections should not expose the full planner-internal projection by default
- public request-pool projections should include public-safe action affordances, with `run_public_solution` present only when completed public solution truth exists through `activeRefs.acceptedArtifactId`
- the request plan panel should expose typed matching fingerprints plus `matchCandidates`, `leadRanking`, `roleMatches`, and `assignmentProposal` as read-only derived projections rather than editable buyer-authored fields

### In-house worker application tests

Verify:

- in-house Boreal worker scanners read open, owned, or owner-approved request projections without mutating `Request`, `Commitment`, `Fulfillment`, `Artifact`, `Transaction`, or `RequestEvent` truth
- `scan_public_open_requests` on `/api/boreal-agents/{agentKey}` reads only bounded public open-request projections and returns wake or skip packets without assigning workers, attaching `Supply`, or creating durable writes
- worker fit scores and opportunity cards do not imply assignment, owner approval, payment authority, fulfillment start, artifact publication, review acceptance, or completion proof
- public or cross-actor worker application writes `Commitment` plus `RequestEvent` and requires route auth, request policy, and idempotency
- public or cross-actor direct `Fulfillment` creation remains rejected before accepted commitment truth
- owner-private direct worker fulfillment requires a private owner-controlled request and one selected published owned first-party `Supply`
- route-level supply attachment tests reject selected supplies that are owned and published but do not overlap request structured `seeking.supplyKinds` or `brief.outputKinds` when those fields are present
- agent action preflight tests reject `apply_to_request` or `create_owner_private_fulfillment` attempts when visible `requestFit` omits selected published supply proof or selected supply fingerprints do not overlap the request structured supply or output fingerprints
- named-agent preparation must reject owner-private direct fulfillment when explicit trusted-worker auto-approval, allowed worker key, eligible status, or selected supply proof is missing or mismatched
- owner-scoped auto-approval can create or accept only the intended worker boundary and cannot publish artifacts, authorize payment, accept review, complete the request, or silently fall back to a different supply
- prompt packs, reusable prompts, workflow JSON, provider prompts, and skills cannot be listed as starter `Supply` without a backing execution profile, capability fingerprints, proof path, and readiness tests
- `video-generation` and `humanizer` are the live starter workers; any additional starter worker requires a real supply factory, execution contract, proof path, failure fixtures, and route-level preparation tests before promotion
- first-party worker contract tests keep the generic worker artifact descriptor document-capable while still requiring `video-generation` to publish video through an object reference
- `schemas/json/in-house-worker-application-profile.schema.json`, `fixtures/agent/in-house-worker-application-profile.sample.json`, and `pnpm contracts:in-house-workers` keep the profile machine-readable and enforce scanner, application, auto-approval, prompt-asset, and live-worker boundaries
- named-agent promotion gates must make `Mira` and `Tala` `live_backed` with no open blockers, and any future target template must remain `target_blocked` with machine-readable blockers until its evidence exists
- humanizer failure fixture tests must cover invented completion or approval claims, unauthorized capability invention, recoverable model failure, empty canonical writes before authorization, and owner-review-required boundaries
- every first-party named agent declares a unique name, stable `/api/boreal-agents/{agentKey}` route, shared `boreal_named_agent_v1` framework contract, task pipeline, tool bindings, model or provider environment bindings, qualification tags, skip conditions, and contract fixtures
- named-agent qualification tags must be enum-backed canonical actor, supply, output, and execution fingerprints; `humanizer`, `copy`, `text`, `documentation`, or other target/UI labels must not masquerade as canonical tags
- the named-agent template builder rejects duplicate names or routes, unstable agent keys, unstable framework settings, missing framework actions, missing boilerplate refs, missing required task-pipeline steps, missing model or supply bindings, unknown qualification tags, and unknown canonical writes before a new agent can be exposed through discovery or `/api/boreal-agents/{agentKey}`
- public agent discovery exposes the first-party named agents, framework id/version, boilerplate refs, and preparation-only route mode through the agent card and start guide
- `GET /api/boreal-agents/{agentKey}` and `POST /api/boreal-agents/{agentKey}` route tests keep the named-agent route preparation-only: template reads, caller-supplied request scans, application packets, and governed mutation-call sketches may be prepared, but matching, assignment, `Request`, `Commitment`, `Fulfillment`, `FulfillmentStep`, `Artifact`, `Transaction`, provider calls, and `RequestEvent` writes must stay behind separate authorized mutation routes
- public request board tests render read-only worker readiness from public-safe projection fields, including human-required, explicit human-first agent-support, human-can-apply, agent-can-prepare for Mira and Tala, skip-human-or-local, skip-no-fit, and target-only cases when target templates exist, without per-card private fetches, assignment, payment authority, or mutations
- actionable human worker lanes include an `apply_to_request` preflight handoff for `Commitment` proposals with idempotency, represented-human, scope, forbidden-claim, and non-authority fields
- briefing and planning tags reduce wasteful scans by keeping human-required, local-access, witnessed-handoff, field-proof, pickup, delivery, and physical-verification plans away from provider-only agents unless a supporting provider role is explicit
- named-agent route tests reject public projection summaries whose top-level `seeking.actorKinds`, `brief.constraints`, or execution-kind hints imply human-required or local-access work, even when the request also has a video-generation signal
- named-agent route tests reject missing or mismatched supply bindings before allowing live application preparation, so prompt-only assets cannot masquerade as worker-backed supply
- request-briefing prompt contract tests lock scanner-tag requirements for `seeking.actorKinds`, `seeking.supplyKinds`, `brief.outputKinds`, embodied constraints, human or field-capable supply, and generated-media-only `video_generation` tags

### Supply-management contract tests

Verify:

- entering the new-supply route alone does not publish supply automatically
- explicit supply draft creation creates one durable supply row
- starter-supply enable should create or reuse one worker-backed supply row instead of duplicating the same starter lane
- draft updates mutate the same supply row instead of creating replacements
- delete should allow draft supply and unused retired supply only
- delete should reject published or paused supply
- delete should reject retired supply that already has durable commitment or fulfillment activity
- publish requires the minimum profile and capability fields
- private and unlisted publish succeed through the first supply lane
- public supply publish remains blocked until the broader market lane is enabled
- pause and retire transitions honor the canonical supply state machine
- runtime or resolver binding metadata remains optional
- runtime or resolver binding metadata does not replace the durable supply owner actor
- starter-supply enable with immediate publish should keep the starter in private or unlisted lanes and make it selectable for request routing
- workflow-backed supply may point to typed workflow-pack support metadata or support links without replacing the durable supply root
- imported workflow definitions or template bodies must not be rewritten into fake buyer-authored request brief fields
- missing credentials, undefined proof requirements, or unsupported adapter features should block workflow-backed pack readiness or fulfillment start
- workflow adapter success alone must not imply delivered or accepted completion without artifact and closure truth
- first-party buyer-credit top-up should update support-ledger truth without creating fake request funding truth
- spending buyer credit on one request should create both one credit-ledger debit and one request-attached transaction record
- Character Call Starter checkout should create one private `Request`, publish or reuse one workflow-backed first-party `Supply`, pin it as `routing.preferredSupplyId`, open the request, and settle one `$1` buyer-credit debit
- Character Call Starter checkout should bootstrap one active fulfillment lane, publish persona sheet, launch handoff, and credit receipt artifacts, then block on approved reference asset or existing Runway avatar id
- Character Call Starter Runway session launch should require an owned funded request and return only ephemeral one-time realtime credentials without persisting tokens to artifacts or events
- buyer credit must not be spendable on out-of-scope external supply in the first-party-only credit profile
- stablecoin or processor verification replay must not create duplicate settled ledger entries or duplicate settled request transactions

### Planner evals

Verify:

- role slots are appropriate for the request
- phase counts stay bounded
- low-complexity requests do not explode into microtasks
- embodied requests produce explicit human or field-capable steps when required
- benchmark outputs preserve embodied execution modes and proof claims strongly enough to separate request-rooted planning from task-first or direct-tool baselines

### Matcher evals

Verify:

- correct lead supply appears in top-k
- collaborator slots map to sensible supplies
- generic weak-fit supplies do not outrank strong specialists
- deterministic benchmark aggregates can distinguish lead-first routing quality from tool-biased or decomposition-biased baselines
- the fixture-backed `web-live` matcher runner should rebuild actual outputs from runnable `requestPatch` plus full `candidateSupplies` snapshots instead of depending on hand-written actual JSON only

### Policy evals

Verify:

- next-action choice is safe and consistent with planner and matcher output
- approval-gated writes are not triggered early
- block-and-escalate behavior appears when canon or funding boundaries are violated
- policy preserves request-grant boundaries when funders, solvers, reviewers, and later audience actors participate in one request
- policy differentiates inspect, run, and fork actions on public solutions
- embodied or verification-heavy asks prefer clarification or escalation over false digital completion
- policy does not imply completion before proof and closure conditions are satisfied
- public or cross-actor lanes do not inherit owner-private desktop assumptions in planner, matcher, or policy behavior
- executable request-boundary tests keep public request projections free of routing and planner-internal matching fields
- executable request-boundary tests keep direct owner-private fulfillment unavailable to public, cross-actor, or commitment-bound lanes
- deterministic benchmark outputs expose false-completion and forbidden-mutation rates clearly across competing planning styles

### Risk governance tests

Verify:

- changes that alter canonical object names are blocked unless canon docs are updated in the same patch
- changes that alter category, wedge, or revenue model are blocked unless commercial canon docs are updated in the same patch
- changes that alter lifecycle states are blocked unless state and event docs are updated in the same patch
- changes that add workspaces are blocked unless `docs/REPO_STRUCTURE.md`, `docs/WORKSTREAMS.md`, `docs/OWNERSHIP.md`, and local workspace guardrails exist
- destructive or breaking actions require explicit escalation paths in agent instructions
- risk escalations use the required visible format with `Risk`, `Impact`, `Scope`, `Safer path`, and `Question`
- parallel work requires disjoint write scopes or explicit single-owner assignment

### Monetary integrity tests

Verify:

- totals are deterministic
- commitment amounts and transaction amounts reconcile
- request-grant pool totals reconcile across funder contributions, refunds, platform fees, solver payouts, and reviewer fees when those exist
- solution-run credit debits reconcile with inference, provider, workflow, human-review, or service-capacity usage metadata when those costs are present
- public solution inspection has zero transaction total by default
- passive funder payout states remain absent unless a later canon decision explicitly accepts them
- payout states derive correctly from settlement history

## Object-to-Test Coverage

### Derived planning and matching objects

- `RequestDraft` extraction stability
- `MatchSpec` normalization stability
- `RoutePlan` phase and role consistency
- `RoleSlot` actor-kind and requiredness rules
- `MatchCandidate` ranking and explanation quality
- fingerprint enum acceptance and rejection for `outputKinds`, `supplyKinds`, `executionChannels`, route fields, role keys, phase keys, and evidence claims
- request-briefing chat tools normalize loose `outputKinds` strings or lists before persistence and keep evidence-only values such as `written_report` out of `brief.outputKinds`
- canonical role normalization for `field_verification -> field_technician` and `local_runner` or `pickup_dropoff -> courier_runner`

### `Request`

- creation
- draft briefing updates
- draft-only manual request-input edits
- status transitions
- summary projection
- participant visibility
- grant-funded participant roles
- public solution projection source integrity
- public solution run source-artifact reference integrity

### `Commitment`

- propose
- accept
- reject
- supersede
- expiry

### `Fulfillment`

- create
- start
- block
- resume
- deliver
- accept
- cancel
- fail

### `FulfillmentStep`

- dependency rules
- completion rules
- delegation rules

### `Artifact`

- attach
- publish through a stable container reference
- resolve references
- preserve fulfillment and step lane bindings
- visibility and integrity

### `Transaction`

- require
- verify
- settle
- payout
- refund
- dispute

### `RequestEvent`

- envelope validation
- naming validation
- replay safety
- sequence monotonicity

### `Supply`

- create draft
- update draft
- publish
- pause
- retire
- visibility and binding integrity

## Fixture Rules

Every canonical object family should eventually have deterministic fixtures under:

- `fixtures/request/`
- `fixtures/supply/`
- `fixtures/fulfillment/`

Fixtures should cover:

- happy path
- edge path
- failure path
- replay path
- planner and matcher eval path
- policy safety path
