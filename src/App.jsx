import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaCapture } from './hooks/useMediaCapture';
import {
  createSetupMessage,
  createAudioInput,
  createImageInput,
  createGreetingTrigger,
} from './lib/liveApiClient';
import { createAudioPlayer } from './lib/audioPlayer';

// When frontend is on Vercel, point to Cloud Run backend. Otherwise same-origin.
const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.origin.replace(/^http/, 'ws')}/ws`;
// Debug: open DevTools Console, click Camera/Screen — you'll see which URL is used
if (typeof window !== 'undefined') {
  window.__EDULENS_WS_URL__ = WS_URL;
}

const SESSION_TIPS = [
  'Say "I need help with this problem" to get started.',
  'Interrupt anytime — try "wait, go back" or "can you explain that again?"',
  'Point your camera at your work so EduLens can see what you\'re doing.',
  'Ask questions! EduLens will guide you, not give away answers.',
];

export default function App() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const wsRef = useRef(null);
  const videoFrameIntervalRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const userClosedRef = useRef(false);

  const {
    startCamera,
    startScreenShare,
    captureVideoFrame,
    startAudioCapture,
    stopCapture,
  } = useMediaCapture();

  // Rotate tips every 6 seconds when connected
  useEffect(() => {
    if (status !== 'connected') return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % SESSION_TIPS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [status]);

  const connectAndStart = useCallback(
    async (captureMode) => {
      userClosedRef.current = false;
      setStatus('connecting');
      setError(null);
      setMode(captureMode);

      try {
        const { stream } =
          captureMode === 'screen'
            ? await startScreenShare()
            : await startCamera();

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
          previewVideoRef.current.muted = true;
          previewVideoRef.current.play().catch(() => {});
        }

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(createSetupMessage());
          setStatus('connected');

          audioPlayerRef.current = createAudioPlayer();
          audioPlayerRef.current.init();

          if (!isMuted) {
            startAudioCapture(stream, (base64) => {
              if (ws.readyState === 1) {
                ws.send(createAudioInput(base64));
              }
            });
          }

          videoFrameIntervalRef.current = setInterval(() => {
            const frame = captureVideoFrame();
            if (frame && ws.readyState === 1) {
              ws.send(createImageInput(frame));
            }
          }, 1000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'error') {
              setError(msg.message || 'Connection error');
              setStatus('error');
              return;
            }
            if (msg.setupComplete || msg.setup_complete) {
              ws.send(createGreetingTrigger());
              return;
            }
            const turn = msg.serverContent?.modelTurn ?? msg.server_content?.model_turn;
            const parts = turn?.parts;
            if (parts) {
              for (const part of parts) {
                const data = part.inlineData?.data ?? part.inline_data?.data;
                if (data) {
                  audioPlayerRef.current?.playPcmChunk(data);
                }
              }
            }
          } catch (_) {}
        };

        ws.onerror = () => {
          setError('Connection error. Check your API key and network.');
          setStatus('error');
        };

        ws.onclose = () => {
          if (!userClosedRef.current) {
            setError(
              'Connection closed. Ensure GEMINI_API_KEY is set in Cloud Run and try again.'
            );
            setStatus('error');
          }
          stopAll(false);
        };
      } catch (err) {
        setError(err.message || 'Failed to start. Allow camera/microphone access.');
        setStatus('error');
        stopCapture();
      }
    },
    [
      startCamera,
      startScreenShare,
      startAudioCapture,
      captureVideoFrame,
      stopCapture,
      isMuted,
    ]
  );

  const stopAll = useCallback((returnToIdle = true) => {
    userClosedRef.current = returnToIdle;
    if (videoFrameIntervalRef.current) {
      clearInterval(videoFrameIntervalRef.current);
      videoFrameIntervalRef.current = null;
    }
    audioPlayerRef.current?.stop();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopCapture();
    if (previewVideoRef.current) {
      previewVideoRef.current.srcObject = null;
    }
    setMode(null);
    if (returnToIdle) setStatus('idle');
  }, [stopCapture]);

  useEffect(() => () => stopAll(), [stopAll]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          <img src="/logo.png" alt="EduLens" className="header-logo" />
          <h1><span className="brand-edu">Edu</span><span className="brand-lens">Lens</span></h1>
        </div>
        <p className="tagline">A tutor that sees your homework and never loses patience.</p>
      </header>

      <main className="main">
        {status === 'idle' && (
          <div className="start-options">
            <p className="hint">
              Point your camera at your paper, or share your screen for digital work.
            </p>
            <div className="option-cards">
              <button
                type="button"
                className="option-card option-camera"
                onClick={() => connectAndStart('camera')}
              >
                <span className="option-icon">📱</span>
                <div className="option-content">
                  <p className="option-title">Camera on paper</p>
                  <p className="option-desc">Best for handwriting, notes, worksheets</p>
                </div>
              </button>
              <button
                type="button"
                className="option-card option-screen"
                onClick={() => connectAndStart('screen')}
              >
                <span className="option-icon">💻</span>
                <div className="option-content">
                  <p className="option-title">Share screen</p>
                  <p className="option-desc">For coding, docs, research, any digital work</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {status === 'connecting' && (
          <div className="connecting-wrap">
            <div className="connecting-loader">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="connecting-bar" />
              ))}
            </div>
            <p className="connecting-text">Connecting to your tutor…</p>
            <p className="connecting-hint">This usually takes a few seconds</p>
          </div>
        )}

        {status === 'connected' && (
          <div className="session">
            <div className="preview-wrap">
              <video
                ref={previewVideoRef}
                className="preview-video"
                playsInline
                muted
              />
              <div className="preview-overlay">
                <span className="live-badge">Live</span>
                <p>EduLens is watching. Just talk naturally.</p>
              </div>
            </div>
            <div className="session-tips">
              <p>{SESSION_TIPS[tipIndex]}</p>
            </div>
            <button type="button" className="btn-stop" onClick={stopAll}>
              End session
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <p>{error}</p>
            <button
              type="button"
              className="btn-retry"
              onClick={() => {
                setError(null);
                setStatus('idle');
              }}
            >
              Try again
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <img src="/logo.png" alt="" className="footer-logo" aria-hidden />
        <p>Powered by Gemini Live API · Interrupt anytime — say &quot;wait, go back&quot;</p>
      </footer>
    </div>
  );
}
