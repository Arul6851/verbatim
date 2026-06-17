export type Quote = { id: string; text: string };

export type Citation = { id: string };

export type Persona = { name: string; vibe: string };

export type ChatTurn = { role: "user" | "persona"; content: string };

export type ChatResponse = {
  reply: string;
  citations: Citation[];
  grounded: boolean;
};
