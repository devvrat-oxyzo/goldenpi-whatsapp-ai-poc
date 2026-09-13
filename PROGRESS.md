# GoldenPi WhatsApp AI Backend — Progress Tracker

Last updated: 2026-09-13

## Objective

Build a modular, provider-agnostic REST backend for a GoldenPi WhatsApp support bot, using Cloud Run, Gemini on Vertex AI, BigQuery, Firestore, Cloud Tasks, and Secret Manager. Begin with customer support and add controlled sales-growth capabilities only after the support foundation is validated.

## Working agreement

- Work on one active task at a time.
- Each task must produce a testable output.
- A task moves to `Complete` only after its completion criteria are confirmed.
- Side questions do not change the active task unless explicitly agreed.
- At the end of each implementation exchange, ask: “Is the current task complete?”
- Record decisions, blockers, evidence, and the next task here.

## Status summary

| Phase | Status | Exit condition |
| --- | --- | --- |
| Sprint 0 — Access and scope | Complete | Required access verified and first use case fixed |
| Sprint 1 — Webhook vertical slice | In progress | Test WhatsApp message reaches Cloud Run and receives a fixed reply |
| Sprint 2 — Customer verification | Not started | Registered test customer is safely identified |
| Sprint 3 — Knowledge answers | Not started | Gemini answers from approved sources with citations/fallback |
| Sprint 4 — Conversation reliability | Not started | State, retries, deduplication, logging, and handoff work |
| Sprint 5 — Controlled pilot | Not started | UAT passed with a restricted user group |
| Sprint 6 — Sales capabilities | Deferred | Compliance-approved rules and measurement are ready |

## Current checkpoint

### T1.4 — Connect Gemini for controlled public-information answers

Status: **Local implementation complete; Codespaces and Cloud Run verification pending**

Approved by the user on 2026-09-13.

Implementation checkpoint:

- Added version-controlled `prompts/master.md`.
- Added allowlisted `prompts/skills/public-bond-education/SKILL.md`.
- Added a mockable AI-responder boundary and Vertex AI implementation using `@google/genai`.
- Gemini is called only after deterministic policy returns `ALLOW_AI_RESPONSE`.
- Added a fixed approved fallback for Vertex AI errors or empty responses.
- Kept BigQuery, customer data, external tools, and WATI outbound calls disabled.
- Added safe diagnostic fields for model, prompt ID/version, skill ID, and response source.
- Selected configurable `gemini-3.5-flash` in `asia-south1`; no API key is stored.
- Local TypeScript validation, 22 of 22 tests, and the production build passed.

## Active task

### T0.1 — Verify access and select the first vertical slice

Status: **Complete**

Decision checkpoint T0.1a: **Complete**

- Billing confirmed enabled.
- BigQuery location confirmed as `asia-south1`.
- Node.js with TypeScript accepted.
- Private AI simulator question `What is a bond?` accepted.
- POC hosting confirmed as `goldenpi-data-layer`.

Checkpoint T0.1b: **Complete — Cloud readiness evidence received**

Device/workflow constraint: the project owner is using an iPad Pro and the ChatGPT app. Use Safari/Chrome with the Google Cloud Console and its browser-based Cloud Shell for Google Cloud commands. Use ChatGPT for instructions, code artifacts, screenshot review, and progress tracking. Do not require a local laptop terminal for the POC.

Screenshot evidence reviewed on 2026-09-13:

- Confirmed enabled: Artifact Registry API, IAM API, Cloud Logging API, Cloud Monitoring API, Cloud Trace API, and several optional platform services.
- Not confirmed by the screenshots: Vertex AI API (`aiplatform.googleapis.com`), Cloud Run Admin API (`run.googleapis.com`), or Cloud Build API (`cloudbuild.googleapis.com`).
- Agent Platform API, Agent Registry API, Model Armor API, and Agent Identity API are not substitutes for the Vertex AI API.
- Agent Identity API being disabled is not a blocker for the current POC.
- The displayed Marketplace `New Google Cloud Shell deployment` page and Infrastructure Manager API are not required. Use the normal Cloud Shell terminal icon in the Google Cloud Console header.

