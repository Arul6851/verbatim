import { generateJSON } from "@/app/lib/llm";
import { buildChatSystem, validateCitations } from "@/app/lib/contract";
import type { Quote, Citation, Persona, ChatTurn } from "@/app/lib/types";

export const runtime = "nodejs";

type ChatBody = {
  quotes?: Quote[];
  history?: ChatTurn[];
  question?: string;
  persona?: Persona;
};

type ModelReply = {
  reply?: string;
  citations?: Citation[];
  grounded?: boolean;
};

// Renders prior turns into a compact transcript the model reads as context.
function historyString(history: ChatTurn[], persona?: Persona): string {
  const name = persona?.name ?? "You";
  return history
    .map((t) => (t.role === "user" ? `Interviewer: ${t.content}` : `${name}: ${t.content}`))
    .join("\n");
}

export async function POST(request: Request) {
  let body: ChatBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { quotes, history = [], question, persona } = body;

  if (!Array.isArray(quotes) || quotes.length === 0) {
    return Response.json({ error: "No quotes provided" }, { status: 400 });
  }
  if (!question || typeof question !== "string") {
    return Response.json({ error: "No question provided" }, { status: 400 });
  }

  const system = buildChatSystem(quotes, persona);
  const transcript = history.length
    ? `${historyString(history, persona)}\nInterviewer: ${question}`
    : question;

  let data: ModelReply;
  try {
    data = await generateJSON<ModelReply>(system, transcript);
  } catch (err) {
    console.error("chat route error:", err);
    return Response.json(
      { error: "The persona couldn't respond. Try again." },
      { status: 502 }
    );
  }

  // NON-NEGOTIABLE: drop any citation ID the model invented.
  const citations = validateCitations(data.citations, quotes);

  return Response.json({
    reply: data.reply ?? "",
    citations,
    grounded: data.grounded ?? citations.length > 0,
  });
}
