# GoldenPi WhatsApp POC — T0.2 Contracts

This package defines the provider-neutral boundary between a WhatsApp provider adapter, GoldenPi policy controls, and the future Gemini response service.

## What this checkpoint includes

- Strict TypeScript/Zod validation for inbound and outbound messages.
- Explicit authentication levels.
- Explicit intent and policy-decision contracts.
- Deterministic POC rules that cannot be overridden by Gemini.
- A simulator fixture for `What is a bond?`.
- Automated tests for valid input, unsafe/invalid input, authentication, customer data, and investment recommendations.

No network calls, Google Cloud mutations, BigQuery access, Gemini calls, or WATI calls occur in this checkpoint.

## Rule matrix

| Intent | Authentication | Action | Customer data | AI response |
| --- | --- | --- | --- | --- |
| Public information | Any | Allow AI response | No | Yes |
| Customer-specific | Anonymous/identified | Require authentication | No | No |
| Customer-specific | Verified | Human handoff during POC | No | No |
| Transaction request | Any | Human handoff | No | No |
| Investment recommendation | Any | Human handoff | No | No |
| Unsupported | Any | Human handoff | No | No |

## Local verification

```bash
npm install
npm run check
```

Expected result: TypeScript completes without errors and all tests pass.

## Next checkpoint

T1.1 will wrap these contracts in an HTTP service with:

- `GET /health`
- `POST /v1/simulate`
- private Cloud Run deployment
- structured, PII-safe request logging
