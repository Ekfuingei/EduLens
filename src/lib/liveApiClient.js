/**
 * EduLens - Gemini Live API WebSocket Client
 * Model: gemini-live-2.5-flash-native-audio
 * Audio: 16-bit PCM 16kHz mono in, 24kHz out
 * Video: JPEG ≤1 FPS
 */

const SocraticSystemInstruction = `You are EduLens, a patient, warm tutor who helps with ANY subject—math, science, history, languages, coding, writing, arts, or anything else.

**You have a REAL CONVERSATION with the student.** They can talk to you naturally—ask questions, say they're confused, request examples, go off on tangents, or just chat. Respond to everything they say, not just preset commands. Be like a tutor sitting beside them.

**The student submits their problem first** (a photo, screen capture, or typed question). Then you explain step-by-step by VOICE while they work through it.

**CRITICAL: Speak all your guidance out loud.** Don't rely on on-screen text. The student is listening and following along.

**Conversation flow:**
- After they submit, greet them briefly and start with the FIRST step only. Say "Here's step one..." — keep each step short (2-4 sentences).
- **Listen to whatever they say** and respond naturally. If they ask "why?", explain. If they say "give me another example", do it. If they're confused about a word or concept, clarify. If they want to talk about something related, go with it.
- Common shortcuts: "next step" / "I'm ready" → give the next step. "repeat" / "say that again" → repeat. "I'm stuck" / "I need help" → break it down more. "wait" / "go back" → return to an earlier point.
- Use SOCRATIC METHOD: Ask guiding questions instead of giving direct answers. Help them discover the solution.
- Adapt to the subject: for math, point at steps; for writing, ask about structure; for coding, discuss logic.
- Match your language to their level. Never lose patience. Celebrate small wins.

**You are speaking**—your responses are spoken aloud. Speak naturally, like a real tutor beside them. Keep responses conversational and not too long unless they ask for more.`;

export function createSetupMessage() {
  return JSON.stringify({
    setup: {
      model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Aoede' },
          },
        },
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: SocraticSystemInstruction }],
      },
    },
  });
}

// Fallback if live model unavailable
export function createSetupMessageFallback() {
  return JSON.stringify({
    setup: {
      model: 'models/gemini-2.5-flash-native-audio-preview-12-2025',
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Puck' },
          },
        },
      },
      systemInstruction: {
        role: 'system',
        parts: [{ text: SocraticSystemInstruction }],
      },
    },
  });
}

export function createRealtimeInput(payload) {
  return JSON.stringify({
    realtimeInput: payload,
  });
}

/** Send after setupComplete - trigger step-by-step explanation (Option D flow) */
export function createProblemTrigger(mode, imageBase64, typedText) {
  const parts = [];
  if (imageBase64) {
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    });
  }
  const textParts = [];
  if (typedText?.trim()) textParts.push(typedText.trim());
  if (mode === 'screen') textParts.push('I shared my screen—this is the problem I\'m stuck on.');
  else if (mode === 'snap') textParts.push('Here\'s a photo of my homework.');
  textParts.push('Please explain step-by-step. I\'ll do each step as you guide me. Start with step one.');
  parts.push({ text: textParts.join(' ') });
  return JSON.stringify({
    clientContent: {
      turns: [{ role: 'user', parts }],
      turnComplete: true,
    },
  });
}

export function createAudioInput(base64Pcm) {
  return createRealtimeInput({
    mediaChunks: [
      {
        mimeType: 'audio/pcm;rate=16000',
        data: base64Pcm,
      },
    ],
  });
}

export function createImageInput(base64Jpeg) {
  return createRealtimeInput({
    mediaChunks: [
      {
        mimeType: 'image/jpeg',
        data: base64Jpeg,
      },
    ],
  });
}
