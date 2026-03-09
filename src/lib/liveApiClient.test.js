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

    it('contains setup with model and generation_config (snake_case)', () => {
      const msg = JSON.parse(createSetupMessage());
      expect(msg).toHaveProperty('setup');
      expect(msg.setup).toHaveProperty('model', 'models/gemini-2.5-flash-native-audio-preview-12-2025');
      expect(msg.setup).toHaveProperty('generation_config');
      expect(msg.setup.generation_config.response_modalities).toContain('AUDIO');
    });

    it('includes Socratic system instruction', () => {
      const msg = JSON.parse(createSetupMessage());
      const text = msg.setup.system_instruction.parts[0].text;
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
    it('returns realtime_input with audio/pcm mime_type', () => {
      const msg = JSON.parse(createAudioInput('dGVzdA=='));
      expect(msg).toHaveProperty('realtime_input');
      expect(msg.realtime_input.media_chunks[0].mime_type).toBe('audio/pcm;rate=16000');
      expect(msg.realtime_input.media_chunks[0].data).toBe('dGVzdA==');
    });
  });

  describe('createImageInput', () => {
    it('returns realtime_input with image/jpeg mime_type', () => {
      const msg = JSON.parse(createImageInput('base64jpegdata'));
      expect(msg).toHaveProperty('realtime_input');
      expect(msg.realtime_input.media_chunks[0].mime_type).toBe('image/jpeg');
      expect(msg.realtime_input.media_chunks[0].data).toBe('base64jpegdata');
    });
  });

  describe('createGreetingTrigger', () => {
    it('returns client_content with user turn and turn_complete', () => {
      const msg = JSON.parse(createGreetingTrigger());
      expect(msg).toHaveProperty('client_content');
      expect(msg.client_content.turns).toHaveLength(1);
      expect(msg.client_content.turns[0].role).toBe('user');
      expect(msg.client_content.turn_complete).toBe(true);
    });

    it('includes greeting prompt', () => {
      const msg = JSON.parse(createGreetingTrigger());
      expect(msg.client_content.turns[0].parts[0].text).toContain('Begin the session');
    });
  });

  describe('createRealtimeInput', () => {
    it('wraps payload in realtime_input', () => {
      const payload = { media_chunks: [] };
      const msg = JSON.parse(createRealtimeInput(payload));
      expect(msg.realtime_input).toEqual(payload);
    });
  });
});
