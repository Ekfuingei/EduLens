/**
 * Server app integration tests with supertest
 * Mocks geminiSdk - no real API calls
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from './app.js';

vi.mock('./geminiSdk.js', () => ({
  verifyGeminiAccess: vi.fn(),
}));

describe('app', () => {
  let verifyGeminiAccess;

  beforeEach(async () => {
    verifyGeminiAccess = (await import('./geminiSdk.js')).verifyGeminiAccess;
    vi.mocked(verifyGeminiAccess).mockReset();
  });

  describe('GET /health', () => {
    it('returns 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
    });

    it('returns { status: "ok" }', async () => {
      const res = await request(app).get('/health');
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /api/verify', () => {
    it('returns 200 and ok: true when geminiSdk succeeds', async () => {
      vi.mocked(verifyGeminiAccess).mockResolvedValue({
        ok: true,
        sdk: '@google/genai',
      });

      const res = await request(app).get('/api/verify');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true, sdk: '@google/genai' });
    });

    it('returns 200 and ok: false with error when geminiSdk fails', async () => {
      vi.mocked(verifyGeminiAccess).mockResolvedValue({
        ok: false,
        error: 'API key invalid',
        sdk: '@google/genai',
      });

      const res = await request(app).get('/api/verify');
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('API key invalid');
    });
  });
});
