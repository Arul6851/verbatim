"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { parseQuotes } from "../lib/parse";
import { sampleQuotes, SAMPLE_REVIEWS } from "../lib/sample";
import { HighlightText } from "../components/HighlightText";
import type { Quote, PersonaArchetype, ChatResponse } from "../lib/types";

type Message =
  | { role: "user"; content: string }
  | { role: "persona"; content: string; citations: string[]; grounded: boolean };

const AGENT_ID = "8SjoXAIl6RdAU14P2ofE19uLcvc";

// A fixed off-topic question so the honest "no receipt" moment is always
// reachable, whatever the dataset.
const CURVEBALL = {
  sample: "What did you think of their new VR headset launch?",
  paste: "What did you think of their Super Bowl ad this year?",
} as const;

export default function App() {
  const [phase, setPhase] = useState<"input" | "select" | "chat">("input");
  const [raw, setRaw] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [personas, setPersonas] = useState<PersonaArchetype[]>([]);
  const [active, setActive] = useState<PersonaArchetype | null>(null);
  const [source, setSource] = useState<"paste" | "sample">("sample");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversationId = useRef(crypto.randomUUID());

  const quoteById = (id: string) => quotes.find((q) => q.id === id);

  async function buildPersonas(qs: Quote[], src: "paste" | "sample") {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/personas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotes: qs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't read the customers.");
      }
      const data: { personas: PersonaArchetype[] } = await res.json();
      setQuotes(qs);
      setPersonas(data.personas);
      setSource(src);
      setActive(null);
      setMessages([]);
      setPhase("select");

      // PRESERVE existing Pendo/Novus events (now carrying persona_count).
      if (typeof window !== "undefined" && window.pendo) {
        if (src === "paste") {
          window.pendo.track("persona_built_from_reviews", {
            quote_count: qs.length,
            raw_text_length: raw.length,
            persona_count: data.personas.length,
            source: "paste",
          });
        } else {
          window.pendo.track("sample_reviews_loaded", {
            quote_count: qs.length,
            persona_count: data.personas.length,
          });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBuilding(false);
    }
  }

  function handleBuildFromPaste() {
    const qs = parseQuotes(raw);
    if (qs.length === 0) {
      setError("Paste some reviews first — one per line.");
      return;
    }
    buildPersonas(qs, "paste");
  }

  function handleLoadSample() {
    setRaw(SAMPLE_REVIEWS.join("\n"));
    buildPersonas(sampleQuotes(), "sample");
  }

  function pickPersona(p: PersonaArchetype) {
    setActive(p);
    setMessages([]);
    setSelectedId(null);
    setError(null);
    conversationId.current = crypto.randomUUID();
    setPhase("chat");

    if (typeof window !== "undefined" && window.pendo) {
      window.pendo.track("persona_selected", {
        persona_name: p.name,
        persona_character: p.character,
        persona_count: personas.length,
      });
    }
  }

  async function sendQuestion(preset?: string) {
    const q = (preset ?? question).trim();
    if (!q || sending || !active) return;

    const promptMessageId = crypto.randomUUID();
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setSending(true);
    setError(null);

    window.pendo?.trackAgent("prompt", {
      agentId: AGENT_ID,
      conversationId: conversationId.current,
      messageId: promptMessageId,
      content: q,
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quotes, // FULL corpus — the persona is a lens, not a slice
          history,
          question: q,
          persona: {
            name: active.name,
            character: active.character,
            focus: active.focus,
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The persona couldn't respond.");
      }
      const data: ChatResponse = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "persona",
          content: data.reply,
          citations: data.citations.map((c) => c.id),
          grounded: data.grounded,
        },
      ]);

      window.pendo?.trackAgent("agent_response", {
        agentId: AGENT_ID,
        conversationId: conversationId.current,
        messageId: crypto.randomUUID(),
        content: data.reply,
      });

      if (typeof window !== "undefined" && window.pendo) {
        window.pendo.track("interview_question_sent", {
          question_length: q.length,
          conversation_turn_number:
            history.filter((h) => h.role === "user").length + 1,
          citation_count: data.citations.length,
          grounded: data.grounded,
          persona_name: active.name,
          total_quotes: quotes.length,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function switchPersona() {
    // Back to the cast — conversation resets when a persona is re-picked, but
    // the evidence pool (full quote set) stays intact.
    setActive(null);
    setMessages([]);
    setSelectedId(null);
    setError(null);
    setPhase("select");
  }

  function reset() {
    if (typeof window !== "undefined" && window.pendo) {
      window.pendo.track("interview_session_reset", {
        total_messages: messages.length,
        total_user_questions: messages.filter((m) => m.role === "user").length,
        persona_name: active?.name,
        quote_count: quotes.length,
      });
    }
    setPhase("input");
    setPersonas([]);
    setActive(null);
    setMessages([]);
    setSelectedId(null);
    setError(null);
  }

  // ── INPUT STATE ──────────────────────────────────────────────────────
  if (phase === "input") {
    return (
      <div className="flex-1">
        <TopBar />
        <main className="mx-auto flex max-w-2xl flex-col gap-5 px-6 py-16">
          <div>
            <p className="eyebrow">Start a session</p>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Paste real reviews.
              <br />
              Meet the customers behind them.
            </h1>
            <p className="mt-3 text-muted">
              Every answer comes with the receipt — the exact quote it&apos;s
              based on.
            </p>
          </div>

          <div className="rounded-xl border border-hairline bg-white p-4">
            <label className="eyebrow">Customer voice · one review per line</label>
            <textarea
              className="mt-2 min-h-56 w-full resize-y rounded-lg border border-hairline bg-paper p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-highlight"
              placeholder="The offline mode is the only reason I still use it…&#10;Sync broke twice this month and I lost a whole note."
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                onClick={handleBuildFromPaste}
                disabled={building}
              >
                {building ? "Reading the room…" : "Meet the customers →"}
              </button>
              <button
                className="rounded-full border border-hairline px-5 py-2.5 text-sm font-medium transition-colors hover:bg-paper disabled:opacity-50"
                onClick={handleLoadSample}
                disabled={building}
              >
                Load sample
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── SELECT STATE ─────────────────────────────────────────────────────
  if (phase === "select") {
    return (
      <div className="flex-1">
        <TopBar />
        <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">The cast</p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight">
                {personas.length > 1
                  ? `${personas.length} customers hiding in your reviews`
                  : "The customer behind your reviews"}
              </h1>
              <p className="mt-2 text-muted">
                Each is a real archetype from the {quotes.length} quotes. Pick
                one to interview — they answer in character, always with a
                receipt.
              </p>
            </div>
            <button
              className="shrink-0 rounded-full border border-hairline px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white"
              onClick={reset}
            >
              Start over
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((p) => (
              <button
                key={p.id}
                onClick={() => pickPersona(p)}
                className="group flex h-full flex-col rounded-xl border border-hairline bg-white p-5 text-left transition-all hover:-translate-y-0.5 hover:border-ink"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-base font-semibold text-paper">
                    {p.name[0]}
                  </span>
                  <span className="font-display text-lg font-bold tracking-tight">
                    {p.name}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted">{p.character}</p>
                {p.focus.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.focus.map((f) => (
                      <span
                        key={f}
                        className="rounded-md bg-paper px-2 py-0.5 font-mono text-[11px] text-chip-text"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                <span className="mt-4 text-sm font-medium text-ink group-hover:underline">
                  Interview {p.name} →
                </span>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ── CHAT STATE ───────────────────────────────────────────────────────
  const selectedQuote = selectedId ? quoteById(selectedId) : null;
  const starters = active
    ? [...active.suggestedQuestions, CURVEBALL[source]]
    : [];
  const curveball = CURVEBALL[source];

  return (
    <div className="flex-1">
      <TopBar />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-base font-semibold text-paper">
              {active?.name?.[0] ?? "?"}
            </span>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">
                {active?.name}
              </h1>
              <p className="text-sm text-muted">{active?.character}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="eyebrow hidden sm:inline">
              Evidence pool · {quotes.length} quotes
            </span>
            {personas.length > 1 && (
              <button
                className="rounded-full border border-hairline px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white"
                onClick={switchPersona}
              >
                Switch persona
              </button>
            )}
            <button
              className="rounded-full border border-hairline px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white"
              onClick={reset}
            >
              Start over
            </button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-[1fr_340px]">
          {/* Conversation */}
          <section className="flex min-h-[60vh] flex-col gap-3">
            <div className="flex flex-1 flex-col gap-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted">
                  Interview {active?.name}. Ask anything — they answer in
                  character, but only from what real customers actually said.
                </p>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "text-right" : "text-left"}
                >
                  <div
                    className={
                      "inline-block max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                      (m.role === "user"
                        ? "bg-ink text-paper"
                        : "border border-hairline bg-white text-ink")
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.role === "persona" && m.citations.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.citations.map((id) => (
                          <button
                            key={id}
                            onClick={() => setSelectedId(id)}
                            className={
                              "rounded-md border px-1.5 py-0.5 font-mono text-xs transition-colors " +
                              (selectedId === id
                                ? "border-highlight bg-highlight text-chip-text"
                                : "border-hairline bg-paper text-chip-text hover:bg-highlight/40")
                            }
                          >
                            {id}
                          </button>
                        ))}
                      </div>
                    )}
                    {m.role === "persona" && !m.grounded && (
                      <p className="mt-1.5 font-mono text-xs italic text-muted">
                        no receipt — outside what customers said
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {sending && <ThinkingDots name={active?.name ?? "They"} />}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Suggested questions — tailored to this persona + a curveball that
                keeps the honest "no receipt" moment reachable. */}
            <div className="flex flex-wrap gap-2 pt-3">
              {starters.map((q) => {
                const isCurveball = q === curveball;
                return (
                  <button
                    key={q}
                    onClick={() => sendQuestion(q)}
                    disabled={sending}
                    title={
                      isCurveball
                        ? "Off-topic on purpose — watch the honest 'no receipt' answer"
                        : undefined
                    }
                    className={
                      "rounded-full px-3 py-1.5 text-xs transition-colors disabled:opacity-50 " +
                      (isCurveball
                        ? "border border-dashed border-hairline text-muted hover:bg-white"
                        : "border border-hairline bg-white text-ink hover:border-ink")
                    }
                  >
                    {q}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-full border border-hairline bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-highlight"
                placeholder={`Ask ${active?.name ?? "the customer"} a question…`}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendQuestion();
                }}
                disabled={sending}
              />
              <button
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                onClick={() => sendQuestion()}
                disabled={sending}
              >
                Ask
              </button>
            </div>
          </section>

          {/* Evidence rail */}
          <aside className="h-fit rounded-xl border border-hairline bg-white p-5 md:sticky md:top-6">
            <h2 className="eyebrow mb-3">
              Evidence {selectedQuote ? `· ${selectedQuote.id}` : ""}
            </h2>
            {selectedQuote ? (
              <p
                key={selectedQuote.id}
                className="text-sm leading-relaxed text-ink"
              >
                <HighlightText active>{selectedQuote.text}</HighlightText>
              </p>
            ) : (
              <p className="text-sm text-muted">
                Click a citation chip to swipe the highlighter across the exact
                quote behind an answer.
              </p>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function TopBar() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Verbatim<span className="text-highlight">.</span>
        </Link>
        <span className="eyebrow">User research · On the record</span>
      </div>
    </header>
  );
}

function ThinkingDots({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-muted">
      {name} is checking the receipts
      <span className="inline-flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
      </span>
    </p>
  );
}
