# T1.6 — Hosted internal chatbot simulator

## Purpose

`demo-ui` is a separate, responsive web service for internal demonstrations and policy testing before a live WhatsApp connection exists. It displays the customer-facing answer and a safe decision trace in separate panels.

The browser never receives Google credentials and never calls the private AI backend directly. In the hosted design, the demo service uses its own service account to obtain a Google identity token and invoke the existing private Cloud Run backend.

IAP authenticates the internal tester only. It does **not** make the tester a verified GoldenPi customer, so simulator messages continue to enter the backend with `authentication.level: ANONYMOUS`.

## Current checkpoint: local mock

From the repository root in Codespaces:

```bash
cd demo-ui
npm ci
npm run check
npm run build
PORT=8081 BACKEND_MODE=mock npm start
```

When Codespaces offers to open port `8081`, choose **Open in Browser**. Keep the forwarded port private.

Try all four buttons:

| Question | Expected decision |
| --- | --- |
| What is a bond? | `ALLOW_AI_RESPONSE` |
| Show my portfolio | `REQUIRE_AUTHENTICATION` |
| Which bond should I buy? | `HUMAN_HANDOFF` |
| Help me place an order | `HUMAN_HANDOFF` |

The mock verifies the UI and policy presentation only. It does not invoke Gemini or BigQuery.

## Hosted design

1. The tester signs in through Google Cloud IAP.
2. The browser posts only to the same-origin `POST /api/chat` endpoint.
3. The UI service creates the normalized anonymous simulator payload.
4. Its dedicated service account invokes private `goldenpi-whatsapp-poc` with a Google identity token.
5. The backend continues to own classification, policy, prompts and Gemini access.
6. The UI returns the answer and an allowlisted diagnostic subset.

The hosted deployment and IAP grants are deliberately deferred until the local UI is accepted.

## Security controls in this checkpoint

- Synthetic-data warning is visible in the interface.
- Request messages are limited to 1,000 characters; bodies are limited to 16 KiB.
- Browser security headers include a same-origin content security policy, `no-store`, `nosniff`, frame denial and no referrer.
- UI operational logs omit question text, answer text, Google identity and customer identifiers.
- Backend failures return a generic message rather than upstream details.
- No WATI credential, Vertex credential or Google token is sent to the browser.
- No customer-data access is added.

## Environment variables

| Variable | Local value | Hosted value |
| --- | --- | --- |
| `BACKEND_MODE` | `mock` | `cloud-run` |
| `BACKEND_URL` | Not used | Private backend URL |
| `PORT` | `8081` | Supplied by Cloud Run |

