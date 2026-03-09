/**
 * Vitest setup - mocks and globals
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock HTMLMediaElement.play (not implemented in jsdom)
if (typeof HTMLMediaElement !== 'undefined') {
  HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
}

// Mock MediaStream for useMediaCapture startScreenShare
if (typeof globalThis.MediaStream === 'undefined') {
  globalThis.MediaStream = class MediaStream {
    constructor() {
      this._tracks = [];
    }
    addTrack(track) {
      this._tracks.push(track);
    }
    getTracks() {
      return this._tracks;
    }
    getVideoTracks() {
      return this._tracks.filter((t) => t.kind === 'video');
    }
    getAudioTracks() {
      return this._tracks.filter((t) => t.kind === 'audio');
    }
  };
}

// Mock MediaDevices for useMediaCapture
if (typeof navigator !== 'undefined') {
  const mockStream = {
    getTracks: () => [
      { kind: 'video', stop: vi.fn() },
      { kind: 'audio', stop: vi.fn() },
    ],
    getVideoTracks: () => [{ kind: 'video', stop: vi.fn() }],
    getAudioTracks: () => [{ kind: 'audio', stop: vi.fn() }],
  };
  navigator.mediaDevices = {
    getUserMedia: vi.fn().mockResolvedValue(mockStream),
    getDisplayMedia: vi.fn().mockResolvedValue(mockStream),
  };
}

// Mock AudioContext for audioPlayer
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createBuffer = vi.fn(() => ({
    copyToChannel: vi.fn(),
  }));
  createBufferSource = vi.fn(() => ({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
  }));
  createGain = vi.fn(() => ({
    gain: { value: 1 },
    connect: vi.fn(),
  }));
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

vi.stubGlobal('AudioContext', MockAudioContext);
vi.stubGlobal('webkitAudioContext', MockAudioContext);
