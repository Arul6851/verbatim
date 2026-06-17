import { generateJSON } from "@/app/lib/gemini";
import { quoteBlock } from "@/app/lib/contract";
import type { Quote, Persona } from "@/app/lib/types";

export const runtime = "nodejs";

type PersonaBody = { quotes?: Quote[] };

const SYSTEM = `You distill a single, coherent customer persona from the review quotes below.

RULES:
- Base the persona ONLY on what the quotes actually say. Do not invent traits.
- "name" is a plausible first name for this customer (not the product's name).
- "vibe" is one short line (max ~12 words) capturing who they are and how they feel.
- Stay grounded: the vibe must reflect sentiments present in the quotes.

Return ONLY valid JSON:
{"name": "<first name>", "vibe": "<one-line vibe>"}`;

export async function POST(request: Request) {
  let body: PersonaBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { quotes } = body;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return Response.json({ error: "No quotes provided" }, { status: 400 });
  }

  const system = `${SYSTEM}\n\nQUOTES:\n${quoteBlock(quotes)}`;

  try {
    const data = await generateJSON<Partial<Persona>>(
      system,
      "Build the persona from these quotes."
    );
    const persona: Persona = {
      name: data.name?.trim() || "The Customer",
      vibe: data.vibe?.trim() || "A real customer, in their own words.",
    };
    return Response.json(persona);
  } catch (err) {
    console.error("persona route error:", err);
    return Response.json(
      { error: "Couldn't build the persona. Try again." },
      { status: 502 }
    );
  }
}