Final Cloud Shell evidence reviewed on 2026-09-13:

- Vertex AI API confirmed enabled: `aiplatform.googleapis.com`.
- Cloud Build API confirmed enabled: `cloudbuild.googleapis.com`.
- Cloud Run Admin API confirmed enabled: `run.googleapis.com`.
- Mistaken Infrastructure Manager API (`config.googleapis.com`) was disabled successfully.
- Commands were scoped explicitly to `goldenpi-data-layer`.

Run the read-only Cloud Shell checks below and retain the output:

```bash
gcloud config get-value account
gcloud config get-value project
gcloud billing projects describe goldenpi-data-layer \
  --format='table(projectId,billingEnabled)'
gcloud services list --enabled \
  --project=goldenpi-data-layer \
  --format='value(config.name)' | \
  grep -E '^(run|cloudbuild|artifactregistry|aiplatform|iam|iamcredentials|logging)\.googleapis\.com$'
bq show --format=prettyjson goldenpi-data-layer:goldenpi_data_etl | jq -r '.location'
```

Expected evidence:

- Active account is the intended GoldenPi administrator account.
- Active project is `goldenpi-data-layer`.
- `billingEnabled` is `True`.
- Required enabled APIs appear; missing APIs will be enabled explicitly in the next approved step.
- BigQuery dataset output shows `location: asia-south1`.

These checks do not query, insert, update, or delete business data.

Required output:

1. Confirm the Google Cloud hosting project. **Confirmed: `goldenpi-data-layer` for POC.**
2. Confirm billing and API-enablement authority. **Billing confirmed; API state still to be tested.**
3. Confirm access to deploy a Cloud Run service. **Authority likely confirmed; deployment still to be tested.**
4. Confirm Vertex AI/Gemini API availability. **Authority likely confirmed; API/model call still to be tested.**
5. Confirm read-only access path to required BigQuery data. **User access confirmed; dedicated runtime identity still to be configured.**
6. Confirm initial WhatsApp provider. **WATI selected; subscription, number, sandbox, and credentials deferred until POC validation.**
7. Fix the first end-to-end use case. **Private AI simulator accepted.**

Proposed first use case — private AI simulator:

> An authorized tester sends `What is a bond?` to `POST /v1/simulate` on a private Cloud Run service. The backend normalizes the message, applies a `PUBLIC_INFORMATION` rule, calls Gemini on Vertex AI using approved instructions, and returns the answer plus safe diagnostic metadata. Cloud Logging records the trace ID, selected rule, latency, and result without customer PII.

Example test input:

```json
{
  "channel": "simulator",
  "userId": "poc-user-001",
  "message": "What is a bond?",
  "authenticationLevel": "anonymous"
}
```

Expected response shape:

```json
{
  "traceId": "generated-id",
  "intent": "PUBLIC_INFORMATION",
  "decision": "ALLOW_AI_RESPONSE",
  "answer": "Gemini-generated answer",
  "requiresHuman": false
}
```

POC controls:

- Cloud Run requires Google IAM authentication; it is not public.
- No WATI subscription or phone number is required.
- No customer-specific data is sent to Gemini.
- No write is made to BigQuery.
- Configuration, decision rule, safe AI output, trace ID, and latency are observable.
- The future WATI adapter will normalize its webhook into this same internal message contract.

Completion criteria:

- Hosting project recorded as `goldenpi-data-layer` for POC.
- Project Owner access recorded; billing and API enablement verified in Cloud Console/CLI.
- Private Cloud Run deployment is permitted.
- Dedicated runtime service account can be created.
- Vertex AI API and a supported Gemini model can be invoked in the selected region.
- Read-only BigQuery access is available for a later slice.
- WATI is selected but explicitly not a POC blocker.
- Private AI simulator use case is accepted.

## Access evidence checklist

