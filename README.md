# GoldenPi WhatsApp AI POC

This package defines the provider-neutral boundary between a WhatsApp provider adapter, GoldenPi policy controls, and Gemini on Vertex AI.

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

No BigQuery access or outbound WATI calls occur in these checkpoints.

### T1.3 — Cloud Run packaging

- Google Node.js buildpack-compatible source layout.
- Explicit Node.js 24 runtime selection.
- Direct production entry point through `Procfile`.
- `.gcloudignore` excludes local, generated, secret, and archive files.
- Private deployment runbook in `docs/cloud-run-poc.md`.

### T1.4 — Controlled Gemini boundary

- Versioned master instructions in `prompts/master.md`.
- Allowlisted public-bond skill in `prompts/skills/public-bond-education/SKILL.md`.
- Gemini is invoked only after deterministic policy returns `ALLOW_AI_RESPONSE`.
- The official `@google/genai` SDK uses Cloud Run application-default credentials.
- Gemini failure returns the approved fixed educational fallback.
- BigQuery and customer data remain disabled.
- The model, prompt ID, prompt version, skill ID, and response source are observable without logging the question or answer.

### T1.6 — Internal demo UI (in progress)

- Separate responsive service under `demo-ui/`; the existing backend remains unchanged.
- Same-origin server bridge keeps Google credentials and the private backend URL out of browser logic.
- Customer answer and safe policy trace are displayed separately.
- Local mock covers public education, authentication, recommendation handoff, and transaction handoff.
- The hosted design uses Cloud Run IAP for internal tester access and a dedicated service identity for backend invocation.
- See [`docs/hosted-demo-ui.md`](docs/hosted-demo-ui.md) for the iPad/Codespaces review flow.

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

Expected backend validation result: TypeScript completes without errors and all 23 backend tests pass.

Validate the separate demo UI with:

```bash
cd demo-ui
npm ci
npm run check
npm run build
```

Expected UI validation result: TypeScript completes without errors and all 5 UI tests pass.

## Gemini configuration

Local development defaults to the fixed responder. A live Vertex AI call is enabled only with explicit server-side environment variables:

```bash
AI_RESPONSE_MODE=vertex
VERTEX_PROJECT_ID=goldenpi-data-layer
VERTEX_LOCATION=asia-south1
VERTEX_MODEL=gemini-3.5-flash
```

No API key is stored. Cloud Run authenticates through its dedicated runtime service account. Follow [`docs/vertex-ai-poc.md`](docs/vertex-ai-poc.md) only after the repository checkpoint has been verified.
