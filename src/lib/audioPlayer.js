/**
 * EduLens - Audio playback for tutor voice (24kHz PCM from Gemini)
 */

const OUTPUT_SAMPLE_RATE = 24000;

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
    return audioContext;
  };

  const playPcmChunk = async (base64Pcm) => {
    const ctx = await init();
    const binary = atob(base64Pcm);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const samples = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      float32[i] = samples[i] / 32768;
    }
    const buffer = ctx.createBuffer(1, float32.length, OUTPUT_SAMPLE_RATE);
    buffer.copyToChannel(float32, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    const now = ctx.currentTime;
    if (nextStartTime < now) nextStartTime = now;
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
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
