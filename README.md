# GoldenPi WhatsApp AI POC

This package defines the provider-neutral boundary between a WhatsApp provider adapter, GoldenPi policy controls, and the future Gemini response service.

## Completed checkpoints

### T0.2 — Provider-neutral contracts

- Strict TypeScript/Zod validation for inbound and outbound messages.
- Explicit authentication levels.
- Explicit intent and policy-decision contracts.
- Deterministic POC rules that cannot be overridden by Gemini.
- A simulator fixture for `What is a bond?`.
- Automated tests for valid input, unsafe/invalid input, authentication, customer data, and investment recommendations.

### T1.1 — Local REST service

- `GET /health` returns service status.
- `POST /v1/simulate` validates the normalized inbound-message contract.
- A deterministic classifier applies the approved POC policy.
- A fixed educational response answers `What is a bond?`.
- Structured logs exclude message text, sender identity, and phone number.
- Request bodies are limited to 64 KiB.

### T1.2 — WATI inbound adapter boundary

- `POST /v1/providers/wati/webhook` accepts a WATI message-received payload.
- WATI fields are converted into the existing provider-neutral contract.
- Only text messages are supported during this checkpoint.
- Raw WhatsApp numbers are pseudonymized before entering the internal contract.
- Provider parsing remains separate from classification and policy enforcement.

No Google Cloud mutations, BigQuery access, Gemini calls, or WATI calls occur in these checkpoints.

### T1.3 — Cloud Run packaging

- Google Node.js buildpack-compatible source layout.
- Explicit Node.js 24 runtime selection.
- Direct production entry point through `Procfile`.
- `.gcloudignore` excludes local, generated, secret, and archive files.
- Private deployment runbook in `docs/cloud-run-poc.md`.

## Rule matrix

| Intent | Authentication | Action | Customer data | AI response |
| --- | --- | --- | --- | --- |
| Public information | Any | Allow AI response | No | Yes |
| Customer-specific | Anonymous/identified | Require authentication | No | No |
| Customer-specific | Verified | Human handoff during POC | No | No |
| Transaction request | Any | Human handoff | No | No |
| Investment recommendation | Any | Human handoff | No | No |
| Unsupported | Any | Human handoff | No | No |

## Local development

```bash
npm ci
npm run check
npm run build
npm start
```

The server listens on `PORT`, defaulting to `8080`.

Test health in a second terminal:

```bash
curl http://localhost:8080/health
```

Test the simulator:

```bash
jq -c '.inbound' fixtures/public-bond-question.json | \
  curl -H 'content-type: application/json' \
  --data-binary @- \
  http://localhost:8080/v1/simulate
```

Test the saved WATI webhook fixture:

```bash
curl -H 'content-type: application/json' \
  --data-binary @fixtures/wati-message-received.json \
  http://localhost:8080/v1/providers/wati/webhook
```

Expected validation result: TypeScript completes without errors and all 17 tests pass.

## Next checkpoint

T1.3 will deploy the fixed-response service privately to Cloud Run:

- dedicated runtime service account
- Google IAM-authenticated invocation
- `asia-south1` deployment
- no BigQuery, Gemini, or WATI credentials yet

Follow [`docs/cloud-run-poc.md`](docs/cloud-run-poc.md) only after the repository checkpoint has been verified.
