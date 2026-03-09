/**
 * EduLens - Audio playback for tutor voice (24kHz PCM from Gemini)
 * Uses HTML5 Audio (WAV) on mobile to bypass iOS mute switch; Web Audio on desktop.
 */

const OUTPUT_SAMPLE_RATE = 24000;
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');

/** Create WAV blob from PCM base64 - works with mute switch on iOS */
function pcmToWavBlob(base64Pcm, sampleRate = OUTPUT_SAMPLE_RATE) {
  const binary = atob(base64Pcm);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const dataLen = bytes.length;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);
  new Uint8Array(buffer, 44).set(bytes);
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Minimal silent WAV for unlock */
function createSilentWavDataUrl() {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * 0.1);
  const dataLen = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataLen);
  const view = new DataView(buffer);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataLen, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataLen, true);
  const b64 = btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)));
  return `data:audio/wav;base64,${b64}`;
}

export function createAudioPlayer() {
  let audioContext = null;
  let nextStartTime = 0;
  let html5Queue = [];
  let html5Playing = false;
  let useHtml5 = isMobile; // Prefer HTML5 on mobile (bypasses mute)

  const playNextHtml5 = () => {
    if (html5Queue.length === 0) {
      html5Playing = false;
      return;
    }
    const { blob, resolve } = html5Queue.shift();
    const audio = new Audio();
    audio.volume = 1;
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      resolve();
      playNextHtml5();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve();
      playNextHtml5();
    };
    audio.src = URL.createObjectURL(blob);
    audio.play().catch(() => playNextHtml5());
  };

  const playViaHtml5 = (base64Pcm) => {
    if (!base64Pcm) return Promise.resolve();
    const blob = pcmToWavBlob(base64Pcm);
    return new Promise((resolve) => {
      html5Queue.push({ blob, resolve });
      if (!html5Playing) {
        html5Playing = true;
        playNextHtml5();
      }
    });
  };

  const init = async () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
    }
    if (audioContext.state === 'suspended') await audioContext.resume();
    try {
      const buf = audioContext.createBuffer(1, 1, OUTPUT_SAMPLE_RATE);
      buf.getChannelData(0)[0] = 0;
      const src = audioContext.createBufferSource();
      src.buffer = buf;
      src.connect(audioContext.destination);
      src.start(0);
    } catch (_) {}
    try {
      const el = new Audio(createSilentWavDataUrl());
      el.volume = 0.01;
      await el.play();
    } catch (_) {}
    return audioContext;
  };

  const playPcmChunk = async (base64Pcm) => {
    if (!base64Pcm) return;
    if (useHtml5) {
      try {
        await playViaHtml5(base64Pcm);
      } catch (e) {
        console.warn('EduLens HTML5 audio failed:', e);
        useHtml5 = false;
      }
      return;
    }
    try {
      let ctx = await init();
      if (!ctx) return;
      if (ctx.state === 'suspended') await ctx.resume();
      const binary = atob(base64Pcm);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const samples = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) float32[i] = samples[i] / 32768;
      const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
      buffer.copyToChannel(float32, 0);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      const now = ctx.currentTime;
      if (nextStartTime < now) nextStartTime = now;
      source.start(nextStartTime);
      nextStartTime += buffer.duration;
    } catch (e) {
      console.warn('EduLens Web Audio failed, switching to HTML5:', e);
      useHtml5 = true;
      await playViaHtml5(base64Pcm);
    }
  };

  const playTestSound = async () => {
    try {
      if (isMobile) {
        const sr = 24000;
        const duration = 0.1;
        const numSamples = Math.floor(sr * duration);
        const pcm = new Int16Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
          pcm[i] = Math.floor(2000 * Math.sin(2 * Math.PI * 440 * i / sr));
        }
        const b64 = btoa(String.fromCharCode.apply(null, new Uint8Array(pcm.buffer)));
        await playViaHtml5(b64);
      } else {
        const ctx = await init();
        if (!ctx) return;
        const duration = 0.1;
        const samples = ctx.sampleRate * duration;
        const buf = ctx.createBuffer(1, samples, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < samples; i++) {
          data[i] = 0.1 * Math.sin(2 * Math.PI * 440 * i / ctx.sampleRate);
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      }
    } catch (_) {}
  };

  const stop = () => {
    nextStartTime = 0;
    html5Queue = [];
    html5Playing = false;
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  return { playPcmChunk, playTestSound, stop, init };
}
