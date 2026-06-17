import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

// Instantiated lazily so a missing key surfaces as a clean 500 at request time
// rather than crashing module load.
let client: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

// Free tier — bump to the newest Flash if desired (see CLAUDE.md §4).
export const MODEL = "gemini-2.5-flash";

/**
 * Calls Gemini in JSON mode with temperature 0 (tight grounding) and returns
 * the parsed JSON object. `system` is the full system instruction (the §4
 * contract + the [id] quote block). `contents` is the user-facing prompt.
 */
export async function generateJSON<T>(
  system: string,
  contents: string
): Promise<T> {
  const ai = getAI();
  const resp = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      temperature: 0,
    },
  });
  const text = resp.text;
  if (!text) {
    throw new Error("Empty response from model");
  }
  return JSON.parse(text) as T;
}