| Area | Evidence required | Status |
| --- | --- | --- |
| Google Cloud | Project ID and billing enabled | Confirmed by user; command evidence pending |
| API management | Permission or admin contact to enable APIs | Confirmed through successful service commands |
| Cloud Run | Permission to deploy and configure ingress | Confirmed through private deployment in `asia-south1` |
| IAM | Permission or admin contact to create/configure a service account | Confirmed; dedicated runtime identity deployed |
| Vertex AI | API enabled, usable region, and model access | API enabled; model invocation proof moves to Sprint 1 |
| BigQuery | Read-only access to approved data/views | User access confirmed; runtime access pending |
| WhatsApp provider | Provider name, sandbox number, API token, webhook settings | WATI selected; credentials deferred |
| Security | POC invocation protected by Google IAM; future webhook control documented | POC approach selected; production review pending |
| Operations | Named human-handoff owner/team | Unknown |

## Architecture decisions

| ID | Decision | Status |
| --- | --- | --- |
| ADR-001 | Use Cloud Run rather than Apps Script for the production webhook | Accepted |
| ADR-002 | Use provider adapters behind one normalized message contract | Accepted |
| ADR-003 | Use BigQuery for governed analytical/customer knowledge, not live session state | Accepted |
| ADR-004 | Use Firestore for conversation state and message deduplication | Proposed |
| ADR-005 | Use Cloud Tasks for asynchronous work and retries | Proposed |
| ADR-006 | Start with support; defer promotional recommendations until controls are approved | Accepted |
| ADR-007 | Host the POC in `goldenpi-data-layer`; migrate production ingress to a separate project | Accepted |
| ADR-008 | Keep the POC Cloud Run service private and invoke it with Google IAM | Accepted |
| ADR-009 | Validate logic through a provider simulator before purchasing WATI | Accepted |

## Product backlog

| ID | Item | Priority | Status |
| --- | --- | --- | --- |
| T0.1 | Verify access and select first vertical slice | P0 | Complete |
| T0.2 | Define normalized inbound/outbound message contract | P0 | Complete |
| T1.1 | Scaffold REST API with health endpoint | P0 | Complete |
| T1.2 | Implement initial provider webhook adapter | P0 | Complete |
| T1.3 | Deploy and test fixed reply | P0 | Complete |
| T1.4 | Connect controlled Gemini public-information response | P0 | Local implementation complete; verification pending |
| T2.1 | Define customer-verification policy | P0 | Not started |
| T2.2 | Create/read approved BigQuery customer view | P0 | Not started |
| T2.3 | Add OTP or secure-link flow for sensitive data | P0 | Not started |
| T3.1 | Define knowledge schema and approved sources | P1 | Not started |
| T3.2 | Add Gemini tool/function calling | P1 | Not started |
| T3.3 | Add grounded-answer and fallback evaluation | P1 | Not started |
| T4.1 | Add Firestore state and deduplication | P1 | Not started |
| T4.2 | Add Cloud Tasks retries | P1 | Not started |
| T4.3 | Add PII-safe logs and monitoring | P1 | Not started |
| T4.4 | Add human handoff | P1 | Not started |
| T5.1 | Execute UAT and restricted pilot | P1 | Not started |
| T6.1 | Define compliant sales decision rules | P2 | Deferred |

## Known context

- Organization: GoldenPi
- Existing data project: `goldenpi-data-layer`
- Known customer table: `goldenpi-data-layer.goldenpi_data_etl.CustomerMaster`
- Prior provider under consideration: WATI
- Data-access principle: read-only and least privilege

## Next task

### T0.2 — Define the normalized message and decision contracts

Status: **Complete**

Required output:

1. TypeScript schemas for provider-neutral inbound messages.
2. TypeScript schemas for AI/policy decisions and outbound responses.
3. A small rule matrix covering public information, customer-specific data, transactions, recommendations, and human handoff.
4. Example request/response fixtures for `What is a bond?`.
5. Validation tests proving invalid input is rejected.

Implementation result:

- Provider-neutral inbound schema created for simulator, WATI, Meta, Gupshup, and Twilio adapters.
- Outbound message schema created.
- Authentication levels defined: `ANONYMOUS`, `IDENTIFIED`, and `VERIFIED`.
- Policy intent/action/reason contracts created.
- Deterministic POC policy created outside Gemini control.
- `What is a bond?` fixture created.
- TypeScript compilation passed.
- Automated tests passed: 8 of 8.
- Source package prepared as `goldenpi-whatsapp-poc-t0.2.zip`.

