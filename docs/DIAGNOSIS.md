# EduLens Voice Diagnosis Guide

Use this with `?debug=1` in the URL (e.g. `http://localhost:5173/?debug=1`). Open DevTools → Console before starting a session.

## Diagnostic Matrix

| What you see | What it means |
|--------------|---------------|
| No `Mic granted` after `setupComplete` | getUserMedia failing — mic never connects |
| `Mic granted` + `Sending problem trigger` but no `serverContent` | Gemini receiving but not responding |
| `serverContent` appears but no `Playing N audio chunk(s)` | Audio extraction bug |
| WebSocket closes early | Connection/auth issue |

## Expected Console Output (healthy flow)

```
[EduLens] WebSocket open, sending setup
[EduLens] setupComplete received
[EduLens] Sending problem trigger, turnComplete: true parts: 1
[EduLens] Mic granted, starting audio capture
[EduLens] Audio capture started
[EduLens] serverContent: [...] parts: N AUDIO
[EduLens] Playing N audio chunk(s)
[EduLens] Mic sent 50 chunks
[EduLens] Mic sent 100 chunks
...
```

## Diagnosis Checklist

### Issue 1: Gemini not responding

**Symptom:** You see `Sending problem trigger` but never `serverContent:` or `Playing N audio chunk(s)`.

**Check:**
- `turnComplete: true` is logged? (confirms format)
- Any `WebSocket closed:` before a response? (connection dropping)
- `msg:` logs with keys like `error`, `interrupted`? (API rejection)

**Relevant code:** `src/lib/liveApiClient.js` (createProblemTrigger), `src/App.jsx` (ws.onmessage)

### Issue 2: Mic not connected

**Symptom:** You see `setupComplete` but NOT `Mic granted` or `Audio capture started`.

**Check:**
- `[EduLens] Mic failed:` in console? (getUserMedia rejected)
- Browser prompted for microphone permission?
- Any `Audio capture started`? (AudioWorklet/ScriptProcessor loaded)
- `Mic sent N chunks` appearing? (PCM actually reaching the WebSocket)

**Relevant code:** `src/App.jsx` (getUserMedia, startAudioCapture), `src/hooks/useMediaCapture.js` (startAudioCapture)

## Key Code Files

### Problem trigger format (liveApiClient.js)
```javascript
// createProblemTrigger returns:
{
  clientContent: {
    turns: [{ role: 'user', parts: [/* image?, */ { text: "..." }] }],
    turnComplete: true
  }
}
```

### Setup format (liveApiClient.js)
```javascript
{
  setup: {
    model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: {...} },
    systemInstruction: { role: 'system', parts: [{ text: "..." }] }
  }
}
```

### Audio extraction (App.jsx ws.onmessage)
- `serverContent.modelTurn.parts` → inlineData with data + mimeType (audio/pcm or empty)
- `realtimeOutput.mediaChunks` → mimeType audio/pcm, data

---

## Code Files (for sharing)

### src/lib/liveApiClient.js

```javascript
// Key exports: createSetupMessage(), createProblemTrigger(), createAudioInput()
// createProblemTrigger(mode, imageBase64, typedText) returns:
// { clientContent: { turns: [{ role: 'user', parts: [...] }], turnComplete: true } }
```

See full file at `src/lib/liveApiClient.js` — setup, problem trigger format, and realtime input helpers.

### src/App.jsx — ws.onmessage and getUserMedia

Flow: `setupComplete` → playTestSound → send problem trigger (800ms) → getUserMedia → startAudioCapture → on each PCM chunk → ws.send(createAudioInput(base64)).

See `src/App.jsx` lines ~99–177 for full ws.onmessage handler and getUserMedia block.
