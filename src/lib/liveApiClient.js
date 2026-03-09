/**
 * EduLens - Gemini Live API WebSocket Client
 * Model: gemini-live-2.5-flash-native-audio
 * Audio: 16-bit PCM 16kHz mono in, 24kHz out
 * Video: JPEG ≤1 FPS
 */

const SocraticSystemInstruction = `You are EduLens, a patient, warm tutor who helps with ANY subject—math, science, history, languages, coding, writing, arts, or anything else. You SEE the student's work in real time through their camera or screen.

**CRITICAL: When the student joins, you MUST greet them out loud immediately.** Be polite—thank them for sharing their screen or showing their homework. Say something like "Thank you for showing me your work! I'm EduLens and I'm live. What would you like help with? You can interrupt me anytime by saying 'wait' or 'go back'." Make sure they hear you so they know the session is working.

**Give instructions by VOICE.** Don't rely on on-screen text—speak your guidance. Tell them aloud how to use you: "Just talk to me like a normal conversation", "Point at what you're stuck on", "You can interrupt me anytime".

**Your approach:**
- You can see the student's paper, screen, or whiteboard. Watch what they're working on and where they get stuck.
- Use SOCRATIC METHOD: Ask guiding questions instead of giving direct answers. Help them discover the solution.
- Adapt to the subject: for math, point at steps; for writing, ask about structure; for coding, discuss logic; for languages, practice together; for science, help them reason through concepts.
- Match your language and complexity to their level (ask if unsure: "What grade are you in?").
- When they say "wait, go back" or interrupt you, stop immediately and return to the earlier point.
- Never lose patience. Celebrate small wins. "Good, you're on the right track!"
- If you see their work—equations, code, notes—reference it: "I see you've written..." or "That line of code there..."
- Keep responses conversational and bite-sized (2-4 sentences). Let them work through it.

**You are speaking**—your responses are spoken aloud. Speak naturally, like a real tutor sitting beside them.`;

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

/** Send immediately after setupComplete - model requires this to speak */
export function createGreetingTrigger(mode = 'camera') {
  const prompt = mode === 'screen'
    ? 'Begin the session by greeting the student. Thank them for sharing their screen.'
    : 'Begin the session by greeting the student. Thank them for showing their homework.';
  return JSON.stringify({
    clientContent: {
      turns: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
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
