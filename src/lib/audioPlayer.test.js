import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAudioPlayer } from './audioPlayer';

describe('audioPlayer', () => {
  let player;

  beforeEach(() => {
    player = createAudioPlayer();
  });

  describe('init', () => {
    it('returns AudioContext', async () => {
      const ctx = await player.init();
      expect(ctx).toBeDefined();
      expect(ctx.state).toBeDefined();
    });
  });

  describe('playPcmChunk', () => {
    it('decodes base64 PCM without throwing', async () => {
      const pcm16 = new Int16Array([0, 16384, -16384, 32767]);
      const uint8 = new Uint8Array(pcm16.buffer);
      const base64 = btoa(String.fromCharCode.apply(null, uint8));
      await expect(player.playPcmChunk(base64)).resolves.not.toThrow();
    });

    it('handles empty chunk gracefully', async () => {
      const empty = btoa('');
      await expect(player.playPcmChunk(empty)).resolves.not.toThrow();
    });
  });

  describe('stop', () => {
    it('resets state without throwing', () => {
      expect(() => player.stop()).not.toThrow();
    });

    it('can be called multiple times', () => {
      player.stop();
      expect(() => player.stop()).not.toThrow();
    });
  });
});
