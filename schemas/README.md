# Schema Layout

This directory holds machine-readable contract artifacts.

## Folders

- `json/` for canonical object schemas
- `openapi/` for HTTP and webhook contracts
- `events/` for async event contracts

## Naming Guidance

### JSON Schema

Recommended naming:

- `common.schema.json`
- `request.schema.json`
- `supply.schema.json`
- `commitment.schema.json`
- `fulfillment.schema.json`
- `transaction.schema.json`
- `request-event.schema.json`

### OpenAPI

Recommended naming:

- `network.openapi.yaml`
- `requests.openapi.yaml`
- `supplies.openapi.yaml`

### Event Contracts

Recommended naming:

- `request-stream.asyncapi.yaml`
- `payments.asyncapi.yaml`

## Current Canonized Files

- `json/common.schema.json`
- `json/request.schema.json`
- `json/supply.schema.json`
- `json/commitment.schema.json`
- `json/fulfillment.schema.json`
- `json/transaction.schema.json`
- `json/request-event.schema.json`

Pending next machine-readable areas:

- OpenAPI request and supply contracts under `schemas/openapi/`
- event stream contracts under `schemas/events/`
- optional derived-object schemas for planner and matcher outputs if they become durable exchange contracts

## Rule

Do not let markdown be the only contract surface once machine-readable schema work begins.
