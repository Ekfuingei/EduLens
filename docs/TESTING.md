# EduLens Test Suite

## Overview

| Type | Command | Location |
|------|---------|----------|
| **Unit** | `npm run test` | Vitest (src/**/*.test.js, server/**/*.test.js) |
| **Integration** | `npm run test` | server/server.integration.test.js |
| **E2E** | `npm run test:e2e` | e2e/*.spec.js (Playwright) |

## Unit Tests

- **liveApiClient.test.js** — Setup message, audio/image input, greeting trigger
- **audioPlayer.test.js** — PCM decoding, playback, stop
- **useMediaCapture.test.js** — Camera, screen share, capture (mocked media)
- **App.test.jsx** — Rendering, options, WebSocket flow (mocked)

## Integration Tests

- **server.integration.test.js** — Real server:
  - GET /health
  - GET /api/verify (GenAI SDK)
  - WebSocket /ws error when GEMINI_API_KEY not set

## E2E Tests

- Homepage load, start options, footer
- Camera on paper → connecting/connected/error
- Share screen → connecting/connected/error
- End session → back to idle

**Run E2E:** Starts `npm run dev` (backend + frontend). Requires GEMINI_API_KEY in .env for full flow; tests pass even when API errors (expect "error" or "try again").

## CI

```bash
npm run test        # Unit + integration
npm run test:e2e    # E2E (starts dev server)
npm run test:all    # Both
```
