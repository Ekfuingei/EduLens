/**
 * EduLens - Express app (routes only)
 * WebSocket and server lifecycle are in index.js
 */

import express from 'express';
import { verifyGeminiAccess } from './geminiSdk.js';

export const app = express();

// Serve static build
app.use(express.static('dist'));

// Health check for Cloud Run
app.get('/health', (_, res) => res.json({ status: 'ok' }));

// Google GenAI SDK verification - proves SDK usage for challenge
app.get('/api/verify', async (_, res) => {
  const result = await verifyGeminiAccess();
  res.json(result);
});
