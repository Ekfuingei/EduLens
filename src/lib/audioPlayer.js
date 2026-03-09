/**
 * EduLens - Audio playback for tutor voice (24kHz PCM from Gemini)
 * Mobile: AudioContext + HTML5 Audio unlock for iOS mute switch; mic input, output to speaker/headphones.
 */

const OUTPUT_SAMPLE_RATE = 24000;

/** Minimal silent WAV (≈100ms) for iOS HTML5 unlock - bypasses mute switch for Web Audio */
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

  const init = async () => {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    // Web Audio unlock: play tiny silent buffer (mobile)
    try {
      const buf = audioContext.createBuffer(1, 1, OUTPUT_SAMPLE_RATE);
      buf.getChannelData(0)[0] = 0;
      const src = audioContext.createBufferSource();
      src.buffer = buf;
      src.connect(audioContext.destination);
      src.start(0);
    } catch (_) {}
    // iOS unlock: HTML5 Audio also plays during gesture so Web Audio works with mute on
    try {
      const el = new Audio(createSilentWavDataUrl());
      el.volume = 0.01;
      await el.play();
    } catch (_) {}
    return audioContext;
  };

  const playPcmChunk = async (base64Pcm) => {
    if (!base64Pcm) return;
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
      console.warn('EduLens audio play failed:', e);
    }
  };

  const stop = () => {
    nextStartTime = 0;
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
  };

  return { playPcmChunk, stop, init };
}
