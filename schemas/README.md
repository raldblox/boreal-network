# Schema Layout

This directory holds machine-readable contract artifacts.

## Folders

- `json/` for canonical object schemas
- `openapi/` for HTTP and webhook contracts
- `events/` for async event contracts

## Naming Guidance

### JSON Schema

Recommended naming:

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

## Rule

Do not let markdown be the only contract surface once machine-readable schema work begins.
