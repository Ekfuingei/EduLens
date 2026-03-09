/**
 * EduLens - Media capture for camera, screen share, and microphone
 * Captures: video at 1 FPS (JPEG), audio at 16kHz 16-bit PCM mono
 */

import React from 'react';

const TARGET_VIDEO_FPS = 1;
const TARGET_AUDIO_SAMPLE_RATE = 16000;

export function useMediaCapture() {
  const streamRef = React.useRef(null);
  const audioContextRef = React.useRef(null);
  const processorRef = React.useRef(null);
  const sourceRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const videoRef = React.useRef(null);

  const startCamera = React.useCallback(async (facingMode = 'environment') => {
    try {
      const constraints = {
        video: {
          facingMode: facingMode === 'environment' ? 'environment' : 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          sampleRate: TARGET_AUDIO_SAMPLE_RATE,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current = document.createElement('video');
      videoRef.current.srcObject = stream;
      videoRef.current.playsInline = true;
      videoRef.current.muted = true; // Required for iOS autoplay; we capture audio separately
      await videoRef.current.play();
      canvasRef.current = document.createElement('canvas');
      return { stream };
    } catch (err) {
      // Fallback to user (front) camera if environment unavailable (e.g. desktop)
      if (facingMode === 'environment') {
        return startCamera('user');
      }
      throw err;
    }
  }, []);

  const startScreenShare = React.useCallback(async () => {
    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1280, height: 720, frameRate: { max: 5 } },
      audio: false,
    });
    const micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: TARGET_AUDIO_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    const stream = new MediaStream();
    displayStream.getVideoTracks().forEach((t) => stream.addTrack(t));
    micStream.getAudioTracks().forEach((t) => stream.addTrack(t));
    streamRef.current = stream;
    videoRef.current = document.createElement('video');
    videoRef.current.srcObject = stream;
    videoRef.current.playsInline = true;
    videoRef.current.muted = true;
    await videoRef.current.play();
    canvasRef.current = document.createElement('canvas');
    return { stream };
  }, []);

  const captureVideoFrame = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    const w = Math.min(video.videoWidth, 640);
    const h = Math.min(video.videoHeight, 480);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64 = dataUrl.split(',')[1];
    return base64;
  }, []);

  const startAudioCapture = React.useCallback(
    async (stream, onPcmChunk) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: TARGET_AUDIO_SAMPLE_RATE,
      });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;

      try {
        const workletCode = `
          class PcmProcessor extends AudioWorkletProcessor {
            process(inputs) {
              const input = inputs[0]?.[0];
              if (input) {
                const pcm16 = new Int16Array(input.length);
                for (let i = 0; i < input.length; i++) {
                  const s = Math.max(-1, Math.min(1, input[i]));
                  pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
                }
                this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
              }
              return true;
            }
          }
          registerProcessor('pcm-processor', PcmProcessor);
        `;
        const blob = new Blob([workletCode], { type: 'application/javascript' });
        await audioContext.audioWorklet.addModule(URL.createObjectURL(blob));

        const processor = new AudioWorkletNode(audioContext, 'pcm-processor', { numberOfInputs: 1, numberOfOutputs: 1 });
        processorRef.current = processor;
        processor.port.onmessage = (e) => {
          const base64 = btoa(String.fromCharCode.apply(null, new Uint8Array(e.data)));
          onPcmChunk(base64);
        };

        const silence = audioContext.createGain();
        silence.gain.value = 0;
        source.connect(processor);
        processor.connect(silence);
        silence.connect(audioContext.destination);
      } catch (err) {
        const bufferSize = 4096;
        const processor = audioContext.createScriptProcessor(bufferSize, 1, 1);
        processorRef.current = processor;
        processor.onaudioprocess = (e) => {
          const input = e.inputBuffer.getChannelData(0);
          const pcm16 = new Int16Array(input.length);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }
          onPcmChunk(btoa(String.fromCharCode.apply(null, new Uint8Array(pcm16.buffer))));
        };
        const silence = audioContext.createGain();
        silence.gain.value = 0;
        source.connect(processor);
        processor.connect(silence);
        silence.connect(audioContext.destination);
      }
    },
    []
  );

  const stopCapture = React.useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    videoRef.current = null;
    canvasRef.current = null;
  }, []);

  return {
    startCamera,
    startScreenShare,
    captureVideoFrame,
    startAudioCapture,
    stopCapture,
  };
}
