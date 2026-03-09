# EduLens Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EDULENS — HOMEWORK TUTOR                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐         ┌─────────────────────────────────────────────────────┐
│   📱 FRONTEND   │         │              ☁️ GOOGLE CLOUD                         │
│   (Vite+React)  │         │                                                      │
│                 │         │  ┌─────────────────────────────────────────────────┐ │
│  • Camera/      │  WSS    │  │         Cloud Run (Node.js)                      │ │
│    Screen       │◄───────►│  │  • Express HTTP + WebSocket proxy              │ │
│  • Mic 16kHz    │  /ws    │  │  • @google/genai SDK (verify, Live API)         │ │
│  • Video 1 FPS  │         │  └───────────────────┬───────────────────────────────┘ │
│  • Audio 24kHz  │         │                      │                               │
│    playback     │         │                      │ WebSocket                      │
└────────┬────────┘         │                      │ (BidiGenerateContent)          │
         │                  │                      ▼                               │
         │                  │  ┌─────────────────────────────────────────────────┐ │
         │                  │  │      Gemini Live API                             │ │
         │                  │  │  (generativelanguage.googleapis.com)             │ │
         │                  │  │                                                  │ │
         │                  │  │  • Model: gemini-2.0-flash-exp                    │ │
         │                  │  │  • Real-time voice + vision                       │ │
         │                  │  │  • Barge-in, Socratic tutoring prompt            │ │
         │                  │  │  • 16kHz PCM in → 24kHz PCM out                   │ │
         │                  │  └─────────────────────────────────────────────────┘ │
         │                  └─────────────────────────────────────────────────────┘
         │
         │  HTTPS (static + /health, /api/verify)
         │
         ▼
```

## Data Flow

1. **User** opens EduLens in browser (phone or laptop).
2. **Frontend** requests camera + microphone; user chooses "Camera on paper" or "Share screen".
3. **Frontend** establishes WebSocket to backend `/ws`.
4. **Backend** (Cloud Run) proxies WebSocket to Gemini Live API with `GEMINI_API_KEY`.
5. **Frontend** streams:
   - Audio: 16-bit PCM 16 kHz mono (microphone) → `realtimeInput` with `audio/pcm;rate=16000`
   - Video: JPEG frames at 1 FPS → `realtimeInput` with `image/jpeg`
6. **Gemini** processes audio + vision, applies Socratic system prompt, returns spoken audio (24 kHz PCM).
7. **Frontend** decodes base64 PCM, plays via Web Audio API.
8. User can interrupt at any time (barge-in); Gemini stops and responds to the interruption.

## Google Cloud Services Used

| Service   | Purpose                                      |
|----------|-----------------------------------------------|
| Cloud Run| Hosts the EduLens backend (Express + WebSocket proxy) |
| (Optional) Vertex AI | Can replace Google AI for `gemini-live-2.5-flash-native-audio` |

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Frontend  | React 18, Vite                          |
| Backend   | Node.js 20, Express, ws (WebSocket)      |
| AI SDK    | @google/genai (mandatory requirement)   |
| Live API  | Gemini WebSocket BidiGenerateContent     |
| Hosting   | Google Cloud Run                        |
