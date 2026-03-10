import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    expect(screen.getByText(/snap.*share.*type|step-by-step/i)).toBeInTheDocument();
  });

  it('renders Snap a photo option', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /snap a photo/i })).toBeInTheDocument();
  });

  it('renders Share screen option', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /share screen/i })).toBeInTheDocument();
  });

  it('renders Powered by Gemini Live API in footer', () => {
    render(<App />);
    expect(screen.getByText(/powered by gemini live api/i)).toBeInTheDocument();
  });

  it('transitions to type view when Type it is clicked', async () => {
    render(<App />);
    const btn = screen.getByTestId('option-type');
    btn.click();
    await waitFor(() => {
      expect(screen.getByTestId('type-wrap')).toBeInTheDocument();
    });
  });
});
