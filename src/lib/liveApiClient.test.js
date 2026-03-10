import { describe, it, expect } from 'vitest';
import {
  createSetupMessage,
  createSetupMessageFallback,
  createAudioInput,
  createImageInput,
  createProblemTrigger,
  createTextMessage,
  createRealtimeInput,
} from './liveApiClient';

describe('liveApiClient', () => {
  describe('createSetupMessage', () => {
    it('returns valid JSON', () => {
      const msg = createSetupMessage();
      expect(() => JSON.parse(msg)).not.toThrow();
    });

    it('contains setup with model and generationConfig (camelCase)', () => {
      const msg = JSON.parse(createSetupMessage());
      expect(msg).toHaveProperty('setup');
      expect(msg.setup).toHaveProperty('model', 'models/gemini-2.5-flash-native-audio-preview-12-2025');
      expect(msg.setup).toHaveProperty('generationConfig');
      expect(msg.setup.generationConfig.responseModalities).toContain('AUDIO');
    });

    it('includes Socratic system instruction', () => {
      const msg = JSON.parse(createSetupMessage());
      const text = msg.setup.systemInstruction.parts[0].text;
      expect(text).toContain('EduLens');
      expect(text).toContain('SOCRATIC');
      expect(text).toContain('subject');
    });
  });

  describe('createSetupMessageFallback', () => {
    it('uses same model and config', () => {
      const msg = JSON.parse(createSetupMessageFallback());
      expect(msg.setup.model).toBe('models/gemini-2.5-flash-native-audio-preview-12-2025');
    });
  });

  describe('createAudioInput', () => {
    it('returns realtimeInput with audio/pcm mimeType', () => {
      const msg = JSON.parse(createAudioInput('dGVzdA=='));
      expect(msg).toHaveProperty('realtimeInput');
      expect(msg.realtimeInput.mediaChunks[0].mimeType).toBe('audio/pcm;rate=16000');
      expect(msg.realtimeInput.mediaChunks[0].data).toBe('dGVzdA==');
    });
  });

  describe('createImageInput', () => {
    it('returns realtimeInput with image/jpeg mimeType', () => {
      const msg = JSON.parse(createImageInput('base64jpegdata'));
      expect(msg).toHaveProperty('realtimeInput');
      expect(msg.realtimeInput.mediaChunks[0].mimeType).toBe('image/jpeg');
      expect(msg.realtimeInput.mediaChunks[0].data).toBe('base64jpegdata');
    });
  });

  describe('createProblemTrigger', () => {
    it('returns clientContent with user turn and turnComplete', () => {
      const msg = JSON.parse(createProblemTrigger('type', null, 'Solve 2x+5=15'));
      expect(msg).toHaveProperty('clientContent');
      expect(msg.clientContent.turns).toHaveLength(1);
      expect(msg.clientContent.turns[0].role).toBe('user');
      expect(msg.clientContent.turnComplete).toBe(true);
    });

    it('includes image when provided', () => {
      const msg = JSON.parse(createProblemTrigger('snap', 'base64img', null));
      expect(msg.clientContent.turns[0].parts[0].inlineData.mimeType).toBe('image/jpeg');
      expect(msg.clientContent.turns[0].parts[1].text).toContain('step');
    });
  });

  describe('createTextMessage', () => {
    it('returns clientContent with user turn and turnComplete', () => {
      const msg = JSON.parse(createTextMessage('next step'));
      expect(msg).toHaveProperty('clientContent');
      expect(msg.clientContent.turns).toHaveLength(1);
      expect(msg.clientContent.turns[0].role).toBe('user');
      expect(msg.clientContent.turns[0].parts[0].text).toBe('next step');
      expect(msg.clientContent.turnComplete).toBe(true);
    });
  });

  describe('createRealtimeInput', () => {
    it('wraps payload in realtimeInput', () => {
      const payload = { mediaChunks: [] };
      const msg = JSON.parse(createRealtimeInput(payload));
      expect(msg.realtimeInput).toEqual(payload);
    });
  });
});
