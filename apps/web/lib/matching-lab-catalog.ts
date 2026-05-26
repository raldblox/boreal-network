import type { BorealSupplyDraft } from "./supply";

export type MatchingLabSupplyMetadata = {
  geography: string[];
  languages: string[];
  proofPackages: string[];
  tooling: string[];
  typicalBuyers: string[];
  recentWork: string[];
  trustNotes: string;
  availabilityNotes: string;
  deliveryStyle: string;
  slaLabel: string;
};

export type MatchingLabCatalogSupply = BorealSupplyDraft & {
  metadata: MatchingLabSupplyMetadata;
};

const timestamp = "2026-05-22T00:00:00.000Z";

export const matchingLabMockSupplies = [
  {
    id: "sup_revops_migration_command",
    key: "revops-migration-command",
    ownerId: "mock_supply_owner_001",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "RevOps Migration Command",
      headline: "Human-led CRM, support, and ops migration owner",
      summary:
        "Owns messy revenue, support, and operations migrations where the buyer needs one accountable human lead plus structured AI support.",
      description:
        "Built for startups moving from Notion, Airtable, or spreadsheet sprawl into HubSpot, Salesforce, or mixed support stacks. This lane audits the current process, designs the rollout sequence, runs stakeholder reviews, keeps the automation understandable, and closes the handoff with operator training instead of disappearing after setup.",
      tags: [
        "hubspot",
        "sales-ops",
        "support-ops",
        "migration",
        "operator-training",
      ],
    },
    capability: {
      supplyKinds: ["migration_lead", "operator", "operations_build"],
      fulfillmentActorKinds: ["human"],
      outputKinds: [
        "migration_plan",
        "workflow_build",
        "handoff_doc",
        "operator_training",
      ],
      executionChannels: ["request_room", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 2,
      currentLoad: 1,
      responseTimeHours: 6,
    },
    pricing: {
      mode: "range",
      currency: "USD",
      minAmount: 6000,
      maxAmount: 14000,
      notes: "Most buyers start with one scoped migration sprint and keep weekly operator reviews live.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global", "US Pacific overlap", "APAC founder-friendly"],
      languages: ["English"],
      proofPackages: [
        "migration-plan",
        "cutover-checklist",
        "operator-training-notes",
        "handoff-doc",
      ],
      tooling: ["HubSpot", "Salesforce", "Notion", "Airtable", "Zapier", "Make"],
      typicalBuyers: [
        "Seed-stage SaaS founders",
        "Revenue operations leads",
        "Support leaders cleaning internal process debt",
      ],
      recentWork: [
        "HubSpot migration for a B2B support team moving 18 pipelines off Airtable",
        "Support triage rebuild with operator SOP handoff for a marketplace startup",
        "Founder-led CRM cleanup plus onboarding sequence redesign",
      ],
      trustNotes:
        "Optimized for buyers who want human ownership, visible rollout notes, and no black-box automation debt.",
      availabilityNotes:
        "Prefers one serious lead request at a time with a clear decision-maker on the buyer side.",
      deliveryStyle:
        "Lead first, then bring automation and documentation support into the same request thread only where needed.",
      slaLabel: "Replies within one founder workday",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_ai_ops_automation_studio",
    key: "ai-ops-automation-studio",
    ownerId: "mock_supply_owner_002",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "AI Ops Automation Studio",
      headline: "Hybrid automation build lane for workflow-heavy requests",
      summary:
        "Builds internal automations, integrations, and AI-assisted operator flows once the buyer already knows the real workflow target.",
      description:
        "Best used as a collaborator lane under a human migration or operations lead. Handles workflow mapping, agent-assisted routing, provider integration, and automation QA, then packages the logic in a form an operator can still inspect and run later.",
      tags: [
        "automation",
        "integration",
        "workflow-build",
        "ai-support",
        "zapier",
      ],
    },
    capability: {
      supplyKinds: ["automation_builder", "ai_automation", "operations_build"],
      fulfillmentActorKinds: ["agent", "human"],
      outputKinds: ["workflow_build", "workflow_map", "handoff_doc", "automation_build"],
      executionChannels: ["request_room", "api", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 5,
      currentLoad: 2,
      responseTimeHours: 3,
    },
    pricing: {
      mode: "quote",
      currency: "USD",
      notes: "Quoted after the buyer or lead lane locks the workflow boundary.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: [
        "workflow-map",
        "build-notes",
        "handoff-doc",
        "qa-checklist",
      ],
      tooling: ["Make", "Zapier", "n8n", "OpenAI", "HubSpot", "Slack"],
      typicalBuyers: [
        "Ops leads who already know the target process",
        "Founders replacing spreadsheet handoffs",
        "Teams needing AI support without losing human review",
      ],
      recentWork: [
        "Ticket triage plus AI operator assist inside a support queue",
        "Partner onboarding automations with visible review steps",
        "Lead routing flows with human override checkpoints",
      ],
      trustNotes:
        "Strong fit when the buyer wants AI support inside a governed operational workflow, not a black-box chatbot promise.",
      availabilityNotes:
        "Fast response lane. Best when a lead operator already owns the project boundary.",
      deliveryStyle:
        "Ships workflow maps, build notes, and QA-facing handoff material alongside the automation.",
      slaLabel: "Replies in 3 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_enablement_documentation_house",
    key: "enablement-documentation-house",
    ownerId: "mock_supply_owner_003",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Enablement Documentation House",
      headline: "Documentation, SOP, and buyer-facing handoff support",
      summary:
        "Turns build or field work into operator-ready SOPs, delivery notes, and audit-friendly handoff material.",
      description:
        "Useful whenever the buyer needs the result to stay understandable after delivery. Produces SOPs, owner review packets, handoff docs, escalation notes, and operator training assets across digital and embodied requests.",
      tags: [
        "documentation",
        "handoff-doc",
        "enablement",
        "training",
        "qa",
      ],
    },
    capability: {
      supplyKinds: ["documentation_support", "qa_documentation", "reporting_support"],
      fulfillmentActorKinds: ["human", "agent"],
      outputKinds: ["handoff_doc", "draft", "delivery", "workflow_map"],
      executionChannels: ["request_room", "async_thread", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 6,
      currentLoad: 2,
      responseTimeHours: 5,
    },
    pricing: {
      mode: "range",
      currency: "USD",
      minAmount: 900,
      maxAmount: 3500,
      notes: "Often attached as a support lane rather than a standalone lead.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: ["handoff-doc", "operator-playbook", "review-notes", "issue-log"],
      tooling: ["Notion", "Google Docs", "Confluence", "Loom"],
      typicalBuyers: [
        "Founders handing work back to internal operators",
        "Teams with compliance or review-heavy workflows",
        "Field operators needing audit-friendly delivery packs",
      ],
      recentWork: [
        "Customer support SOP refresh after a CRM migration",
        "Field audit reporting pack for a regional retail rollout",
        "Launch checklist and operator briefing for a digital workflow handoff",
      ],
      trustNotes:
        "Best when the request cannot end at 'it works'; the buyer needs reusable operator truth.",
      availabilityNotes:
        "High-capacity support lane. Can plug into migration, field, delivery, or QA-heavy requests.",
      deliveryStyle:
        "Converts execution output into clean owner review, operator handoff, and issue-log artifacts.",
      slaLabel: "Replies in 5 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_manila_hardware_verification_ops",
    key: "manila-hardware-verification-ops",
    ownerId: "mock_supply_owner_004",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Metro Manila Hardware Verification Ops",
      headline: "Onsite hardware checks, serial capture, and timestamped proof",
      summary:
        "Handles verification-heavy field requests where the buyer needs human presence, proof packages, and closure discipline.",
      description:
        "Built for kiosk checks, signage verification, installation audits, device serial capture, and retail hardware condition reviews. Produces timestamped photos, serial records, issue logs, and written verification notes instead of a vague 'done' message.",
      tags: [
        "hardware-ops",
        "field-verification",
        "timestamped-photos",
        "serial-capture",
        "metro-manila",
      ],
    },
    capability: {
      supplyKinds: ["hardware_ops", "field_verification", "reporting_support"],
      fulfillmentActorKinds: ["human"],
      outputKinds: [
        "inspection_report",
        "photo_evidence",
        "serial_inventory",
        "verification_note",
      ],
      executionChannels: ["request_room", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 4,
      currentLoad: 2,
      responseTimeHours: 4,
    },
    pricing: {
      mode: "range",
      currency: "PHP",
      minAmount: 2500,
      maxAmount: 12000,
      notes: "Depends on site count, travel, serial depth, and proof package requirements.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Metro Manila", "Quezon City", "Makati", "Pasig", "Taguig"],
      languages: ["English", "Tagalog"],
      proofPackages: [
        "timestamped-photos",
        "serial-number-capture",
        "verification-note",
        "issue-log",
      ],
      tooling: ["Mobile capture kit", "Shared drive upload", "Serial audit sheet"],
      typicalBuyers: [
        "Hardware operators",
        "Retail deployment teams",
        "Remote ops teams needing trustworthy site proof",
      ],
      recentWork: [
        "Retail kiosk verification sweep with serial capture across five branches",
        "Signage install check with missing-device escalation notes",
        "Field condition audit for pop-up hardware assets",
      ],
      trustNotes:
        "Strong fit when the buyer cares more about evidence quality than polished copy.",
      availabilityNotes:
        "Can take rush verification requests but requires a clear site window and access path.",
      deliveryStyle:
        "Returns a proof-first package: photos, serials, notes, and issue logging before anything is called complete.",
      slaLabel: "Replies in 4 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_property_field_inspection_network",
    key: "property-field-inspection-network",
    ownerId: "mock_supply_owner_005",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Property Field Inspection Network",
      headline: "Human-led property, branch, and site inspection coverage",
      summary:
        "Runs property, venue, and branch inspections where the buyer needs visual proof, structured notes, and follow-up reporting.",
      description:
        "Useful for lease checks, branch condition audits, renovation verification, signage and frontage checks, and local site walkthroughs. This lane emphasizes clean evidence capture, written observation structure, and explicit missing-access escalation.",
      tags: [
        "field-inspection",
        "property",
        "onsite",
        "inspection-report",
        "photo-proof",
      ],
    },
    capability: {
      supplyKinds: ["field_inspection", "reporting_support", "human_service"],
      fulfillmentActorKinds: ["human"],
      outputKinds: ["inspection_report", "photo_evidence", "verification_note", "delivery"],
      executionChannels: ["request_room", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 3,
      currentLoad: 1,
      responseTimeHours: 8,
    },
    pricing: {
      mode: "quote",
      currency: "PHP",
      notes: "Quoted by site count, urgency, and reporting depth.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Metro Manila", "Cebu", "Davao"],
      languages: ["English", "Tagalog"],
      proofPackages: [
        "photo-proof",
        "written-report",
        "verification-note",
        "issue-log",
      ],
      tooling: ["Mobile capture", "Inspection checklist", "Report template"],
      typicalBuyers: [
        "Property teams",
        "Expansion operators",
        "Remote founders verifying local execution quality",
      ],
      recentWork: [
        "Retail branch readiness walk-through before launch weekend",
        "Property frontage and signage verification for a leasing team",
        "Post-install condition audit with issue escalation log",
      ],
      trustNotes:
        "Strong fit when the request should preserve what was seen, what was blocked, and what still needs follow-up.",
      availabilityNotes:
        "Needs access instructions and site timing to avoid failed visits.",
      deliveryStyle:
        "Separates observations, proof, and unresolved issues so the buyer can act without replaying a chat log.",
      slaLabel: "Replies in 8 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_metro_handoff_courier_desk",
    key: "metro-handoff-courier-desk",
    ownerId: "mock_supply_owner_006",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Metro Handoff Courier Desk",
      headline: "Pickup, dropoff, and custody-aware delivery runner lane",
      summary:
        "Handles local handoffs where the buyer needs a real runner, location proof, and clean delivery confirmation.",
      description:
        "Works for document pickup, inventory handoff, sample delivery, device return, and event kit movement. Strongest when the request needs a real person to move something and confirm who received it, when, and under what condition.",
      tags: [
        "pickup-dropoff",
        "courier",
        "delivery-confirmation",
        "local-runner",
        "metro-manila",
      ],
    },
    capability: {
      supplyKinds: ["local_runner", "pickup_dropoff", "operator"],
      fulfillmentActorKinds: ["human"],
      outputKinds: ["delivery_confirmation", "handoff_receipt", "signature"],
      executionChannels: ["request_room", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 8,
      currentLoad: 4,
      responseTimeHours: 2,
    },
    pricing: {
      mode: "range",
      currency: "PHP",
      minAmount: 500,
      maxAmount: 3500,
      notes: "Depends on same-day urgency, route complexity, and custody proof requirements.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Metro Manila", "Quezon City", "Makati", "BGC", "Ortigas"],
      languages: ["English", "Tagalog"],
      proofPackages: [
        "delivery-confirmation",
        "handoff-signature",
        "timestamped-photo",
        "route-note",
      ],
      tooling: ["Mobile proof capture", "Pickup checklist", "Signature receipt"],
      typicalBuyers: [
        "Operations teams needing local movement",
        "Founders without local staff on the ground",
        "Teams needing same-day handoff confidence",
      ],
      recentWork: [
        "Laptop pickup and signature-confirmed return from a remote contractor",
        "Event kit movement between two venues with custody notes",
        "Sample dropoff and photo-confirmed reception for a retail ops team",
      ],
      trustNotes:
        "Better for proof-bearing handoffs than for generic last-mile e-commerce delivery.",
      availabilityNotes:
        "Fastest lane in the catalog, but needs exact pickup and dropoff windows for rush work.",
      deliveryStyle:
        "Optimized for chain-of-custody clarity, not anonymous parcel volume.",
      slaLabel: "Replies in 2 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_chain_of_custody_witness_lane",
    key: "chain-of-custody-witness-lane",
    ownerId: "mock_supply_owner_007",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Chain of Custody Witness Lane",
      headline: "Witnessed handoff support with signature-grade proof",
      summary:
        "Supports witness-sensitive delivery and signature-heavy handoffs where generic courier confirmation is not enough.",
      description:
        "Best for asset returns, sensitive document exchange, or formal handoff requests that need a witness layer, explicit signature evidence, and a written confirmation note that can survive later review.",
      tags: [
        "witnessed-handoff",
        "signature",
        "handoff",
        "proof",
        "custody",
      ],
    },
    capability: {
      supplyKinds: ["pickup_dropoff", "qa_documentation", "human_service"],
      fulfillmentActorKinds: ["human"],
      outputKinds: ["handoff_receipt", "signature", "delivery_confirmation", "verification_note"],
      executionChannels: ["request_room", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 3,
      currentLoad: 1,
      responseTimeHours: 6,
    },
    pricing: {
      mode: "quote",
      currency: "PHP",
      notes: "Quoted for sensitive or witness-grade transfer requests.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Metro Manila"],
      languages: ["English", "Tagalog"],
      proofPackages: [
        "handoff-signature",
        "written-witness-note",
        "delivery-confirmation",
        "timestamped-proof",
      ],
      tooling: ["Signature packet", "Witness note template", "Mobile proof capture"],
      typicalBuyers: [
        "Ops teams handling sensitive assets",
        "Founders needing formal proof of transfer",
        "Buyers who cannot accept a generic delivery receipt",
      ],
      recentWork: [
        "Witnessed company asset return with signed acceptance proof",
        "Sensitive document exchange with timestamped witness note",
        "Formal inventory handoff between outgoing and incoming operators",
      ],
      trustNotes:
        "Designed for traceable custody changes, not commodity logistics volume.",
      availabilityNotes:
        "Needs named recipient, access plan, and signature expectation before dispatch.",
      deliveryStyle:
        "Preserves who handed off what, to whom, when, and with what proof artifact.",
      slaLabel: "Replies in 6 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_boreal_desktop_runtime_operator",
    key: "boreal-desktop-runtime-operator",
    ownerId: "mock_supply_owner_008",
    status: "published",
    visibility: "unlisted",
    profile: {
      displayName: "Boreal Desktop Runtime Operator",
      headline: "Private local runtime lane for owner-controlled execution",
      summary:
        "Represents a local desktop runtime that can execute request-bound work inside an owner-controlled lane with explicit review.",
      description:
        "Best for private requests that need local files, sandboxed execution, or runtime-attached work under the same owner. This is not a public worker market lane. It exists to model local execution participation and proof publication without treating local logs as durable request truth.",
      tags: [
        "desktop-runtime",
        "private-lane",
        "local-files",
        "owner-controlled",
        "codex",
      ],
    },
    capability: {
      supplyKinds: ["runtime_executor", "desktop_runtime", "agent_worker"],
      fulfillmentActorKinds: ["runtime", "agent"],
      outputKinds: ["draft", "file", "delivery", "handoff_doc"],
      executionChannels: ["resolver_runtime", "request_room"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 1,
      currentLoad: 0,
      responseTimeHours: 1,
    },
    pricing: {
      mode: "open",
      notes: "Internal owner-controlled lane. Commercial pricing handled outside the public catalog.",
    },
    source: {
      kind: "runtime",
    },
    bindings: {
      runtimeActorId: "runtime_owner_local_01",
      resolverClientId: "resolver_mock_owner_01",
    },
    metadata: {
      geography: ["Owner local machine"],
      languages: ["English"],
      proofPackages: ["delivery", "handoff-doc", "status-update"],
      tooling: ["Codex", "Local filesystem", "Scoped runtime bridge"],
      typicalBuyers: [
        "Private owner-controlled requests",
        "Internal execution lanes that need local files or runtime context",
      ],
      recentWork: [
        "Private document transformation with local file access",
        "Owner-approved local code review lane with result artifact publication",
      ],
      trustNotes:
        "Not a general public supply lane. Meant for private owner-controlled execution with explicit Boreal routing truth.",
      availabilityNotes:
        "Single-lane capacity. Best for one private tracked request at a time.",
      deliveryStyle:
        "Keeps execution local and promotes only durable proof or delivery back into the request.",
      slaLabel: "Replies in 1 hour",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_provider_api_integration_rail",
    key: "provider-api-integration-rail",
    ownerId: "mock_supply_owner_009",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Provider API Integration Rail",
      headline: "Provider-backed tool lane for API-first execution",
      summary:
        "A provider-capability lane for structured API work, external service orchestration, and machine-speed execution where human presence is not required.",
      description:
        "This lane is strongest when the request can be fulfilled through a stable provider integration, external API call sequence, or machine-validated execution path. It is not suitable for onsite work, witness-grade proof, or ambiguous human-heavy delivery.",
      tags: [
        "provider",
        "api",
        "integration",
        "tool-operator",
        "machine-execution",
      ],
    },
    capability: {
      supplyKinds: ["provider_capability", "automation_builder"],
      fulfillmentActorKinds: ["tool"],
      outputKinds: ["workflow_build", "delivery", "file"],
      executionChannels: ["api", "request_room"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 20,
      currentLoad: 5,
      responseTimeHours: 1,
    },
    pricing: {
      mode: "quote",
      currency: "USD",
      notes: "Pricing depends on provider cost, request volume, and integration depth.",
    },
    source: {
      kind: "provider",
    },
    bindings: {
      providerRef: "mock://provider/api-integration-rail",
    },
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: ["delivery", "file", "build-note"],
      tooling: ["HTTP APIs", "Provider webhooks", "Schema-based transforms"],
      typicalBuyers: [
        "Teams with API-addressable workflows",
        "Ops builders replacing manual copy work",
        "Buyers who need throughput more than local human presence",
      ],
      recentWork: [
        "Structured API export pipeline for ops reporting",
        "Provider-backed sync job with delivery artifact packaging",
        "Automated document transform with durable output files",
      ],
      trustNotes:
        "Good for stable digital flows. Bad fit for embodied, witnessed, or access-constrained work.",
      availabilityNotes:
        "High-capacity lane, but only when the request boundary is already machine-executable.",
      deliveryStyle:
        "Prefers direct, typed execution and durable output packaging over exploratory service work.",
      slaLabel: "Replies in 1 hour",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_instant_sop_blueprint_pack",
    key: "instant-sop-blueprint-pack",
    ownerId: "mock_supply_owner_010",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Instant SOP Blueprint Pack",
      headline: "Digital product lane for ready-made process kits",
      summary:
        "A direct-delivery digital product for buyers who need templates, playbooks, or starter documentation without a custom service engagement.",
      description:
        "Useful when the request is closer to 'I need a proven pack right now' than 'I need someone to own the whole job.' Ships templates, checklists, and starter playbooks that can later feed a bigger request if the buyer needs customization.",
      tags: [
        "digital-product",
        "sop",
        "template",
        "playbook",
        "instant-download",
      ],
    },
    capability: {
      supplyKinds: ["digital_product", "documentation_support"],
      fulfillmentActorKinds: ["tool"],
      outputKinds: ["file", "handoff_doc", "workflow_map"],
      executionChannels: ["instant_download"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 999,
      currentLoad: 0,
      responseTimeHours: 0,
    },
    pricing: {
      mode: "fixed",
      currency: "USD",
      fixedAmount: 149,
      notes: "Instant delivery pack, not a human-led service lane.",
    },
    source: {
      kind: "catalog",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: ["file", "download-receipt"],
      tooling: ["Template library", "Instant delivery rail"],
      typicalBuyers: [
        "Buyers needing a starting pack today",
        "Teams not yet ready for a custom implementation sprint",
      ],
      recentWork: [
        "Ops SOP starter pack for customer support teams",
        "Branch inspection checklist bundle",
        "Handoff packet template kit for operator teams",
      ],
      trustNotes:
        "Good for immediate access to a template asset. Not a substitute for a scoped custom service request.",
      availabilityNotes:
        "Always available while catalog listing stays published.",
      deliveryStyle:
        "Instant delivery first. If the buyer needs custom work, route into a separate request lane.",
      slaLabel: "Instant",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_video_launch_editing_cell",
    key: "video-launch-editing-cell",
    ownerId: "mock_supply_owner_011",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Video Launch Editing Cell",
      headline: "Video generation and launch-ready packaging lane",
      summary:
        "Handles script-to-video production, launch cutdowns, captioning, and delivery packaging for fast-moving product teams.",
      description:
        "Built for launch demos, product explainers, short promo edits, and repackaging long recordings into buyer-ready cuts. Often works with documentation support when the buyer also needs publishing notes or a handoff pack.",
      tags: [
        "video-generation",
        "launch",
        "captioning",
        "promo",
        "delivery-packaging",
      ],
    },
    capability: {
      supplyKinds: ["video_generation", "documentation_support"],
      fulfillmentActorKinds: ["human", "agent"],
      outputKinds: ["video", "draft", "handoff_doc", "delivery"],
      executionChannels: ["request_room", "async_thread"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 4,
      currentLoad: 2,
      responseTimeHours: 7,
    },
    pricing: {
      mode: "range",
      currency: "USD",
      minAmount: 500,
      maxAmount: 3500,
      notes: "Depends on source material, length, edit complexity, and delivery format count.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: ["video", "draft", "handoff-doc", "delivery-note"],
      tooling: ["Premiere", "CapCut", "HeyGen", "Caption tooling"],
      typicalBuyers: [
        "Founders sharing demos",
        "Product marketing teams",
        "Hackathon and launch operators",
      ],
      recentWork: [
        "Launch cutdown from a product walkthrough recording",
        "Founder-led demo video with delivery caption pack",
        "Promo clip bundle for a product release week",
      ],
      trustNotes:
        "Best when the buyer needs a shipped video asset, not just raw generation output.",
      availabilityNotes:
        "Fast-turn lane but prefers a clear source-material boundary.",
      deliveryStyle:
        "Packages the edit, versions, and any publishing notes together so the asset is immediately usable.",
      slaLabel: "Replies in 7 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_evidence_and_qa_desk",
    key: "evidence-and-qa-desk",
    ownerId: "mock_supply_owner_012",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Evidence and QA Desk",
      headline: "Proof-packaging and issue-log support lane",
      summary:
        "Specialized support lane for requests that already have execution underway but still need strong evidence packaging, QA checks, or closure discipline.",
      description:
        "Useful when the lead lane is already clear but the buyer still needs proof quality, issue logging, and owner-facing delivery notes to stay tight. Often attaches to hardware, field, migration, and handoff-heavy requests.",
      tags: [
        "qa-documentation",
        "evidence",
        "issue-log",
        "review",
        "proof",
      ],
    },
    capability: {
      supplyKinds: ["qa_documentation", "reporting_support", "documentation_support"],
      fulfillmentActorKinds: ["human", "agent"],
      outputKinds: ["verification_note", "handoff_doc", "issue_log", "delivery"],
      executionChannels: ["request_room", "async_thread", "operator_review"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 6,
      currentLoad: 3,
      responseTimeHours: 4,
    },
    pricing: {
      mode: "quote",
      currency: "USD",
      notes: "Usually attached as a supporting proof lane.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: ["verification-note", "issue-log", "owner-review-pack", "handoff-doc"],
      tooling: ["QA checklist", "Reporting templates", "Artifact review flow"],
      typicalBuyers: [
        "Teams that need proof clarity before closure",
        "Operators shipping compliance or audit-sensitive work",
      ],
      recentWork: [
        "Evidence pack cleanup for a retail installation verification project",
        "Issue-log packaging for a migration handoff",
        "Owner review note bundle for a field inspection lane",
      ],
      trustNotes:
        "Best when the buyer already has work happening but does not want closure to depend on scattered notes.",
      availabilityNotes:
        "Flexible support lane. Can join most complex requests without becoming the lead owner.",
      deliveryStyle:
        "Turns mixed execution output into a clean proof pack and review-ready artifact set.",
      slaLabel: "Replies in 4 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_operations_build_collective",
    key: "operations-build-collective",
    ownerId: "mock_supply_owner_013",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Operations Build Collective",
      headline: "Multi-lane operations build and support team",
      summary:
        "A team-service lane for requests that need a human lead, builder support, and documentation all inside one bounded delivery scope.",
      description:
        "Useful for bigger workflow redesigns, launch operations systems, complex internal process buildouts, and post-migration stabilization. Designed for buyers who need a coordinated team but still want one request thread and one clear delivery shape.",
      tags: [
        "team-service",
        "operations-build",
        "support",
        "workflow",
        "stabilization",
      ],
    },
    capability: {
      supplyKinds: ["team_service", "operations_build", "operations_support"],
      fulfillmentActorKinds: ["human", "agent", "organization"],
      outputKinds: ["workflow_build", "workflow_map", "handoff_doc", "operator_training"],
      executionChannels: ["request_room", "operator_review", "async_thread"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 2,
      currentLoad: 1,
      responseTimeHours: 10,
    },
    pricing: {
      mode: "quote",
      currency: "USD",
      notes: "Used for requests that justify a coordinated multi-lane team.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: [
        "workflow-map",
        "handoff-doc",
        "operator-training",
        "stabilization-notes",
      ],
      tooling: ["Notion", "HubSpot", "Slack", "Airtable", "Internal ops stack"],
      typicalBuyers: [
        "Teams with cross-functional ops rebuilds",
        "Growth-stage startups needing one coordinated implementation ask",
      ],
      recentWork: [
        "Cross-team operations rebuild after a CRM migration",
        "Launch ops command center with support handoff and training",
        "Internal process stabilization after rapid growth",
      ],
      trustNotes:
        "Good when a real team is justified, but the buyer still wants one durable request instead of fragmented projects.",
      availabilityNotes:
        "Limited capacity. Reserved for requests where a single-lane specialist would be a false simplification.",
      deliveryStyle:
        "Starts with a lead lane and only activates collaborator lanes that clearly improve execution truth.",
      slaLabel: "Replies in 10 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
  {
    id: "sup_generalist_operator_room",
    key: "generalist-operator-room",
    ownerId: "mock_supply_owner_014",
    status: "published",
    visibility: "public",
    profile: {
      displayName: "Generalist Operator Room",
      headline: "Human-led catch-all service lane for bounded operational asks",
      summary:
        "A flexible generalist lane for real work that still needs a human owner but does not justify a specialist network split yet.",
      description:
        "Useful for research packaging, process cleanup, operational follow-up, coordination-heavy admin work, and edge cases that are real but not yet specialized. This lane is intentionally broad, but still expects a bounded ask and a real completion definition.",
      tags: [
        "generalist",
        "human-service",
        "operator",
        "follow-up",
        "coordination",
      ],
    },
    capability: {
      supplyKinds: ["generalist", "human_service", "operator"],
      fulfillmentActorKinds: ["human"],
      outputKinds: ["delivery", "draft", "handoff_doc", "verification_note"],
      executionChannels: ["request_room", "async_thread"],
    },
    availability: {
      acceptingRequests: true,
      maxConcurrentRequests: 5,
      currentLoad: 3,
      responseTimeHours: 6,
    },
    pricing: {
      mode: "quote",
      currency: "USD",
      notes: "Bounded scope strongly preferred over open-ended assistant labor.",
    },
    source: {
      kind: "manual",
    },
    bindings: {},
    metadata: {
      geography: ["Remote global"],
      languages: ["English"],
      proofPackages: ["delivery", "draft", "handoff-doc", "status-note"],
      tooling: ["Docs", "Sheets", "Email", "Operations trackers"],
      typicalBuyers: [
        "Founders needing a strong human generalist",
        "Teams with one-off but real operational asks",
      ],
      recentWork: [
        "Research summary plus action-ready operating note",
        "Manual workflow cleanup and handoff package",
        "Coordination-heavy launch support request",
      ],
      trustNotes:
        "Good fallback when the ask is real, bounded, and not yet clearly specialist-coded.",
      availabilityNotes:
        "Moderate capacity lane with good fit for smaller but still serious requests.",
      deliveryStyle:
        "Keeps work bounded, documented, and reviewable instead of pretending an open-ended assistant loop is fulfillment.",
      slaLabel: "Replies in 6 hours",
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
  },
] satisfies MatchingLabCatalogSupply[];

export const matchingLabMockSupplyById = new Map(
  matchingLabMockSupplies.map((supply) => [supply.id, supply])
);
