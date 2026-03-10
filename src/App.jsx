import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMediaCapture } from './hooks/useMediaCapture';
import {
  createSetupMessage,
  createAudioInput,
  createImageInput,
  createProblemTrigger,
  createTextMessage,
} from './lib/liveApiClient';
import { createAudioPlayer } from './lib/audioPlayer';

const WS_URL =
  import.meta.env.VITE_WS_URL ||
  `${window.location.origin.replace(/^http/, 'ws')}/ws`;
if (typeof window !== 'undefined') {
  window.__EDULENS_WS_URL__ = WS_URL;
}

const SESSION_TIPS = [
  'Talk naturally—ask questions, say you\'re confused, or request examples.',
  'Say "next step" when you\'re ready for the next one.',
  'Say "repeat" to hear the last step again.',
  'Say "I\'m stuck" if you need more help.',
  'Use your device speakers. Headphones optional if you prefer.',
];

const canShareScreen =
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices?.getDisplayMedia instanceof Function;

export default function App() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [mode, setMode] = useState(null);
  const [typedText, setTypedText] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [sentFeedback, setSentFeedback] = useState(null);
  const [lastResponseText, setLastResponseText] = useState(null);

  const wsRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [debugLog, setDebugLog] = useState([]);
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

  useEffect(() => {
    if (status !== 'capturing' || !previewVideoRef.current || !streamRef.current) return;
    const video = previewVideoRef.current;
    video.srcObject = streamRef.current;
    video.muted = true;
    video.play().catch(() => {});
    return () => { video.srcObject = null; };
  }, [status]);

  useEffect(() => {
    if (status !== 'connected') return;
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % SESSION_TIPS.length);
    }, 6000);
    return () => clearInterval(id);
  }, [status]);

  const connectAndExplain = useCallback(
    async (submitMode, imageBase64, text) => {
      userClosedRef.current = false;
      serverErrorRef.current = false;
      setStatus('connecting');
      setError(null);

      const debugAudio = typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search);

      try {
        audioPlayerRef.current = createAudioPlayer();
        try {
          await audioPlayerRef.current.init();
        } catch (audioErr) {
          setError('Audio couldn\'t start. Turn off silent mode and tap again.');
          setStatus('idle');
          setMode(null);
          setCapturedImage(null);
          return;
        }

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (debugAudio) console.log('[EduLens] WebSocket open, sending setup');
          ws.send(createSetupMessage());
          setStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (debugAudio) {
              const keys = Object.keys(msg);
              let summary = '';
              if (msg.setupComplete || msg.setup_complete) {
                summary = 'setupComplete';
                console.log('[EduLens] setupComplete received');
              } else if (msg.type === 'error') {
                summary = `error: ${msg.message || '?'}`;
              } else if (msg.serverContent || msg.server_content) {
                const sc = msg.serverContent || msg.server_content;
                const mt = sc.modelTurn || sc.model_turn;
                const parts = mt?.parts || [];
                const hasAudio = parts.some((p) => (p.inlineData?.data || p.inline_data?.data) && ((p.inlineData?.mimeType || p.inline_data?.mime_type || '').startsWith('audio') || !(p.inlineData?.mimeType || p.inline_data?.mime_type)));
                const hasText = parts.some((p) => p.text);
                summary = `serverContent: ${parts.length} parts${hasAudio ? ' AUDIO' : ''}${hasText ? ' TEXT' : ''}`;
                console.log('[EduLens] serverContent:', keys, 'parts:', parts.length, hasAudio ? 'AUDIO' : '', hasText ? 'TEXT' : '', parts.map((p) => Object.keys(p)));
              } else {
                summary = keys.length ? `msg: ${keys.join(', ')}` : 'msg: (empty)';
                console.log('[EduLens] msg:', keys);
              }
              if (summary) {
                setDebugLog((prev) => [...prev.slice(-7), summary]);
              }
            }
            if (msg.type === 'error') {
              serverErrorRef.current = true;
              setError(msg.message || 'Connection error');
              setStatus('error');
              return;
            }
            if (msg.setupComplete || msg.setup_complete) {
              audioPlayerRef.current?.playTestSound?.();

              const sendTrigger = () => {
                const trigger = createProblemTrigger(submitMode, imageBase64, text);
              if (debugAudio) {
                const t = JSON.parse(trigger);
                console.log('[EduLens] Sending problem trigger, turnComplete:', t.clientContent?.turnComplete, 'parts:', t.clientContent?.turns?.[0]?.parts?.length);
                setDebugLog((prev) => [...prev.slice(-7), 'Sent: problem trigger']);
              }
                ws.send(trigger);
              };

              if (!isMuted) {
                navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
                  .then((micStream) => {
                    if (debugAudio) console.log('[EduLens] Mic granted, starting audio capture');
                    streamRef.current = micStream;
                    let micChunkCount = 0;
                    return startAudioCapture(micStream, (base64) => {
                      if (ws.readyState === 1) {
                        ws.send(createAudioInput(base64));
                        if (debugAudio && ++micChunkCount % 50 === 0) console.log('[EduLens] Mic sent', micChunkCount, 'chunks');
                      }
                    });
                  })
                  .then(() => {
                    if (debugAudio) console.log('[EduLens] Audio capture started');
                    sendTrigger();
                  })
                  .catch((err) => {
                    console.warn('[EduLens] Mic failed:', err?.message || err);
                    if (debugAudio) console.log('[EduLens] getUserMedia error:', err);
                    sendTrigger();
                  });
              } else {
                setTimeout(sendTrigger, 800);
              }
              return;
            }
            const audioChunks = [];
            const textParts = [];
            const parts = msg.serverContent?.modelTurn?.parts || msg.server_content?.model_turn?.parts || [];
            for (const part of parts) {
              if (part.text) textParts.push(part.text);
              const inline = part.inlineData ?? part.inline_data;
              const data = inline?.data;
              const mime = (inline?.mimeType ?? inline?.mime_type ?? '').toLowerCase();
              if (data && (mime.startsWith('audio/pcm') || !mime)) {
                audioChunks.push(data);
              }
            }
            const outputTranscription = msg.serverContent?.outputTranscription ?? msg.server_content?.output_transcription;
            const transcriptText = outputTranscription?.text ?? outputTranscription?.transcript;
            if (textParts.length > 0) {
              setLastResponseText(textParts.join(' ').trim());
            } else if (transcriptText?.trim()) {
              setLastResponseText((prev) => (prev ? `${prev} ${transcriptText.trim()}` : transcriptText.trim()));
            }
            const rtParts = (msg.realtimeOutput ?? msg.realtime_output)?.mediaChunks ?? (msg.realtimeOutput ?? msg.realtime_output)?.media_chunks ?? [];
            for (const p of rtParts) {
              const rtMime = (p.mimeType ?? p.mime_type ?? '').toLowerCase();
              if (rtMime.startsWith('audio/pcm') && p.data) audioChunks.push(p.data);
            }
            if (debugAudio && audioChunks.length > 0) {
              console.log('[EduLens] Playing', audioChunks.length, 'audio chunk(s)');
            }
            for (const data of audioChunks) {
              audioPlayerRef.current?.playPcmChunk(data).catch((e) => console.warn('Audio play failed:', e));
            }
          } catch (_) {}
        };

        ws.onerror = () => {
          if (debugAudio) console.log('[EduLens] WebSocket error');
          setError('Connection error. Check your API key and network.');
          setStatus('error');
        };

        ws.onclose = (event) => {
          if (debugAudio) console.log('[EduLens] WebSocket closed:', event.code, event.reason);
          if (!userClosedRef.current && !serverErrorRef.current) {
            const reason = event.reason || '';
            const code = event.code;
            const friendly = reason || (code === 1011 ? 'Session ended. Try again for a new session.' : code === 1008 ? 'Connection rejected. Check your setup.' : 'Connection interrupted. Try again.');
            setError(friendly);
            setStatus('error');
          }
          stopAll(false);
        };
      } catch (err) {
        setError(err.message || 'Failed to connect.');
        setStatus('error');
      }
    },
    [startAudioCapture, stopCapture, isMuted]
  );

  const startCapture = useCallback(async (captureMode) => {
    setError(null);
    setMode(captureMode);
    setCapturedImage(null);
    try {
      const { stream } = captureMode === 'screen' ? await startScreenShare() : await startCamera();
      streamRef.current = stream;
      setStatus('capturing');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('getDisplayMedia') || msg.includes('not a function')) {
        setError('Screen share isn\'t supported here. Use Snap or Type instead.');
      } else {
        setError(msg || 'Allow camera access.');
      }
    }
  }, [startCamera, startScreenShare]);

  const captureAndSubmit = useCallback(() => {
    const frame = captureVideoFrame();
    if (!frame) {
      setError('Couldn\'t capture. Try again.');
      return;
    }
    stopCapture();
    streamRef.current = null;
    setCapturedImage(frame);
    connectAndExplain(mode, frame, null);
  }, [mode, captureVideoFrame, stopCapture, connectAndExplain]);

  const submitTyped = useCallback(() => {
    const text = typedText.trim();
    if (!text) {
      setError('Please type your question.');
      return;
    }
    setStatus('connecting');
    connectAndExplain('type', null, text);
    setTypedText('');
    setMode(null);
  }, [typedText, connectAndExplain]);

  const sendToTutor = useCallback((text) => {
    const ws = wsRef.current;
    const debug = typeof window !== 'undefined' && /[?&]debug=1/.test(window.location.search);
    if (!ws) {
      setError('Not connected. End session and try again.');
      return;
    }
    if (ws.readyState !== 1) {
      setError('Connection lost. End session and try again.');
      return;
    }
    try {
      ws.send(createTextMessage(text));
      if (debug) {
        console.log('[EduLens] Sent:', text);
        setDebugLog((prev) => [...prev.slice(-7), `Sent: "${text}"`]);
      }
      setSentFeedback(text);
      setTimeout(() => setSentFeedback(null), 2500);
    } catch (err) {
      setError('Failed to send. Try again.');
      if (debug) console.warn('[EduLens] Send failed:', err);
    }
  }, []);

  const stopAll = useCallback((returnToIdle = true) => {
    userClosedRef.current = returnToIdle;
    audioPlayerRef.current?.stop();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopCapture();
    if (previewVideoRef.current) previewVideoRef.current.srcObject = null;
    streamRef.current = null;
    setMode(null);
    setCapturedImage(null);
    setLastResponseText(null);
    setSentFeedback(null);
    setDebugLog([]);
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
        <p className="tagline">Snap, share, or type your problem — EduLens explains step-by-step.</p>
      </header>

      <main className="main">
        {status === 'idle' && (
          <div className="start-options">
            <p className="hint">
              How would you like to show your problem?
            </p>
            <div className="option-cards">
              <button
                type="button"
                className="option-card option-camera"
                onClick={() => startCapture('snap')}
              >
                <span className="option-icon">📸</span>
                <div className="option-content">
                  <p className="option-title">Snap a photo</p>
                  <p className="option-desc">Handwriting, worksheets, notes</p>
                </div>
              </button>
              {canShareScreen ? (
                <button
                  type="button"
                  className="option-card option-screen"
                  onClick={() => startCapture('screen')}
                >
                  <span className="option-icon">💻</span>
                  <div className="option-content">
                    <p className="option-title">Share screen</p>
                    <p className="option-desc">Coding, docs, work in another app</p>
                  </div>
                </button>
              ) : (
                <div className="option-card option-screen option-disabled" title="Screen share on laptop/desktop">
                  <span className="option-icon">💻</span>
                  <div className="option-content">
                    <p className="option-title">Share screen</p>
                    <p className="option-desc">Use laptop or desktop</p>
                  </div>
                </div>
              )}
              <button
                type="button"
                className="option-card option-type"
                data-testid="option-type"
                onClick={() => { setMode('type'); setStatus('typing'); setError(null); }}
              >
                <span className="option-icon">✏️</span>
                <div className="option-content">
                  <p className="option-title">Type it</p>
                  <p className="option-desc">Paste or type your question</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {status === 'typing' && (
          <div className="type-wrap" data-testid="type-wrap">
            <textarea
              className="type-input"
              placeholder="Type or paste your question here..."
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              rows={5}
              autoFocus
            />
            <div className="type-actions">
              <button type="button" className="btn-secondary" onClick={() => { setStatus('idle'); setMode(null); setTypedText(''); }}>
                Back
              </button>
              <button type="button" className="btn-primary" onClick={submitTyped} disabled={!typedText.trim()}>
                Get help
              </button>
            </div>
          </div>
        )}

        {status === 'capturing' && (
          <div className="capture-wrap">
            <div className="preview-wrap">
              <video
                ref={previewVideoRef}
                className="preview-video"
                playsInline
                muted
                autoPlay
              />
            </div>
            <p className="capture-hint">Point at your work, then tap Use this</p>
            <div className="capture-actions">
              <button type="button" className="btn-secondary" onClick={() => { stopCapture(); streamRef.current = null; setStatus('idle'); setMode(null); }}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={captureAndSubmit}>
                Use this
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
          </div>
        )}

        {status === 'connected' && (
          <div className="session">
            <div className="session-hero">
              <span className="live-badge">Live</span>
              <p>EduLens is here. Say it or tap the buttons below when ready.</p>
              {window.location.search.includes('debug=1') && (
                <div className="debug-panel">
                  <p className="debug-hint">Debug — last messages from Gemini:</p>
                  {debugLog.length === 0 ? (
                    <p className="debug-empty">No messages yet. Submit a problem and tap Next step.</p>
                  ) : (
                    <ul className="debug-log">
                      {debugLog.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="session-tips">
              <p>{SESSION_TIPS[tipIndex]}</p>
            </div>
            <div className="session-quick-actions">
              <button type="button" className="btn-quick" onClick={() => sendToTutor('next step')}>
                Next step
              </button>
              <button type="button" className="btn-quick" onClick={() => sendToTutor('repeat')}>
                Repeat
              </button>
              <button type="button" className="btn-quick" onClick={() => sendToTutor('I\'m stuck')}>
                I'm stuck
              </button>
            </div>
            {sentFeedback && (
              <p className="sent-feedback">Sent &quot;{sentFeedback}&quot; — waiting for EduLens…</p>
            )}
            {lastResponseText && (
              <div className="edulens-response">
                <p className="edulens-response-label">EduLens says:</p>
                <p className="edulens-response-text">{lastResponseText}</p>
              </div>
            )}
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
              onClick={() => { setError(null); setStatus('idle'); setMode(null); setCapturedImage(null); }}
            >
              Try again
            </button>
          </div>
        )}
      </main>

      <footer className="footer">
        <img src="/logo.png" alt="" className="footer-logo" aria-hidden />
        <p>Powered by Gemini Live API · No response? Add <strong>?debug=1</strong> to the URL to see what&apos;s happening</p>
      </footer>
    </div>
  );
}
