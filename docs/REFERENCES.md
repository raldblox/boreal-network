# References

This file records the main standards and domain-pattern sources used while shaping Boreal Network's canon.

These references do not override repo-specific decisions.
They explain where the structure and standards came from.

## Documentation Architecture

- Diataxis framework: [https://diataxis.fr/](https://diataxis.fr/)

## Contract Standards

- JSON Schema: [https://json-schema.org/](https://json-schema.org/)
- JSON Schema Draft 2020-12: [https://json-schema.org/draft/2020-12](https://json-schema.org/draft/2020-12)
- OpenAPI Specification: [https://spec.openapis.org/oas/latest.html](https://spec.openapis.org/oas/latest.html)
- AsyncAPI Docs: [https://www.asyncapi.com/docs](https://www.asyncapi.com/docs)

## Event and Observability Patterns

- Temporal workflow execution and event history concepts: [https://docs.temporal.io/workflow-execution](https://docs.temporal.io/workflow-execution)
- OpenTelemetry docs: [https://opentelemetry.io/docs/](https://opentelemetry.io/docs/)

## Domain Pattern References

- Zendesk ticket and request model: [https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/](https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/)
- Linear issue workflow reference: [https://linear.app/docs/creating-issues](https://linear.app/docs/creating-issues)
- Upwork proposal and workroom references:
  - [https://support.upwork.com/hc/en-us/articles/211062998-Submit-a-proposal](https://support.upwork.com/hc/en-us/articles/211062998-Submit-a-proposal)
  - [https://support.upwork.com/hc/en-us/articles/17975182774163](https://support.upwork.com/hc/en-us/articles/17975182774163)
- Shopify order and fulfillment model:
  - [https://shopify.dev/docs/api/admin-graphql/latest/objects/Order](https://shopify.dev/docs/api/admin-graphql/latest/objects/Order)
  - [https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder](https://shopify.dev/docs/api/admin-graphql/latest/objects/FulfillmentOrder)
- Microsoft Dynamics work order reference: [https://learn.microsoft.com/en-us/dynamics365/field-service/create-work-order](https://learn.microsoft.com/en-us/dynamics365/field-service/create-work-order)

## How To Use These References

- Use the standards references when adding machine-readable contracts.
- Use the domain references when evaluating naming, object boundaries, and lifecycle patterns.
- Use repo canon first when a reference conflicts with Boreal-specific design.
