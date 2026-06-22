import { generateJSON } from "@/app/lib/llm";
import { quoteBlock } from "@/app/lib/contract";
import type { Quote, PersonaArchetype } from "@/app/lib/types";

export const runtime = "nodejs";

type PersonasBody = { quotes?: Quote[] };

// Below this many reviews, the data rarely supports >1 distinct perspective.
const SINGLE_PERSONA_THRESHOLD = 12;

const BASE_SYSTEM = `You analyze a set of real customer review quotes and identify DISTINCT customer archetypes that genuinely exist in this feedback.

An archetype is a coherent kind of customer with a distinct PERSPECTIVE — e.g. a power user burned by reliability problems; a value-conscious customer near churn over price; a newer casual user still forming an opinion.

RULES:
- Base every archetype ONLY on real patterns in the quotes. Never invent a customer type the reviews don't support.
- Archetypes must be genuinely DISTINCT from each other — different PRIMARY concerns, not three flavors of the same complaint.
- "name": a plausible first name for this customer (NOT the product's name).
- "character": one short line (max ~12 words) capturing who they are and how they feel.
- "focus": 2–4 short phrases naming what THIS customer cares about most, drawn from the quotes (e.g. "reliability", "data loss", "price").
- "suggestedQuestions": exactly 3 natural interview questions that fit this character and that the quotes can actually answer.

Return ONLY valid JSON:
{"personas": [{"name": "...", "character": "...", "focus": ["...", "..."], "suggestedQuestions": ["...", "...", "..."]}]}`;

type RawPersona = {
  name?: string;
  character?: string;
  focus?: unknown;
  suggestedQuestions?: unknown;
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

export async function POST(request: Request) {
  let body: PersonasBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { quotes } = body;
  if (!Array.isArray(quotes) || quotes.length === 0) {
    return Response.json({ error: "No quotes provided" }, { status: 400 });
  }

  const maxPersonas = quotes.length < SINGLE_PERSONA_THRESHOLD ? 1 : 3;
  const countRule =
    maxPersonas === 1
      ? `\n- There are only ${quotes.length} reviews here, so return EXACTLY ONE persona that represents this customer.`
      : `\n- Return 2 or 3 archetypes — only as many genuinely DISTINCT perspectives as the reviews support.`;

  const system = `${BASE_SYSTEM}${countRule}\n\nQUOTES:\n${quoteBlock(quotes)}`;

  let parsed: { personas?: RawPersona[] };
  try {
    parsed = await generateJSON<{ personas?: RawPersona[] }>(
      system,
      "Identify the distinct customer archetypes in these reviews."
    );
  } catch (err) {
    console.error("personas route error:", err);
    return Response.json(
      { error: "Couldn't read the customers. Try again." },
      { status: 502 }
    );
  }

  const raw = Array.isArray(parsed.personas) ? parsed.personas : [];

  let personas: PersonaArchetype[] = raw
    .map((p, i): PersonaArchetype => {
      const focus = asStringArray(p.focus).slice(0, 4);
      const suggestedQuestions = asStringArray(p.suggestedQuestions).slice(0, 3);
      return {
        id: `p${i + 1}`,
        name: (p.name || "").trim() || "The Customer",
        character:
          (p.character || "").trim() || "A real customer, in their own words.",
        focus,
        suggestedQuestions,
      };
    })
    // Keep only usable personas (need at least one suggested question).
    .filter((p) => p.suggestedQuestions.length > 0)
    .slice(0, maxPersonas);

  // Fallback: never hand the UI an empty list.
  if (personas.length === 0) {
    personas = [
      {
        id: "p1",
        name: "The Customer",
        character: "A real customer, in their own words.",
        focus: [],
        suggestedQuestions: [
          "What do you like most about it?",
          "What frustrates you the most?",
          "Would you recommend it to a friend?",
        ],
      },
    ];
  }

  return Response.json({ personas });
}
