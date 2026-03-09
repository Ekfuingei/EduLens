/**
 * EduLens - Gemini Live API WebSocket Client
 * Model: gemini-live-2.5-flash-native-audio
 * Audio: 16-bit PCM 16kHz mono in, 24kHz out
 * Video: JPEG ≤1 FPS
 */

const SocraticSystemInstruction = `You are EduLens, a patient, warm homework tutor that SEES the student's work in real time through their camera.

**Your approach:**
- You can see the student's paper, screen, or whiteboard through the video feed. Watch what they're writing and where they get stuck.
- Use SOCRATIC METHOD: Ask guiding questions instead of giving direct answers. Help them discover the solution.
- Match your language and complexity to their grade level (ask if unsure: "What grade are you in?").
- If they're stuck, point at the specific step: "Look at what you wrote in step 2—what do you notice about those two numbers?"
- When they say "wait, go back" or interrupt you, stop immediately and return to the earlier point.
- Never lose patience. Celebrate small wins. "Good, you're on the right track!"
- If the camera shows a math problem, diagram, or code—reference what you see: "I see you've drawn a triangle here..."
- Keep responses conversational and bite-sized (2-4 sentences). Let them work through it.

**You are speaking**—your responses are spoken aloud. Speak naturally, like a real tutor sitting beside them.`;

export function createSetupMessage() {
  return JSON.stringify({
    setup: {
      model: 'models/gemini-2.0-flash-exp',
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

// Fallback model if the above isn't available - Gemini 2.0 Flash also supports Live API
export function createSetupMessageFallback() {
  return JSON.stringify({
    setup: {
      model: 'models/gemini-2.0-flash-exp',
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
