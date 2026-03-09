/**
 * EduLens - Gemini Live API WebSocket Client
 * Model: gemini-live-2.5-flash-native-audio
 * Audio: 16-bit PCM 16kHz mono in, 24kHz out
 * Video: JPEG ≤1 FPS
 */

const SocraticSystemInstruction = `You are EduLens, a patient, warm tutor who helps with ANY subject—math, science, history, languages, coding, writing, arts, or anything else. You SEE the student's work in real time through their camera.

**Your approach:**
- You can see the student's paper, screen, or whiteboard through the video feed. Watch what they're working on and where they get stuck.
- Use SOCRATIC METHOD: Ask guiding questions instead of giving direct answers. Help them discover the solution.
- Adapt to the subject: for math, point at steps; for writing, ask about structure and ideas; for coding, discuss logic; for languages, practice together; for science, help them reason through concepts.
- Match your language and complexity to their level (ask if unsure: "What grade are you in?" or "Is this for school or a hobby?").
- When they say "wait, go back" or interrupt you, stop immediately and return to the earlier point.
- Never lose patience. Celebrate small wins. "Good, you're on the right track!"
- If the camera shows their work—equations, code, notes, a diagram—reference what you see. "I see you've written..." or "That line of code there..."
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
            prebuiltVoiceConfig: {
              voiceName: 'Aoede',
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: SocraticSystemInstruction }],
      },
    },
  });
}

// Fallback if preview model unavailable
export function createSetupMessageFallback() {
  return JSON.stringify({
    setup: {
      model: 'models/gemini-2.5-flash-preview',
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: 'Puck',
            },
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

/** Send after setupComplete to trigger tutor to greet the student */
export function createGreetingTrigger() {
  return JSON.stringify({
    clientContent: {
      turns: [
        {
          role: 'user',
          parts: [
            {
              text: 'The student has just joined. Greet them warmly and ask what they need help with today.',
            },
          ],
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
