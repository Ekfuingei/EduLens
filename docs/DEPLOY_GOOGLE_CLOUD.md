# Deploy EduLens Backend to Google Cloud Run

Step-by-step guide to deploy the EduLens backend (Express + WebSocket + static frontend) to Google Cloud Run.

---

## Prerequisites

- [Google Cloud CLI (gcloud)](https://cloud.google.com/sdk/docs/install) installed
- A Google Cloud project
- A [Gemini API key](https://aistudio.google.com/apikey)

---

## Step 1: Install and log in to gcloud

```bash
# Install gcloud (if not installed)
# macOS: brew install google-cloud-sdk

# Log in
gcloud auth login

# Set your project
gcloud config set project YOUR_PROJECT_ID
```

Replace `YOUR_PROJECT_ID` with your Google Cloud project ID (e.g. `edulens-123456`).

---

## Step 2: Enable required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
```

---

## Step 3: Create a secret for your API key (recommended)

```bash
# Create the secret (paste your key when prompted)
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=-
```

Or use the [Secret Manager console](https://console.cloud.google.com/security/secret-manager) to create a secret named `gemini-api-key`.

**Grant Cloud Run access to the secret:**

```bash
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 4: Deploy using one of these methods

### Option A: Deploy from source (simplest)

From the EduLens directory:

```bash
cd /Users/macbookpro2017/Desktop/EduLens

gcloud run deploy edulens \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

If you haven't created a secret, use env var instead:

```bash
gcloud run deploy edulens \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "GEMINI_API_KEY=your_actual_api_key"
```

### Option B: Deploy with Cloud Build (CI/CD)

**First-time setup:** Create the secret and grant access (Step 3 above). Cloud Build uses `gemini-api-key` automatically.

```bash
cd /Users/macbookpro2017/Desktop/EduLens

gcloud builds submit --config=cloudbuild.yaml
```

Cloud Build now passes `GEMINI_API_KEY` from Secret Manager on every deploy. No manual step needed.

---

## Step 5: Get your service URL

After deployment:

```bash
gcloud run services describe edulens --region us-central1 --format='value(status.url)'
```

Or open [Cloud Run](https://console.cloud.google.com/run), click `edulens`, and copy the URL.

---

## Step 6: Verify

1. Open the service URL in your browser
2. You should see the EduLens homepage
3. Click **Camera on paper** or **Share screen** — the app will request camera/mic and connect to the tutor

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `GEMINI_API_KEY not configured` | Add the secret or env var in Cloud Run (Step 4) |
| WebSocket fails | Ensure you're using `https://` — Cloud Run supports WSS |
| Build fails | Run `npm run build` locally first to confirm it works |

---

## Cost notes

- Cloud Run charges per request and CPU time
- Free tier: 2 million requests/month
- Gemini API has its [own pricing](https://ai.google.dev/pricing)
