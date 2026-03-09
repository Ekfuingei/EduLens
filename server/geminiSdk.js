/**
 * EduLens - Google GenAI SDK integration (mandatory requirement)
 * Uses @google/genai for Gemini API interaction
 * Primary Live API connection uses WebSocket; SDK used for model verification
 */

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Verify API key and model access using Google GenAI SDK
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function verifyGeminiAccess() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: 'Reply with only: ok',
    });
    const text = response?.text ?? response?.candidates?.[0]?.content?.parts?.[0]?.text;
    return { ok: !!text, sdk: '@google/genai' };
  } catch (err) {
    return { ok: false, error: err.message, sdk: '@google/genai' };
  }
}
