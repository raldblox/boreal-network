# First-Party Service Supply SKUs

This file packages three first-party Boreal service families as ready-to-buy supply.

It is downstream of canon.
It does not change Boreal's core objects.

## Purpose

Use this file to define:

- what first-party service supply should look like
- which preset plans should be sold first
- how pricing should stay concrete
- how each service maps back to Boreal canon

## Canon Guardrails

- The thing being sold is still `Supply`.
- The buyer still ends up inside one durable `Request`.
- Selected plan context should pin `routing.preferredSupplyId`.
- Plan selection must not be rewritten into fake buyer-authored `brief` text.
- Payment, proof, and delivery should still land on `Transaction`, `Artifact`, and `Fulfillment`.
- These service families should launch as `unlisted` first-party supply, not as broad public marketplace inventory.

## Packaging Rule

One service family may have several preset plans.

Because one `Supply` row has one pricing shape, the clean packaging rule is:

- one family page groups sibling `Supply` rows
- one preset plan maps to one unlisted `Supply`
- one deep plan link may point directly to one unlisted `Supply`

That keeps pricing truthful and machine-readable.

## Service Family 1: Automation Completion Sprint

Recommended external brand options:

- `FlowFix Sprint`
- `Automation Done Sprint`
- `Ops Flow Rescue`

Canonical family key:

- `automation-completion-sprint`

What the buyer is buying:

- one bounded automation or workflow outcome completed, not just a diagnosis

Best buyer:

- startup founder
- SMB operator
- growth or ops lead

Best request classes:

- broken CRM workflow
- lead routing cleanup
- AI automation rescue
- Airtable, Zapier, n8n, Make, Slack, or API handoff repair

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `automation_builder`, `operations_build`
- likely `outputKinds`: `workflow_map`, `workflow_build`, `handoff_doc`, `delivery`
- likely `executionChannels`: `request_room`, `api`, `operator_review`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `automation-triage` | Automation Triage | $149 | 48 hours | one workflow audit, failure map, fix recommendation, implementation path | one `plan` artifact, one `workflow_map`, one handoff summary |
| `one-workflow-completion` | One Workflow Completion | $649 | 5 business days | one bounded workflow repaired or built, one QA pass, one handoff note | one `workflow_build`, one `delivery`, one issue log or proof video |
| `multi-workflow-rescue` | Multi-Workflow Rescue | $1,800 | 10 business days | up to three linked workflow fixes, one rollout checklist, one owner handoff | one `workflow_build`, one `handoff_doc`, one delivery package |

### Notes

- `automation-triage` is fixed-scope and should still open a real `Request`.
- `one-workflow-completion` is the strongest direct-use plan for paid pilots.
- `multi-workflow-rescue` should stay first-party only until repeat execution quality is proven.

## Service Family 2: MVP Rescue Sprint

Recommended external brand options:

- `ShipPatch`
- `MVP Rescue Sprint`
- `Launch Blocker Fix`

Canonical family key:

- `mvp-rescue-sprint`

What the buyer is buying:

- one broken or half-working MVP moved toward usable release readiness

Best buyer:

- technical founder
- product lead
- operator inheriting a messy prototype

Best request classes:

- vibe-coded app rescue
- broken auth or payments path
- missing handoff docs
- unstable launch blockers

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `operations_build`, `digital_product`, `qa_documentation`
- likely `outputKinds`: `draft`, `file`, `issue_log`, `handoff_doc`, `delivery`
- likely `executionChannels`: `request_room`, `operator_review`, `async_thread`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `rescue-diagnosis` | Rescue Diagnosis | $249 | 72 hours | repo review, blocker list, severity ranking, rescue plan | one `issue_log`, one `plan`, one owner-facing summary |
| `launch-blocker-sweep` | Launch Blocker Sweep | $1,250 | 7 business days | up to three critical blocker fixes, one smoke pass, one handoff note | one `delivery`, one `issue_log`, one handoff document |
| `release-rescue-handoff` | Release Rescue Handoff | $3,200 | 14 business days | working rescue lane, stabilization pass, deployment checklist, post-fix transfer | one `delivery`, one `handoff_doc`, one training or review session summary |

### Notes

- This family should be marketed as outcome rescue, not contract engineering staff augmentation.
- `release-rescue-handoff` is still a bounded service, not an open-ended retainer.

## Service Family 3: Research-to-Action Brief

Recommended external brand options:

- `SignalDesk`
- `Decision Brief Sprint`
- `Research to Action`

Canonical family key:

- `research-to-action-brief`

What the buyer is buying:

