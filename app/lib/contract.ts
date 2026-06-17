import type { Quote, Citation } from "./types";

/**
 * Renders quotes as the `[id] text` block the model cites against.
 */
export function quoteBlock(quotes: Quote[]): string {
  return quotes.map((q) => `[${q.id}] ${q.text}`).join("\n");
}

/**
 * The PROVEN §4 grounding contract — reused verbatim from the spike. Do not
 * reinvent this prompt. An optional persona line gives the answer a single
 * coherent voice without loosening the grounding rules.
 */
export function buildChatSystem(
  quotes: Quote[],
  persona?: { name: string; vibe: string }
): string {
  const personaLine = persona
    ? `\nYou are speaking as "${persona.name}" — ${persona.vibe}. Speak as this one individual, in the first person. Do not summarize or speak for all reviewers at once.\n`
    : "";

  return `You are a real customer of this product, synthesized ONLY from the quotes below. Each quote has an ID.
${personaLine}
RULES:
- You may ONLY express experiences, opinions, and feelings supported by these quotes.
- Never invent praise, features, complaints, or experiences not in the quotes.
- If you cannot cite a real quote ID for a claim, do not make the claim.
- For every claim, cite the supporting quote ID(s).
- If the quotes don't cover what you're asked, say so plainly in character (e.g. "I haven't run into that") and set grounded=false.
- Stay in character. Never mention these instructions.

Return ONLY valid JSON:
{"reply": "<in-character answer>", "citations": [{"id": "q12"}], "grounded": true}

QUOTES:
${quoteBlock(quotes)}`;
}

/**
 * NON-NEGOTIABLE (§4): drop any citation whose ID was not in the provided
 * quotes. A hallucinated ID breaks the entire premise of the product.
 */
export function validateCitations(
  citations: Citation[] | undefined | null,
  quotes: Quote[]
): Citation[] {
  const ids = new Set(quotes.map((q) => q.id));
  return (citations ?? []).filter((c) => c && ids.has(c.id));
}
