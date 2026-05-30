# Problem Intel

This lane turns repeated internet pain into a structured Boreal-facing opportunity map.

It is downstream of canon.
It does not create a new Boreal root object.
It exists to help Boreal learn where serious external work demand is clustering, how those problems should be tagged, and which request-native completion lanes look commercially strongest.

## Goals

- collect recurring public pain signals
- normalize them into one consistent record shape
- tag aggressively enough to support pattern mining
- draft a first-pass fulfillment plan
- critique that plan before it becomes a promoted opportunity
- expose one public-facing snapshot in the web app

## Repo-local storage

Volatile automation output stays inside the repo at:

- `tmp/problem-intel/raw/`
- `tmp/problem-intel/runs/`
- `tmp/problem-intel/published/`

These files should stay gitignored.

Stable references and examples stay in tracked paths:

- `docs/research/problem-intel/`
- `fixtures/problem-intel/`

## Public surface

The first public web surface is:

- `/problem-intel`

The page should read:

1. `tmp/problem-intel/published/public-latest.json` when it exists
2. `fixtures/problem-intel/public-problem-intel.sample.json` as fallback

This keeps the page live even before the first automation run.

## Automation outputs

Each automation run should write:

- one raw source bundle under `tmp/problem-intel/raw/YYYY/MM/DD/`
- one normalized run artifact under `tmp/problem-intel/runs/`
- one public snapshot history file under `tmp/problem-intel/published/history/`
- one rolling latest snapshot at `tmp/problem-intel/published/public-latest.json`

## Canonicalization rule

Repeated problems should not keep appearing as sibling rows.

When a new run rediscovers the same underlying pain:

- keep one canonical `problemId`
- merge new evidence into that existing problem
- append a new history snapshot under the same problem directory
- preserve older titles or generated ids as aliases only

The app should prefer:

- exact `problemId` match first
- exact title or alias match second
- strong workflow, pain, and pattern-tag overlap third

This lane should accrete evidence on one problem directory instead of minting a near-duplicate directory each run.

## Selection rule

Bias toward repeated problems that match Boreal's current wedge:

- startup and SMB buyers
- urgent digital work
- fuzzy intake
- mixed human and AI execution
- proof, review, or handoff requirements

Good examples:

- automation implementation or rescue
- security questionnaire completion
- RFP or proposal completion
- vibe-coded MVP rescue to production handoff
- bookkeeping or ops cleanup with proof-heavy closure

## Promotion rule

The automation should not treat raw chatter as truth.

Promote a problem only when:

- multiple recent signals point to the same pain
- the buyer and workflow are clear enough to name
- the problem implies paid external work, not only curiosity
- the plan survives a stricter critique pass

Promotion into Boreal-facing action should stay manual by default.

Default owner:

- repo owner
- product owner
- operator reviewing the intel lane

Reason:

- public pain is not the same as real buyer-owned demand
- canon should not silently convert internet chatter into durable `Request` objects

The first promotion target is:

- `RequestDraft` template export

not:

- automatic `Request` creation

Repo-local manual promotion records live under:

- `tmp/problem-intel/promotions/`

Exported request-draft templates live under:

- `tmp/problem-intel/promotions/request-drafts/`

Promotion writes require `PROBLEM_INTEL_EDIT_TOKEN` in every environment.
Staging, demo, and local servers must not become writable merely because
`NODE_ENV` is not `production`.

## Output shape

Use the sample fixture in:

- `fixtures/problem-intel/public-problem-intel.sample.json`

and the tag families in:

- `docs/research/problem-intel/TAXONOMY.md`

The public snapshot should stay easy to scan:

- top clusters
- top problems
- evidence notes
- score breakdowns
- first-pass plan
- judge verdict

## Plan evaluation

Every promoted or promotable problem should expose a structured plan-eval view.

Minimum checks:

- request-rootedness
- fulfillment realism
- proof readiness
- wedge fit
- clarity
- blockers

This eval should answer:

- does the plan produce a real request-worthy service lane
- does it preserve proof and handoff requirements
- is it commercially sharp enough to test
- what still blocks promotion
