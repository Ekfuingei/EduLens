/**
 * useMediaCapture unit tests
 * Uses mocked navigator.mediaDevices from test setup
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaCapture } from './useMediaCapture';

const createMockStream = (video = true, audio = true) => {
  const tracks = [];
  if (video) tracks.push({ kind: 'video', stop: vi.fn() });
  if (audio) tracks.push({ kind: 'audio', stop: vi.fn() });
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((t) => t.kind === 'video'),
    getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'),
  };
};

describe('useMediaCapture', () => {
  beforeEach(() => {
    const fullStream = createMockStream(true, true);
    const displayStream = createMockStream(true, false);
    const micStream = createMockStream(false, true);
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementation((c) =>
      Promise.resolve(c?.audio && !c?.video ? micStream : fullStream)
    );
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(displayStream);
  });

  describe('startCamera', () => {
    it('calls getUserMedia with video and audio constraints', async () => {
      const { result } = renderHook(() => useMediaCapture());
      await act(async () => {
        await result.current.startCamera();
      });
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: 'environment' }),
          audio: expect.objectContaining({ channelCount: 1 }),
        })
      );
    });

    it('returns stream', async () => {
      const { result } = renderHook(() => useMediaCapture());
      let stream;
      await act(async () => {
        const res = await result.current.startCamera();
        stream = res.stream;
      });
      expect(stream).toBeDefined();
      expect(stream.getTracks).toBeDefined();
    });
  });

  describe('startScreenShare', () => {
    it('calls getDisplayMedia and getUserMedia for mic', async () => {
      const { result } = renderHook(() => useMediaCapture());
      await act(async () => {
        await result.current.startScreenShare();
      });
      expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled();
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({ audio: expect.any(Object) })
      );
    });
  });

  describe('captureVideoFrame', () => {
    it('returns null when no video element', () => {
      const { result } = renderHook(() => useMediaCapture());
      const frame = result.current.captureVideoFrame();
      expect(frame).toBeNull();
    });
  });

  describe('stopCapture', () => {
    it('stops without error', async () => {
      const { result } = renderHook(() => useMediaCapture());
      await act(async () => {
        await result.current.startCamera();
      });
      act(() => {
        result.current.stopCapture();
      });
    });
  });
});
