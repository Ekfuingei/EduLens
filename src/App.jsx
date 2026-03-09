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

const SESSION_TIPS_CAMERA = [
  'EduLens will guide you by voice — just talk naturally.',
  'Say "wait" or "go back" anytime to interrupt.',
  'Keep your work in view so EduLens can see it.',
  'Use headphones for the best voice experience.',
];

const SESSION_TIPS_SCREEN = [
  'EduLens will guide you by voice — just talk naturally.',
  'Say "wait" or "go back" anytime to interrupt.',
  'EduLens can see your screen.',
  'Use headphones for the best voice experience.',
];

// Screen share: use getDisplayMedia when available
const canShareScreen =
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices?.getDisplayMedia instanceof Function;

export default function App() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const wsRef = useRef(null);
  const videoFrameIntervalRef = useRef(null);
  const videoFrameTimeoutRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const previewVideoRef = useRef(null);
  const streamRef = useRef(null);
  const userClosedRef = useRef(false);
  const serverErrorRef = useRef(false);

  const {
    startCamera,
    startScreenShare,
    captureVideoFrame,
    startAudioCapture,
    stopCapture,
  } = useMediaCapture();

  // Attach stream to preview when connected (video mounts only then)
  useEffect(() => {
    if (status !== 'connected' || !previewVideoRef.current || !streamRef.current) return;
    const video = previewVideoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true;
    video.play().catch(() => {});
    return () => {
      video.srcObject = null;
    };
  }, [status]);

  // Rotate tips every 6 seconds when connected (mode-aware)
  const sessionTips = mode === 'screen' ? SESSION_TIPS_SCREEN : SESSION_TIPS_CAMERA;
  useEffect(() => {
    if (status !== 'connected') return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % sessionTips.length);
    }, 6000);
    return () => clearInterval(id);
  }, [status, mode, sessionTips.length]);

  const connectAndStart = useCallback(
    async (captureMode) => {
      userClosedRef.current = false;
      serverErrorRef.current = false;
      setStatus('connecting');
      setError(null);
      setMode(captureMode);

      try {
        // Unlock AudioContext on user gesture (required for mobile/Safari)
        audioPlayerRef.current = createAudioPlayer();
        try {
          await audioPlayerRef.current.init();
        } catch (audioErr) {
          setError('Audio couldn\'t start. Turn off silent mode, tap again, or use headphones.');
          setStatus('error');
          return;
        }

        const { stream } =
          captureMode === 'screen'
            ? await startScreenShare()
            : await startCamera();
        streamRef.current = stream;

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          ws.send(createSetupMessage());
          setStatus('connected');

          if (!isMuted) {
            startAudioCapture(stream, (base64) => {
              if (ws.readyState === 1) {
                ws.send(createAudioInput(base64));
              }
            });
          }

          // Delay first frame so phone camera has time to produce video (readyState)
          videoFrameTimeoutRef.current = setTimeout(() => {
            videoFrameIntervalRef.current = setInterval(() => {
              const frame = captureVideoFrame();
              if (frame && ws.readyState === 1) {
                ws.send(createImageInput(frame));
              }
            }, 1000);
          }, 1500);
        };

        const debugAudio = typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search);
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (debugAudio && !msg.setupComplete && !msg.setup_complete) {
              console.log('[EduLens]', msg?.serverContent ? 'serverContent' : msg?.server_content ? 'server_content' : 'msg', Object.keys(msg));
            }
            if (msg.type === 'error') {
              serverErrorRef.current = true;
              setError(msg.message || 'Connection error');
              setStatus('error');
              return;
            }
            if (msg.setupComplete || msg.setup_complete) {
              audioPlayerRef.current?.playTestSound?.();
              ws.send(createGreetingTrigger(captureMode));
              return;
            }
            // Collect all audio data from various Gemini response formats
            const audioChunks = [];
            const turn = msg.serverContent?.modelTurn ?? msg.server_content?.model_turn;
            const parts = turn?.parts ?? turn?.Parts ?? [];
            for (const part of parts) {
              const data = part.inlineData?.data ?? part.inline_data?.data;
              const mime = (part.inlineData?.mimeType ?? part.inline_data?.mime_type ?? '').toLowerCase();
              if (data && (mime.includes('audio') || mime.includes('pcm') || !mime)) {
                audioChunks.push(data);
              }
            }
            const realtime = msg.realtimeOutput ?? msg.realtime_output;
            const rtParts = realtime?.mediaChunks ?? realtime?.media_chunks ?? [];
            for (const p of rtParts) {
              const mime = (p.mimeType ?? p.mime_type ?? '').toLowerCase();
              if ((mime.includes('pcm') || mime.includes('audio')) && p.data) {
                audioChunks.push(p.data);
              }
            }
            for (const data of audioChunks) {
              audioPlayerRef.current?.playPcmChunk(data).catch((e) =>
                console.warn('EduLens audio play failed:', e)
              );
            }
          } catch (_) {}
        };

        ws.onerror = () => {
          setError('Connection error. Check your API key and network.');
          setStatus('error');
        };

        ws.onclose = () => {
          if (!userClosedRef.current && !serverErrorRef.current) {
            setError(
              'Connection interrupted. The tutor may be temporarily unavailable—try again in a moment.'
            );
            setStatus('error');
          }
          stopAll(false);
        };
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('getDisplayMedia') || msg.includes('not a function')) {
          setError('Screen share isn\'t supported on phones. Use "Camera on paper" instead—it works great for notebooks and worksheets!');
        } else {
          setError(msg || 'Failed to start. Allow camera/microphone access.');
        }
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
    if (videoFrameTimeoutRef.current) {
      clearTimeout(videoFrameTimeoutRef.current);
      videoFrameTimeoutRef.current = null;
    }
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
    streamRef.current = null;
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
              {canShareScreen ? (
                <button
                  type="button"
                  className="option-card option-screen"
                  onClick={() => connectAndStart('screen')}
                >
                  <span className="option-icon">💻</span>
                  <div className="option-content">
                    <p className="option-title">Share screen</p>
                    <p className="option-desc">For coding, docs, research (laptop/desktop)</p>
                  </div>
                </button>
              ) : (
                <div className="option-card option-screen option-disabled" title="Screen share is available on laptop/desktop">
                  <span className="option-icon">💻</span>
                  <div className="option-content">
                    <p className="option-title">Share screen</p>
                    <p className="option-desc">Use a laptop or desktop—not available on phones</p>
                  </div>
                </div>
              )}
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
              <div className="preview-label">What EduLens sees — adjust camera to show your paper or screen</div>
              <video
                ref={previewVideoRef}
                className="preview-video"
                playsInline
                muted
                autoPlay
              />
              <div className="preview-overlay">
                <span className="live-badge">Live</span>
                <p>EduLens is watching. Just talk naturally.</p>
              </div>
            </div>
            <div className="session-tips">
              <p>{sessionTips[tipIndex]}</p>
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
