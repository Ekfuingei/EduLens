import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const mockStream = {
  getTracks: () => [{ kind: 'video', stop: vi.fn() }, { kind: 'audio', stop: vi.fn() }],
  getVideoTracks: () => [{ kind: 'video', stop: vi.fn() }],
  getAudioTracks: () => [{ kind: 'audio', stop: vi.fn() }],
};

vi.mock('./hooks/useMediaCapture', () => ({
  useMediaCapture: () => ({
    startCamera: vi.fn().mockResolvedValue({ stream: mockStream }),
    startScreenShare: vi.fn().mockResolvedValue({ stream: mockStream }),
    captureVideoFrame: vi.fn().mockReturnValue('base64'),
    startAudioCapture: vi.fn(),
    stopCapture: vi.fn(),
  }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('WebSocket', vi.fn(() => ({
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  });

  it('renders EduLens heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /edu\s*lens/i })).toBeInTheDocument();
  });

  it('renders tagline', () => {
    render(<App />);
    expect(screen.getByText(/tutor that sees your homework/i)).toBeInTheDocument();
  });

  it('renders Camera on paper option', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /camera on paper/i })).toBeInTheDocument();
  });

  it('renders Share screen option', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /share screen/i })).toBeInTheDocument();
  });

  it('renders Powered by Gemini Live API in footer', () => {
    render(<App />);
    expect(screen.getByText(/powered by gemini live api/i)).toBeInTheDocument();
  });

  it('transitions state when Camera on paper is clicked', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('WebSocket', vi.fn(function () {
      const ws = {
        readyState: 1,
        send: vi.fn(),
        close: vi.fn(),
        addEventListener: vi.fn(),
        _onopen: null,
      };
      Object.defineProperty(ws, 'onopen', {
        set: (fn) => {
          ws._onopen = fn;
          queueMicrotask(() => fn?.());
        },
        configurable: true,
      });
      return ws;
    }));

    render(<App />);
    await user.click(screen.getByRole('button', { name: /camera on paper/i }));

    await waitFor(() => {
      expect(screen.getByText(/connecting|live|edulens is watching|connecting to your tutor/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
