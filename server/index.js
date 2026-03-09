/**
 * EduLens - Homework Tutor Backend
 * Uses Google GenAI SDK + Live API (Gemini Live Agent Challenge compliant)
 * WebSocket proxy to Gemini Live API
 * Hosted on Google Cloud Run
 */

import 'dotenv/config';
import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { app } from './app.js';

const PORT = process.env.PORT || 8080;
const getGeminiApiKey = () => process.env.GEMINI_API_KEY;
const GEMINI_WS_URL =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

wss.on('connection', (clientWs, req) => {
  if (!getGeminiApiKey()) {
    clientWs.send(
      JSON.stringify({ type: 'error', message: 'GEMINI_API_KEY not configured' })
    );
    clientWs.close();
    return;
  }

  const geminiUrl = `${GEMINI_WS_URL}?key=${getGeminiApiKey()}`;
  const geminiWs = new WebSocket(geminiUrl);
  const pendingMessages = [];

  geminiWs.on('open', () => {
    pendingMessages.forEach((msg) => geminiWs.send(msg));
    pendingMessages.length = 0;
  });

  geminiWs.on('message', (data) => {
    try {
      clientWs.send(data);
    } catch (e) {
      console.error('Failed to forward to client:', e);
    }
  });

  geminiWs.on('error', (err) => {
    console.error('Gemini WebSocket error:', err);
    clientWs.send(JSON.stringify({ type: 'error', message: err.message }));
  });

  geminiWs.on('close', () => {
    clientWs.close();
  });

  clientWs.on('message', (data) => {
    try {
      if (geminiWs.readyState === 1) {
        geminiWs.send(data);
      } else if (geminiWs.readyState === 0) {
        pendingMessages.push(data);
      }
    } catch (e) {
      console.error('Failed to forward to Gemini:', e);
    }
  });

  clientWs.on('close', () => {
    geminiWs.close();
  });
});

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      const actualPort = httpServer.address().port;
      if (process.env.NODE_ENV !== 'test') {
        console.log(`EduLens server running on port ${actualPort}`);
        if (!getGeminiApiKey()) {
          console.warn(
            'WARNING: GEMINI_API_KEY not set. Set it in .env or environment.'
          );
        }
      }
      resolve(httpServer);
    });
  });
}

if (!process.env.VITEST) {
  startServer(PORT);
}
