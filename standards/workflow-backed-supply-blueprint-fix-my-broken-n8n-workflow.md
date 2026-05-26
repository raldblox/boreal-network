# Workflow-backed Supply Blueprint: Fix My Broken n8n Workflow

## Status

Draft implementation blueprint

## Purpose

This file defines the first workflow-backed supply blueprint Boreal should standardize and eventually implement.

It is the recommended first supply because:

- demand is immediate
- outcome is legible
- proof is easier than greenfield automation
- `n8n` import adds obvious value

## Canonical Reading

Buyer is buying:

- one bounded workflow rescue outcome

Buyer is not buying:

- a JSON file
- a node graph viewer
- general `n8n` access

Canonical outer path remains:

- `Request`
- optional `Commitment`
- `Fulfillment`
- `Artifact`
- `Transaction`

## Supply Family

Suggested family key:

- `fix-broken-n8n-workflow`

Suggested supply profile:

- `profile.displayName`: `Fix My Broken n8n Workflow`
- `profile.headline`: `Diagnose, repair, test, and hand off one broken workflow`
- `profile.summary`: `Boreal repairs one broken n8n workflow, verifies the fix, and returns a clear handoff package with proof.`

Suggested capability:

- `capability.supplyKinds`: `automation_builder`, `operations_build`, `documentation_support`
- `capability.fulfillmentActorKinds`: `human`, `agent`, `tool`
- `capability.outputKinds`: `workflow_map`, `workflow_build`, `issue_log`, `handoff_doc`, `delivery`
- `capability.executionChannels`: `request_room`, `api`, `operator_review`

Suggested source:

- `source.kind = "catalog"`

Suggested workflow metadata:

- `metadata.workflow.profile = "workflow_backed_v1"`
- `metadata.workflow.adapterKind = "n8n"`

## Preset Plans

### `workflow-triage`

- price: `$149`
- turnaround: `48 hours`
- promise: diagnose one broken workflow and return a repair plan
- execution depth: no guaranteed fix

### `workflow-repair`

- price: `$649`
- turnaround: `5 business days`
- promise: repair one bounded workflow, verify the run path, and hand off the working version
- execution depth: recommended initial flagship plan

### `workflow-rescue-plus`

- price: `$1,350`
- turnaround: `7 to 10 business days`
- promise: repair one workflow, improve adjacent reliability, clean inputs and outputs, and ship a stronger handoff pack

## Recommended First Launch Plan

Launch first:

- `workflow-repair`

Why:

- strong value density
- still bounded
- enough room for real operator work
- good proof package

## Buyer Inputs

Required:

- problem summary
- current workflow JSON or workspace access mode
- target apps or systems involved
- expected intended outcome

Helpful but optional:

- screenshots of failures
- recent execution errors
- sample payloads
- known credential ownership

## Credential Inputs

The supply should declare slots for:

- `n8n_workspace_access`
- app-specific API credentials
- optional first-party provider credentials when Boreal can safely use its own account for bounded testing

Do not assume Boreal can reuse buyer credentials without explicit approval.

## Human Checkpoints

Required checkpoints:

- confirm workflow source and ownership
- confirm fix target
- confirm production-push or handoff preference
- confirm final repair result when needed

Blocking checkpoint examples:

- buyer must approve production deployment
- buyer must approve replacing or deleting existing nodes

## Workflow Pack Binding

Suggested underlying pack:

- `WorkflowPack.key = "fix-broken-n8n-workflow"`
- active version targets `adapterKind = "n8n"`

The pack should support both:

- import-existing-workflow mode
- guided manual recreation mode when raw import is unavailable or unsafe

## Normalized Block Outline

Suggested default graph:

1. `Input: problem summary`
2. `Input: workflow source`
3. `Import or inspect n8n workflow`
4. `Detect credentials and integrations`
5. `Analyze failures`
6. `Operator repair plan review`
7. `Apply repair`
8. `Test execution`
9. `Generate issue log and workflow map`
10. `Publish handoff artifacts`
11. `Delivery confirmation`

## Fulfillment Design

Suggested execution reading:

- one accepted `Fulfillment`
- several `FulfillmentStep` rows for inspect, repair, test, handoff

Recommended step kinds:

- `analysis`
- `tool_call`
- `review`
- `delivery_step`

## Proof Package

Minimum proof package for `workflow-repair`:

- `issue_log`
- `workflow_map`
- repaired workflow export or documented recreated flow
- `handoff_doc`
- final `delivery` summary

Optional:

- proof video
- test payload samples
- before and after snapshots

## Acceptance Rules

The supply should not resolve as complete unless:

- repaired workflow path is documented
- buyer has a clear handoff package
- final delivery artifact is published
- blocking approval steps have been satisfied

If buyer production credentials or runtime access are missing, the lane may resolve as:

- diagnosis complete
- fix drafted
- blocked pending buyer action

not falsely as fully repaired in production.

## Failure Modes

Common blockers:

- missing credentials
- broken external apps outside `n8n`
- community nodes Boreal cannot trust or reproduce
- code-node complexity beyond bounded repair scope
- buyer environment access not granted

The supply should surface these early as bounded blockers, not hide them in execution logs.

## Suggested Request Metadata

```json
{
  "serviceFamilyKey": "fix-broken-n8n-workflow",
  "servicePlanKey": "workflow-repair",
  "workflow": {
    "profile": "workflow_backed_v1",
    "adapterKind": "n8n",
    "packKey": "fix-broken-n8n-workflow"
  }
}
```

## Suggested Commitment Shape

Use fixed-price commitment for:

- `workflow-triage`
- `workflow-repair`

Use range or quote commitment only when:

- community-node sprawl
- large multi-workflow rescue
- unclear production access boundary

## Out-of-Scope Rule

Do not let this first supply silently become:

- full automation consulting retainer
- open-ended app integration build
- unlimited troubleshooting contract

If scope expands, open a new commitment boundary or new supply plan.

## MVP Success Criteria

This supply is successful when Boreal can:

- import or inspect one broken `n8n` workflow
- normalize it into one workflow pack version
- bind it to one published supply plan
- open one buyer request with pinned supply
- produce one repair fulfillment with proof artifacts
