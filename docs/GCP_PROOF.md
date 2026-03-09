# Google Cloud Deployment Proof

**Gemini Live Agent Challenge** — Proof that EduLens backend runs on Google Cloud.

## Option A: Code evidence (for submission)

EduLens uses the following Google Cloud services. Links point to the relevant code:

| Service | Purpose | Code Location |
|---------|---------|---------------|
| **Cloud Run** | Hosts the backend | [`Dockerfile`](../Dockerfile) — container config for Cloud Run |
| **Cloud Build** | Automated deployment | [`cloudbuild.yaml`](../cloudbuild.yaml) — IaC deployment |
| **Cloud Run** | Service definition | `cloudbuild.yaml` steps 2–3 — `gcloud run deploy` |

### Deploy command (proves GCP usage)

```bash
# From project root — deploys to Google Cloud Run
gcloud builds submit --config=cloudbuild.yaml
# OR
gcloud run deploy edulens --source .
```

### Architecture

See [Architecture Diagram](architecture.svg) and [ARCHITECTURE.md](ARCHITECTURE.md).

---

## Option B: Screen recording (recommended for judges)

A short (<2 min) recording showing:

1. **Google Cloud Console** → Cloud Run → EduLens service running
2. **Logs** → Recent requests to `/health` or `/ws`
3. **Service URL** → `https://edulens-xxxxx.run.app` (or similar) in browser

This visually proves the backend is deployed and running on GCP.
