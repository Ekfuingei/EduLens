import { describe, it, expect } from 'vitest';
import {
  createSetupMessage,
  createSetupMessageFallback,
  createAudioInput,
  createImageInput,
  createGreetingTrigger,
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

  describe('createGreetingTrigger', () => {
    it('returns clientContent with user turn and turnComplete', () => {
      const msg = JSON.parse(createGreetingTrigger());
      expect(msg).toHaveProperty('clientContent');
      expect(msg.clientContent.turns).toHaveLength(1);
      expect(msg.clientContent.turns[0].role).toBe('user');
      expect(msg.clientContent.turnComplete).toBe(true);
    });

    it('includes greeting prompt', () => {
      const msg = JSON.parse(createGreetingTrigger());
      expect(msg.clientContent.turns[0].parts[0].text).toContain('Begin the session');
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
