"use client";

import { useState } from "react";
import Link from "next/link";
import { parseQuotes } from "../lib/parse";
import { sampleQuotes, SAMPLE_REVIEWS } from "../lib/sample";
import { HighlightText } from "../components/HighlightText";
import type { Quote, Persona, ChatResponse } from "../lib/types";

type Message =
  | { role: "user"; content: string }
  | { role: "persona"; content: string; citations: string[]; grounded: boolean };

export default function App() {
  const [phase, setPhase] = useState<"input" | "chat">("input");
  const [raw, setRaw] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const quoteById = (id: string) => quotes.find((q) => q.id === id);

  async function buildPersona(qs: Quote[]) {
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotes: qs }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Couldn't build the persona.");
      }
      const p: Persona = await res.json();
      setQuotes(qs);
      setPersona(p);
      setMessages([]);
      setPhase("chat");
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
    buildPersona(qs);
  }

  function handleLoadSample() {
    setRaw(SAMPLE_REVIEWS.join("\n"));
    buildPersona(sampleQuotes());
  }

  async function sendQuestion() {
    const q = question.trim();
    if (!q || sending || !persona) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quotes, history, question: q, persona }),
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  function reset() {
    setPhase("input");
    setPersona(null);
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
              Meet the customer behind them.
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
                {building ? "Building…" : "Build persona →"}
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

  // ── CHAT STATE ───────────────────────────────────────────────────────
  const selectedQuote = selectedId ? quoteById(selectedId) : null;

  return (
    <div className="flex-1">
      <TopBar />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-ink text-base font-semibold text-paper">
              {persona?.name?.[0] ?? "?"}
            </span>
            <div>
              <h1 className="font-display text-xl font-bold tracking-tight">
                {persona?.name}
              </h1>
              <p className="text-sm text-muted">{persona?.vibe}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="eyebrow hidden sm:inline">
              Built from {quotes.length} real quotes
            </span>
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
                  Interview {persona?.name}. Ask anything — they can only answer
                  from what real customers actually said.
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
              {sending && (
                <ThinkingDots name={persona?.name ?? "They"} />
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="mt-auto flex gap-2 pt-4">
              <input
                className="flex-1 rounded-full border border-hairline bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-highlight"
                placeholder="Ask the customer a question…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendQuestion();
                }}
                disabled={sending}
              />
              <button
                className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                onClick={sendQuestion}
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
              <p key={selectedQuote.id} className="text-sm leading-relaxed text-ink">
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