- one decision-grade research package that ends in action, not a passive memo

Best buyer:

- founder
- chief of staff
- product lead
- growth lead

Best request classes:

- market entry question
- competitor scan
- tooling decision
- GTM framing
- investor or customer prep brief

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `reporting_support`, `documentation_support`, `operator`
- likely `outputKinds`: `draft`, `file`, `delivery`, `handoff_doc`
- likely `executionChannels`: `request_room`, `async_thread`, `operator_review`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `rapid-decision-brief` | Rapid Decision Brief | $189 | 48 hours | one research question, one concise recommendation, one source-backed memo | one `draft` or `file`, one `delivery` summary |
| `operator-decision-pack` | Operator Decision Pack | $590 | 4 business days | structured landscape, tradeoff matrix, recommendation, next-step plan | one `file`, one `handoff_doc`, one summary artifact |
| `execution-ready-brief` | Execution-Ready Brief | $1,450 | 7 business days | research, decision framing, implementation outline, copy-ready action package | one `file`, one `handoff_doc`, one delivery package |

### Notes

- This family should promise direction and execution clarity, not academic completeness.
- The output should end in an executable next step, not only analysis.

## Shared Commerce Rules

- All launch prices should be fixed and quoted in USD.
- All launch plans should be buyable by direct card or PayPal payment.
- All launch plans may also be payable with first-party Boreal credits once that lane exists.
- Every plan should create or reuse one private buyer-owned `Request`.
- Every plan should ship one visible proof package through `Artifact`.

## Virality-Native Expansion Lane

These service families are not SaaS tools.

They are done-for-you or done-with-you growth outcomes packaged as first-party `Supply`.

They fit especially well with:

- `Runway`
- `OpenAI`
- niche brand pages
- recurring direct-link service flows

The strongest current social-content reading is:

- real process beats polished emptiness
- niche discovery beats generic broadness
- repeatable characters or hosts beat one-off anonymous clips
- one asset should be turned into many cuts, hooks, captions, and formats

That means Boreal should package virality as:

- trend-sensitive content production
- niche authority building
- repeatable character-led publishing
- fast-response cultural posting

## Runway Service Family: Founder Avatar Clip Pack

Recommended external brand options:

- `Founder Avatar Clip Pack`
- `Avatar Reply Pack`
- `Launch Host Clips`

Canonical family key:

- `founder-avatar-clip-pack`

What the buyer is buying:

- ready-to-post avatar or character clips produced from one offer, audience, tone, and reference direction

Best buyer:

- founder
- creator-brand owner
- growth operator
- product marketer

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `video_generation`, `provider_capability`, `documentation_support`
- likely `outputKinds`: `draft`, `video`, `media`, `handoff_doc`, `delivery`
- likely `executionChannels`: `request_room`, `api`, `operator_review`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `sales-reply-pack` | Sales Reply Pack | $1,250 | 5 business days | 8 short avatar clips, script variants, Runway generations, captions, one revision pass | captioned videos, clean exports, script handoff, delivery receipt |

### Notes

- This family is the first Runway-backed service page.
- It should be buyer-facing as a `Service`, but implementation-facing as one workflow-backed `Supply`.
- The first request-mode flow may prefill visible buyer context, but exact plan links should pin `routing.preferredSupplyId` once stable first-party unlisted supply ids exist.

## Virality Service Family 1: Trend Seed Reel Pack

Recommended external brand options:

- `TrendSeed Sprint`
- `Niche Reel Drop`
- `Signal Clip Pack`

Canonical family key:

- `trend-seed-reel-pack`

What the buyer is buying:

- a ready-to-post set of short-form videos engineered around niche hooks, not a generic content calendar

Best buyer:

- creator-founder
- niche media page owner
- ecommerce or collector brand
- growth operator

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `video_generation`, `reporting_support`, `operator`
- likely `outputKinds`: `video`, `media`, `draft`, `handoff_doc`, `delivery`
- likely `executionChannels`: `async_thread`, `operator_review`, `request_room`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `trend-starter-6` | Trend Starter 6 | $179 | 72 hours | 6 short-form clips, hook variants, captions, cover-copy suggestions | 6 video drafts, caption sheet, posting notes |
| `trend-signal-12` | Trend Signal 12 | $420 | 5 business days | 12 clips, 3 hook families, caption pack, posting sequence | 12 ready-to-post videos, caption pack, trend rationale |
| `trend-sprint-20` | Trend Sprint 20 | $780 | 7 business days | 20 clips, reaction or explainer mix, thumbnail text, posting map | delivery folder, posting map, proof sheet |