Review gate:

- Confirm that public-information questions may receive an AI response without customer data.
- Confirm that unauthenticated customer-specific requests must request authentication.
- Confirm that customer-data access remains disabled for this initial POC.
- Confirm that transaction requests and investment recommendations go to human handoff during the POC.

Approval received on 2026-09-13. T0.2 was committed to GitHub as `8dc95d0` after 8 of 8 tests passed.

## Active task

### T1.1 — Scaffold the local REST API

Status: **Complete**

Implementation result:

- Added `GET /health`.
- Added `POST /v1/simulate` using the normalized inbound contract.
- Added deterministic POC intent classification outside Gemini control.
- Added the fixed educational response for `What is a bond?`.
- Added structured logs that omit message text and sender identifiers.
- Added a 64 KiB request-body limit and controlled error responses.
- TypeScript compilation passed.
- Automated tests passed: 13 of 13, including a post-build test run.
- Manual health and simulator requests returned the expected responses.

Completion gate:

- Commit T1.1 to GitHub.
- Run `npm ci` and `npm run check` in Codespaces.
- Start the service and confirm both endpoints in Codespaces.
- Confirm that fixed-response behavior is accepted before connecting Gemini.

Codespaces verification and approval completed on 2026-09-13. T1.1 was committed to GitHub as `a4ac9c0` after 13 of 13 tests, a production build, and manual endpoint tests passed.

### T1.2 — Add the WATI inbound adapter boundary

Status: **Complete**

Implementation result:

- Added a generic provider-adapter interface.
- Added a WATI `message` / `messageReceived` webhook schema based on current WATI documentation.
- Added `POST /v1/providers/wati/webhook`.
- Normalized WATI text events into the existing inbound contract.
- Pseudonymized the raw WATI sender identifier before internal processing.
- Reused the existing classifier and policy without provider-specific changes.
- Rejected malformed WATI payloads and unsupported non-text messages.
- Added a synthetic WATI fixture containing no real customer data.
- Automated tests passed: 17 of 17, including a post-build test run.
- Manual WATI-fixture request returned `200`, `accepted: true`, and the expected public-information decision.

Completion gate:

- Commit T1.2 to GitHub.
- Run `npm ci`, `npm run check`, and `npm run build` in Codespaces.
- Start the service and submit the saved WATI fixture.
- Confirm that the provider boundary is accepted before private Cloud Run deployment.

Codespaces verification and provisional approval completed on 2026-09-13. T1.2 was committed to GitHub as `323a49d` after 17 of 17 tests, a production build, and a manual synthetic WATI webhook test passed.

### T1.3 — Deploy and test the fixed reply privately

Status: **Complete**

Preparation result:

- Selected Cloud Run source deployment using Google Node.js buildpacks.
- Pinned the deployment runtime to Node.js 24.
- Added `Procfile` with the production entry point.
- Added `.gcloudignore` to exclude secrets, local dependencies, compiled output, coverage, Git data, and archives.
- Added `docs/cloud-run-poc.md` with explicit private deployment and authenticated health-test commands.
- Selected runtime service account `gp-whatsapp-poc-runtime` with no BigQuery, Vertex AI, WATI, or Secret Manager roles.
- Selected service name `goldenpi-whatsapp-poc` in `asia-south1`.

Deployment and verification result:

- Created and used runtime service account `gp-whatsapp-poc-runtime@goldenpi-data-layer.iam.gserviceaccount.com`.
- Deployed private Cloud Run service `goldenpi-whatsapp-poc` in `asia-south1`.
- Initial revision `goldenpi-whatsapp-poc-00001-zzs` served 100% of traffic.
- Anonymous `/health` invocation returned `403`.
- Google-IAM-authenticated `/health` invocation returned `200` and the expected service metadata.
- Authenticated `/v1/simulate` returned `PUBLIC_INFORMATION`, `ALLOW_AI_RESPONSE`, and `customerDataAccessed: false`.
- Service configuration confirmed ingress `all`, maximum scale `2`, concurrency `20`, and the dedicated runtime identity.
- Service IAM policy contained no `allUsers` or `allAuthenticatedUsers` binding.
- Initial application objects were fragmented across multiple `textPayload` entries, so T1.3 remained open for correction.
- Commit `a959ed8` changed safe application output to one JSON line per event and added a regression test.
- Automated verification passed: 18 of 18 tests plus the production TypeScript build.
- Revision `goldenpi-whatsapp-poc-00002-f7t` was deployed and now serves 100% of traffic.
- Final anonymous invocation returned `403`; authenticated simulator invocation returned the expected approved response.
- Cloud Logging stored `request.completed` as one structured `jsonPayload` record containing only method, path, status, trace ID, policy action, and latency.
- Verified log latency was 31 ms. Message text, phone number, sender identifier, and customer data were absent.

