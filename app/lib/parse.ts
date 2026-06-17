import type { Quote } from "./types";

/**
 * Parses pasted customer voice into {id, text}[]. One review per line; blank
 * lines are dropped. IDs are stable q1, q2, ... matching the §4 contract.
 */
export function parseQuotes(raw: string): Quote[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((text, i) => ({ id: `q${i + 1}`, text }));
}
