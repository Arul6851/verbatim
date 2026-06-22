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

const SYSTEM = `You produce a grounded SWOT analysis of a product from real customer review quotes. Each quote has an ID.

Classify the real signals in the reviews into four lists:
- strengths: aspects customers praise / like.
- weaknesses: complaints, problems, frustrations, things that don't work.
- opportunities: requested features or unmet needs ("I wish…", "I'd pay for…", missing capabilities).
- threats: churn signals, dealbreakers, cancellations, competitor mentions.

RULES:
- Each point is ONE concise, specific insight in your own words (max ~15 words).
- Every point MUST cite the supporting quote ID(s) it is based on.
- Only include points actually supported by the quotes. Never invent. If a quadrant has no support in the reviews, return an empty array for it.
- Don't pad: prefer a few sharp, well-supported points over many weak ones.

Return ONLY valid JSON:
{"strengths":[{"point":"...","citations":[{"id":"q1"}]}],"weaknesses":[],"opportunities":[],"threats":[]}`;

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
  return out;
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
