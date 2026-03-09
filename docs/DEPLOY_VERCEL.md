# Deploy EduLens Frontend to Vercel

Deploy the EduLens React frontend to Vercel. The **backend** (Cloud Run) must already be deployed — the frontend connects to it via WebSocket.

---

## Prerequisites

1. **[Backend deployed on Cloud Run](DEPLOY_GOOGLE_CLOUD.md)** — you need the service URL, e.g. `https://edulens-xxxxx-uc.a.run.app`
2. A [Vercel account](https://vercel.com)

---

## Step 1: Import the project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your EduLens repo (GitHub/GitLab/Bitbucket)
4. Vercel will auto-detect Vite

---

## Step 2: Configure build

Vercel should detect:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Root Directory:** (leave empty)

If not, set them in **Settings** → **General**.

---

## Step 3: Set the backend URL

The frontend must know where your Cloud Run backend lives.

1. In your Vercel project → **Settings** → **Environment Variables**
2. Add:

   | Name        | Value                                      | Environments   |
   |-------------|--------------------------------------------|----------------|
   | `VITE_WS_URL` | `wss://YOUR-SERVICE-URL/ws`               | All            |

   Replace `YOUR-SERVICE-URL` with your Cloud Run URL (no trailing slash).  
   Example: `wss://edulens-abc123-uc.a.run.app/ws`

3. Save

---

## Step 4: Deploy

- **First deploy:** Click **Deploy** after importing
- **Later deploys:** Push to your connected branch (e.g. `main`) — Vercel deploys automatically

---

## Step 5: Verify

1. Open your Vercel URL (e.g. `https://edulens.vercel.app`)
2. Click **Camera on paper** or **Share screen**
3. Grant camera/mic — the app should connect to your Cloud Run backend via WebSocket

---

## Architecture (split deployment)

```
[User] → Vercel (frontend) → Cloud Run (backend) → Gemini Live API
         static React/Vite      WebSocket proxy
```

- **Vercel:** Serves HTML, JS, CSS. No backend logic.
- **Cloud Run:** Handles `/ws`, `/api`, `/health`, and `GEMINI_API_KEY`.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Connection error" | Ensure `VITE_WS_URL` is set to `wss://...` (not `https://`) and matches your Cloud Run URL |
| CORS errors | Cloud Run + Express default CORS allows all; if you restricted it, add your Vercel domain |
| Build fails | Run `npm run build` locally — fix any errors before redeploying |
