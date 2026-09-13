# Private Cloud Run POC deployment

This checkpoint deploys the fixed-response service to `goldenpi-data-layer` in `asia-south1`. It does not attach BigQuery, Vertex AI, WATI, or Secret Manager permissions.

## Security posture

- Invocation requires Google IAM authentication.
- The Cloud Run URL is internet-routable, but anonymous invocation is disabled.
- The runtime uses a dedicated service account with no project roles granted.
- Maximum instances are limited to two for the POC.
- Application logs omit message text, phone numbers, and sender identifiers.

## Cloud Shell deployment

Run every command separately from a clean clone of the repository.

```bash
gcloud config set project goldenpi-data-layer
```

```bash
gcloud iam service-accounts create gp-whatsapp-poc-runtime \
  --project=goldenpi-data-layer \
  --display-name="GoldenPi WhatsApp POC runtime"
```

If the command reports that the service account already exists, continue without creating another one.

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
  --set-env-vars=NODE_ENV=production
```

The first source deployment can create the `cloud-run-source-deploy` Artifact Registry repository. It can also request one-time Cloud Build permissions. Stop and review unexpected permission requests instead of granting broad roles.

## Authenticated health test

```bash
SERVICE_URL=$(gcloud run services describe goldenpi-whatsapp-poc \
  --project=goldenpi-data-layer \
  --region=asia-south1 \
  --format='value(status.url)')
```

```bash
curl --fail-with-body \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  "$SERVICE_URL/health"
```

Expected response:

```json
{"status":"ok","service":"goldenpi-whatsapp-poc","version":"0.1.0"}
```

Do not make the service unauthenticated for this POC.
