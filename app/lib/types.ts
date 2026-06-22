export type Quote = { id: string; text: string };

export type Citation = { id: string };

/**
 * A grounded customer archetype distilled from the reviews. The character
 * shapes tone and emphasis only — never the facts. Every persona answers from
 * the FULL quote set through this lens (see buildChatSystem).
 */
export type PersonaArchetype = {
  id: string;
  name: string;
  character: string; // one-line vibe
  focus: string[]; // 2–4 short phrases this customer cares about most
  suggestedQuestions: string[]; // 3 questions that fit this character
};

/** What the chat route needs to render a persona's voice. */
export type ChatPersona = {
  name: string;
  character: string;
  focus?: string[];
};

export type ChatTurn = { role: "user" | "persona"; content: string };

export type ChatResponse = {
  reply: string;
  citations: Citation[];
  grounded: boolean;
};

/** One grounded SWOT insight + the real quotes that back it. */
export type SwotPoint = { point: string; citations: Citation[] };

export type SwotData = {
  strengths: SwotPoint[];
  weaknesses: SwotPoint[];
  opportunities: SwotPoint[];
  threats: SwotPoint[];
};