Completion gate:

- Commit and verify the deployment preparation files.
- Clone the clean repository in Google Cloud Shell.
- Create or confirm the dedicated runtime service account.
- Deploy with anonymous access disabled.
- Confirm the service identity, region, ingress setting, and IAM policy.
- Invoke `/health` and `/v1/simulate` using a Google identity token.
- Review PII-safe Cloud Logging output.

## Deferred production-ingress design

The future WATI endpoint will be internet-reachable because WATI must call it. Internet-reachable does not mean unrestricted access to customer data. The proposed separation is:

1. A minimal public webhook receiver verifies the provider secret/signature, rate-limits, validates the payload, and queues a normalized event.
2. A private worker runs under a dedicated service account and alone receives narrowly scoped BigQuery and Vertex AI access.
3. Public-information responses require no customer authentication.
4. Customer-specific information requires an approved authentication level such as OTP or a secure logged-in link.
5. Logs exclude message bodies, phone numbers, tokens, and sensitive financial data unless explicitly approved and protected.

## Change log

- 2026-09-13 — Project tracker created. T0.1 marked as the active task.
- 2026-09-13 — Recorded POC hosting in `goldenpi-data-layer`, WATI selection/deferment, private ingress preference, and proposed private AI simulator vertical slice.
- 2026-09-13 — Completed decision checkpoint T0.1a: billing, region, Node.js/TypeScript, and simulator use case confirmed. Started T0.1b read-only Cloud readiness verification.
- 2026-09-13 — Reviewed iPad screenshots. Supporting APIs confirmed, but Vertex AI, Cloud Run, and Cloud Build APIs remain unverified. Recorded iPad-first workflow and identified Marketplace Cloud Shell deployment page as unnecessary.
- 2026-09-13 — Cloud Shell evidence confirmed Vertex AI, Cloud Build, and Cloud Run APIs enabled. Infrastructure Manager API disable completed successfully. Closed T0.1 and queued T0.2.
- 2026-09-13 — Implemented T0.2 TypeScript/Zod contracts, deterministic policy rules, fixtures, and validation tests. Build passed and 8/8 tests passed. Awaiting user review.
- 2026-09-13 — Approved and committed T0.2 as `8dc95d0`.
- 2026-09-13 — Implemented and verified T1.1 REST simulator service with 13/13 tests; committed as `a4ac9c0`.
- 2026-09-13 — Implemented T1.2 WATI inbound adapter boundary with a synthetic fixture and 17/17 tests. Awaiting Codespaces verification.
- 2026-09-13 — Approved and committed T1.2 as `323a49d`.
- 2026-09-13 — Started T1.3 private Cloud Run deployment preparation using source buildpacks and a dedicated no-data-access runtime identity.
- 2026-09-13 — Deployed private Cloud Run revision `goldenpi-whatsapp-poc-00001-zzs`; verified IAM-only access and the fixed simulator response.
- 2026-09-13 — Corrected fragmented stdout logging in commit `a959ed8`, passed 18/18 tests, and deployed revision `goldenpi-whatsapp-poc-00002-f7t`.
- 2026-09-13 — Verified one-row structured `jsonPayload` logging with no message or sender PII. Closed T1.3 and proposed T1.4 controlled Gemini integration.
- 2026-09-13 — User approved T1.4. Added versioned Markdown prompt modules, a mockable Gemini boundary, deterministic routing, safe fallback behavior, and 22 passing tests. Codespaces and live Vertex AI verification remain pending.
