# EduLens — A tutor that sees your homework

> "A tutor that sees your homework, talks with you like a human, and never loses patience."

**Gemini Live Agent Challenge — Live Agents category**

![Architecture Diagram](docs/architecture.svg)

EduLens is a real-time homework tutor powered by the **Gemini Live API**. It watches your paper or screen through the camera, listens to you, and guides you with Socratic questions—all via natural voice conversation with barge-in support.

## What makes it impressive

- **Camera watches your work** — Point your phone at your paper or share your screen for digital homework
- **Natural voice conversation** — Speak freely, interrupt anytime ("wait, go back")
- **Socratic method** — Asks guiding questions instead of giving away answers
- **Adapts to you** — Detects where you're stuck and matches your grade level
- **Zero extra hardware** — Phone rear camera or laptop webcam is enough

## Tech stack

- **Model:** `gemini-2.0-flash-exp` (Live API) — upgrade to `gemini-live-2.5-flash-native-audio` on Vertex AI for best quality
- **SDK:** `@google/genai` (Google GenAI SDK — mandatory requirement)
- **Audio:** 16-bit PCM 16 kHz mono in, 24 kHz out
- **Video:** JPEG frames at 1 FPS
- **Hosting:** Google Cloud Run (GCP service requirement)

## Quick start

1. **Clone and install**

   ```bash
   cd EduLens
   npm install
   ```

2. **Add your Gemini API key**

   ```bash
   cp .env.example .env
   # Edit .env and add your key from https://aistudio.google.com/apikey
   ```

3. **Run locally**

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:5173  
   - Backend: http://localhost:8080

4. **Open in your browser**

   - **Phone (best):** Prop phone, point rear camera at paper, talk hands-free
   - **Laptop:** Webcam on paper, or use "Share screen" for digital work

## Project structure

```
EduLens/
├── public/              # Static assets
│   ├── logo.png         # EduLens logo (favicon, header, footer)
│   └── manifest.json    # PWA manifest
├── server/              # Express + WebSocket proxy to Gemini Live API
├── src/              # React frontend
│   ├── lib/          # Live API client, audio player
│   └── hooks/        # Media capture (camera, screen, mic)
├── index.html
├── vite.config.js
└── package.json
```

## Deploy to Google Cloud Run

### Option 1: Manual deploy
```bash
npm run build
gcloud run deploy edulens --source .
```

### Option 2: Automated (Cloud Build — bonus)
```bash
gcloud builds submit --config=cloudbuild.yaml
```

Set `GEMINI_API_KEY` in Cloud Run environment variables (Secret Manager recommended).

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for system design and data flow.

## Testing

```bash
npm run test        # Unit + integration tests
npm run test:e2e    # End-to-end (Playwright)
npm run test:all    # Both
```

See [docs/TESTING.md](docs/TESTING.md) for details.

## License

MIT
