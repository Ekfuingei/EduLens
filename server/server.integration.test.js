/**
 * Server integration tests - Real server, HTTP + WebSocket
 * Run with: npm run test
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import WebSocket from 'ws';
import { startServer } from './index.js';

describe('Server integration', () => {
  let httpServer;
  let baseUrl;

  beforeAll(async () => {
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    httpServer = await startServer(0);
    baseUrl = `http://localhost:${httpServer.address().port}`;
    if (saved) process.env.GEMINI_API_KEY = saved;
  });

  afterAll(() => {
    return new Promise((resolve) => httpServer.close(resolve));
  });

  describe('GET /health', () => {
    it('returns 200', async () => {
      const res = await fetch(`${baseUrl}/health`);
      expect(res.status).toBe(200);
    });

    it('returns { status: "ok" }', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/verify', () => {
    it('returns JSON with ok and sdk fields', async () => {
      const res = await fetch(`${baseUrl}/api/verify`);
      expect(res.headers.get('content-type')).toMatch(/json/);
      const data = await res.json();
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('sdk', '@google/genai');
    });
  });

  describe('WebSocket /ws', () => {
    it('sends error when GEMINI_API_KEY not set', async () => {
      const saved = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      try {
        const wsUrl = baseUrl.replace('http', 'ws') + '/ws';
        const ws = new WebSocket(wsUrl);

        const msg = await new Promise((resolve, reject) => {
          ws.on('message', resolve);
          ws.on('error', reject);
        });

        const data = JSON.parse(msg.toString());
        expect(data).toHaveProperty('type', 'error');
        expect(data).toHaveProperty('message');
        expect(data.message).toContain('GEMINI_API_KEY');
        ws.close();
      } finally {
        if (saved !== undefined) process.env.GEMINI_API_KEY = saved;
      }
    });
  });
});