### Good vertical skins

- horology
- baseball
- creator education
- product commentary
- niche humor pages

### Notes

- This family should sell speed and posting readiness.
- It should not promise guaranteed views.

## Virality Service Family 2: Character Host Trend Pack

Recommended external brand options:

- `Avatar Trend Host`
- `Character Newsroom Pack`
- `Persona Reel Engine`

Canonical family key:

- `character-host-trend-pack`

What the buyer is buying:

- one reusable on-brand host or character delivering recurring niche commentary and attention hooks

Best buyer:

- founder with no camera presence
- creator brand
- anonymous niche page
- brand that wants a recognizable spokesperson

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `video_generation`, `digital_product`, `operator`
- likely `outputKinds`: `video`, `media`, `draft`, `handoff_doc`, `delivery`
- likely `executionChannels`: `api`, `async_thread`, `operator_review`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `character-seed-pack` | Character Seed Pack | $320 | 4 business days | one character look, one voice direction, 3 sample clips | character sheet, 3 videos, usage notes |
| `character-host-10` | Character Host 10 | $890 | 7 business days | one tuned host persona, 10 clips, script pack, caption pack | 10 ready clips, character bible, posting sheet |
| `character-campaign-20` | Character Campaign 20 | $1,650 | 10 business days | one repeatable host system, 20 clips, response variants, editing style pack | 20 clips, style guide, handoff bundle |

### Good vertical skins

- horology commentator
- baseball narrator
- finance explainer
- product drop host
- fandom or lore page

### Notes

- This family is the strongest bridge between `Runway` credits and direct business value.
- It should emphasize repeatable identity, not only one-off video generation.

## Virality Service Family 3: Niche Authority Clip Calendar

Recommended external brand options:

- `Authority Reel Calendar`
- `Weekly Signal System`
- `Expert Clip Engine`

Canonical family key:

- `niche-authority-clip-calendar`

What the buyer is buying:

- a recurring authority-building posting system for one niche audience

Best buyer:

- coach
- consultant
- licensed expert
- boutique brand
- education-first creator

Canonical mapping:

- primary `Supply.capability.supplyKinds`: `reporting_support`, `documentation_support`, `video_generation`
- likely `outputKinds`: `video`, `draft`, `file`, `handoff_doc`, `delivery`
- likely `executionChannels`: `async_thread`, `operator_review`, `request_room`

### Preset Plans

| Plan key | Surface label | Price | Turnaround | What is included | Proof and delivery |
| --- | --- | ---: | --- | --- | --- |
| `authority-weekly-8` | Authority Weekly 8 | $260 | weekly | 8 clips, caption pack, angle map for one audience | 8 videos, caption pack, weekly board |
| `authority-growth-16` | Authority Growth 16 | $560 | weekly | 16 clips, theme buckets, CTA variants, cover text | 16 videos, CTA sheet, posting calendar |
| `authority-editorial-30` | Authority Editorial 30 | $980 | monthly | 30 clips, monthly editorial map, recurring angle library | monthly delivery bundle, angle library, posting map |

### Good vertical skins

- therapist marketing
- wellness education
- sports coaching
- legal education
- founder lessons

### Notes

- This family should sell consistency and authority, not only virality spikes.
- For sensitive categories, educational framing matters more than hype framing.

## Sensitive Category Rule

Do not package `therapy` as treatment, diagnosis, crisis support, or clinical care.

Safe initial reading:

- educational clips for licensed therapists
- practice marketing for licensed therapists
- mental wellness content packaging with expert-provided claims and review

Unsafe initial reading:

- AI therapist
- therapy delivered by avatar
- mental health diagnosis or intervention service

If a niche needs regulated claims, client-provided review and approval should be mandatory before final delivery.

## Shared Page Sections

Every family page should expose:

- one plain-language promise
- one target-buyer summary
- one preset-plan rail
- one process rail
- one proof rail
- one FAQ around revisions, exclusions, and turnaround

Suggested process rail:

1. Intake
2. Scope check
3. Execution
4. Proof
5. Handoff

## Internal Rollout Order

Launch in this order:

1. `one-workflow-completion`
2. `launch-blocker-sweep`
3. `rapid-decision-brief`
4. `trend-signal-12`
5. `character-seed-pack`
6. the higher-ticket plans only after proof and intake quality are stable

## Pricing Rule

Do not use ultra-cheap teaser pricing.

These services should signal:

- bounded outcome
- accountable delivery
- proof included
- first-party ownership of quality

That is more consistent with Boreal's wedge than low-trust commodity pricing.
