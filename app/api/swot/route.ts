import { generateJSON } from "@/app/lib/llm";
import { quoteBlock, validateCitations } from "@/app/lib/contract";
import type { Quote, Citation, SwotPoint, SwotData } from "@/app/lib/types";

export const runtime = "nodejs";

type SwotBody = { quotes?: Quote[] };

const QUADRANTS = [
  "strengths",
  "weaknesses",
  "opportunities",
  "threats",
] as const;
type Quadrant = (typeof QUADRANTS)[number];

// SWOT is a synthesis: cap themes per quadrant so it never degrades into a
// per-review transcript (which wouldn't scale to thousands of reviews).
const MAX_THEMES_PER_QUADRANT = 4;

const SYSTEM = `You produce a grounded SWOT analysis of a product from real customer review quotes. Each quote has an ID.

Your job is SYNTHESIS, not transcription. GROUP many related reviews into a SMALL number of recurring THEMES — never output one point per review. Think like an analyst summarizing thousands of reviews into the handful of patterns that actually matter.

Sort the signals into four lists:
- strengths: aspects customers praise / like.
- weaknesses: complaints, problems, frustrations, things that don't work.
- opportunities: requested features or unmet needs ("I wish…", "I'd pay for…", missing capabilities).
- threats: churn signals, dealbreakers, cancellations, competitor mentions.

RULES:
- Each "point" is ONE synthesized THEME in your own words (max ~15 words) that GENERALIZES across multiple reviews — not a paraphrase of a single quote.
- Aim for at most 3–4 themes per quadrant. Merge similar feedback into one theme; fewer, sharper themes are better. If support is thin, return fewer (or none).
- For each theme, cite the most REPRESENTATIVE quote IDs that back it — cite ALL that clearly fit (this shows how widespread it is), but you need not stretch. A theme should usually be backed by more than one quote when the reviews support it.
- Only include themes actually supported by the quotes. Never invent. If a quadrant has no support, return an empty array.

Return ONLY valid JSON:
{"strengths":[{"point":"...","citations":[{"id":"q1"},{"id":"q9"}]}],"weaknesses":[],"opportunities":[],"threats":[]}`;

type RawPoint = { point?: unknown; citations?: unknown };
type RawSwot = Partial<Record<Quadrant, unknown>>;

// Clean one quadrant: keep only well-formed points whose citations resolve to
// real quotes (the SAME validation chat uses), and strip any invalid IDs.
function cleanQuadrant(raw: unknown, quotes: Quote[]): SwotPoint[] {
  if (!Array.isArray(raw)) return [];
  const out: SwotPoint[] = [];
  for (const item of raw as RawPoint[]) {
    const point = typeof item?.point === "string" ? item.point.trim() : "";
    if (!point) continue;
    const citations = validateCitations(item?.citations as Citation[], quotes);
    if (citations.length === 0) continue; // drop points with no real receipt
    out.push({ point, citations });
  }
  // Safety net: keep SWOT a synthesis, never a long transcript of reviews.
  return out.slice(0, MAX_THEMES_PER_QUADRANT);
}

export async function POST(request: Request) {
  let body: SwotBody;
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

  let parsed: RawSwot;
  try {
    parsed = await generateJSON<RawSwot>(
      system,
      "Build the grounded SWOT from these quotes."
    );
  } catch (err) {
    console.error("swot route error:", err);
    return Response.json(
      { error: "Couldn't read the receipts. Try again." },
      { status: 502 }
    );
  }

  // NON-NEGOTIABLE: every surviving point cites a real, validated quote.
  const swot: SwotData = {
    strengths: cleanQuadrant(parsed.strengths, quotes),
    weaknesses: cleanQuadrant(parsed.weaknesses, quotes),
    opportunities: cleanQuadrant(parsed.opportunities, quotes),
    threats: cleanQuadrant(parsed.threats, quotes),
  };

  return Response.json(swot);
}
