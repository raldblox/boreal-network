# Problem Intel Taxonomy

Use controlled tag families first.
Use open tags second.
Use aliases to collapse duplicates and spelling drift.

## Controlled tag families

### `buyerTags`

Who feels the pain.

Examples:

- `founder`
- `operator`
- `growth_lead`
- `product_lead`
- `technical_lead`
- `revops_lead`

### `companyStageTags`

What kind of company is expressing the pain.

Examples:

- `solo`
- `seed`
- `series_a`
- `agency`
- `smb`

### `verticalTags`

What business context the problem appears in.

Examples:

- `b2b_saas`
- `ecommerce`
- `agency_services`
- `marketplace`
- `local_services`

### `workflowTags`

What workflow the pain belongs to.

Examples:

- `support_ops`
- `lead_routing`
- `security_review`
- `proposal_ops`
- `mvp_rescue`
- `bookkeeping_cleanup`

### `toolTags`

Named tools or stacks mentioned by the source.

Examples:

- `hubspot`
- `zapier`
- `n8n`
- `gmail`
- `slack`
- `quickbooks`

### `painTags`

The core buyer pain.

Examples:

- `broken_automation`
- `manual_rework`
- `slow_turnaround`
- `scope_confusion`
- `handoff_failure`
- `compliance_burden`

### `symptomTags`

Observed symptoms rather than root causes.

Examples:

- `copy_paste_work`
- `missed_followups`
- `duplicate_records`
- `late_responses`
- `unowned_backlog`
- `stalled_launch`

### `triggerTags`

What changed or caused the problem to surface.

Examples:

- `ai_adoption`
- `tool_sprawl`
- `team_growth`
- `new_customer_requirements`
- `urgent_launch`

### `constraintTags`

Constraints blocking resolution.

Examples:

- `small_team`
- `no_revops_owner`
- `tight_deadline`
- `messy_data`
- `unclear_process`
- `limited_budget`

### `proofTags`

How the buyer will know the problem is truly resolved.

Examples:

- `operator_handoff`
- `audit_trail`
- `working_build`
- `qa_checklist`
- `delivered_document`
- `signed_approval`

### `urgencyTags`

How urgent the pain looks.

Examples:

- `active_fire`
- `same_week`
- `quarter_deadline`
- `customer_blocking`

### `spendTags`

What spend or willingness-to-pay signals show up.

Examples:

- `already_paying_for_tools`
- `contract_blocked`
- `revenue_blocked`
- `budget_1k_5k`
- `budget_5k_20k`

### `sourceTags`

Where the signal came from.

Examples:

- `reddit`
- `x`
- `linkedin`
- `hacker_news`
- `community_forum`
- `founder_slack`

### `geoTags`

Geography if it materially matters.

Examples:

- `global_remote`
- `united_states`
- `southeast_asia`
- `metro_manila`

### `patternTags`

Cross-problem motifs useful for Boreal strategy.

Examples:

- `completion_over_generation`
- `human_review_required`
- `proof_required`
- `buyer_needs_accountable_owner`
- `fuzzy_intake`
- `tool_chain_fragility`

### `executionTags`

Likely fulfillment shape.

Examples:

- `human_lead_plus_ai_build`
- `human_only_service`
- `direct_tool_lane`
- `documentation_support_lane`
- `qa_and_evidence_lane`

### `borealFitTags`

Why the problem fits Boreal specifically.

Examples:

- `request_rooted`
- `mixed_supply`
- `handoff_sensitive`
- `verification_sensitive`
- `curated_supply_friendly`
- `repeatable_request_class`

## Open tags

Use `openTags` aggressively for:

- source-specific language
- jargon clusters
- new tool names
- emerging buyer roles
- vertical-specific terms not yet promoted into the taxonomy

Promote repeated open tags into controlled families only after they recur.

## Aliases

Use `tagAliases` to fold drift such as:

- `rev_ops -> revops`
- `security-questionnaire -> security_review`
- `automation rescue -> broken_automation`

## Scoring fields

Every promoted problem should carry numeric scores from `0` to `1`:

- `frequencyScore`
- `urgencyScore`
- `painSeverityScore`
- `willingnessToPayScore`
- `automationFitScore`
- `borealFitScore`

The public page should treat these as comparable heuristics, not absolute truth.
