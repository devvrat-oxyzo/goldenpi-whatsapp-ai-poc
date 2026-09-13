# Controlled Vertex AI Gemini checkpoint

T1.4 replaces only the approved public-information fixed response with Gemini. Deterministic classification and policy enforcement remain outside the model. BigQuery, customer data, external tools, and outbound WATI calls remain disabled.

## Runtime configuration

- Project: `goldenpi-data-layer`
- Location: `asia-south1`
- Model: `gemini-3.5-flash`
- Runtime identity: `gp-whatsapp-poc-runtime@goldenpi-data-layer.iam.gserviceaccount.com`
- Authentication: application-default credentials from the Cloud Run service account; no API key

## Grant the minimum Vertex AI runtime role

Run once in Google Cloud Shell:

```bash
gcloud projects add-iam-policy-binding goldenpi-data-layer \
  --member="serviceAccount:gp-whatsapp-poc-runtime@goldenpi-data-layer.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user" \
  --condition=None
```

This task does not grant BigQuery, Secret Manager, Storage, or administrative roles to the runtime identity.

## Deploy the Gemini-enabled revision

```bash
gcloud run deploy goldenpi-whatsapp-poc \
  --source=. \
  --project=goldenpi-data-layer \
  --region=asia-south1 \
  --service-account=gp-whatsapp-poc-runtime@goldenpi-data-layer.iam.gserviceaccount.com \
  --no-allow-unauthenticated \
  --ingress=all \
  --min=0 \
  --max=2 \
  --concurrency=20 \
  --cpu=1 \
  --memory=256Mi \
  --timeout=30s \
  --set-env-vars=NODE_ENV=production,AI_RESPONSE_MODE=vertex,VERTEX_PROJECT_ID=goldenpi-data-layer,VERTEX_LOCATION=asia-south1,VERTEX_MODEL=gemini-3.5-flash
```

## Verification

Submit the existing authenticated simulator fixture. Confirm that:

- `decision` is `ALLOW_AI_RESPONSE`;
- `diagnostic.responseSource` is `VERTEX_AI_GEMINI`;
- `diagnostic.model` is `gemini-3.5-flash`;
- `diagnostic.promptVersion` is `1.0.0`;
- `diagnostic.skillId` is `PUBLIC_BOND_EDUCATION`;
- `diagnostic.customerDataAccessed` is `false`;
- structured logs omit the question, answer, phone number, and sender identity.

If `responseSource` is `POC_FALLBACK`, do not close T1.4. Inspect only the safe Cloud Run error metadata and the runtime service account's Vertex AI permission.
