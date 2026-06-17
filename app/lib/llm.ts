import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// Primary engine: OpenAI. Fallback: Gemini. Both are driven with the SAME §4
// contract — only the transport differs. Clients are built lazily so a missing
// key surfaces as a clean failure (and lets the other provider take over)
// rather than crashing module load.

const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

export const OPENAI_MODEL = "gpt-4o-mini"; // cheap, fast, reliable JSON mode
export const GEMINI_MODEL = "gemini-2.5-flash"; // free-tier fallback

let openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiKey) throw new Error("OPENAI_API_KEY is not set");
  if (!openai) openai = new OpenAI({ apiKey: openaiKey });
  return openai;
}

let genai: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!genai) genai = new GoogleGenAI({ apiKey: geminiKey });
  return genai;
}

// Each provider returns the raw JSON text the model produced.
async function viaOpenAI(system: string, contents: string): Promise<string> {
  const resp = await getOpenAI().chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: contents },
    ],
  });
  const text = resp.choices[0]?.message?.content;
  if (!text) throw new Error("Empty response from OpenAI");
  return text;
}

async function viaGemini(system: string, contents: string): Promise<string> {
  const resp = await getGenAI().models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      temperature: 0,
    },
  });
  const text = resp.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

/**
 * Generates JSON with OpenAI, falling back to Gemini if OpenAI errors OR
 * returns unparseable JSON. The parse lives inside each attempt so a malformed
 * primary response still triggers the fallback.
 */
export async function generateJSON<T>(
  system: string,
  contents: string
): Promise<T> {
  try {
    return JSON.parse(await viaOpenAI(system, contents)) as T;
  } catch (err) {
    console.warn(
      "OpenAI failed, falling back to Gemini:",
      err instanceof Error ? err.message : err
    );
    return JSON.parse(await viaGemini(system, contents)) as T;
  }
}
