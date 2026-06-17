"use client";

import { useState } from "react";
import { parseQuotes } from "./lib/parse";
import { sampleQuotes, SAMPLE_REVIEWS } from "./lib/sample";
import type { Quote, Persona, ChatResponse } from "./lib/types";

type Message =
  | { role: "user"; content: string }
  | { role: "persona"; content: string; citations: string[]; grounded: boolean };

export default function Home() {
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

    const history = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

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

  // ---- INPUT STATE ----
  if (phase === "input") {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-6">
        <header>
          <h1 className="text-2xl font-bold">Verbatim</h1>
          <p className="text-gray-600">
            Paste real reviews. Meet the customer behind them. Every answer
            shows the receipt.
          </p>
        </header>

        <textarea
          className="min-h-64 w-full rounded border border-gray-300 p-3 font-mono text-sm"
          placeholder="Paste real customer reviews — one per line."
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
            onClick={handleBuildFromPaste}
            disabled={building}
          >
            {building ? "Building…" : "Build persona"}
          </button>
          <button
            className="rounded border border-gray-400 px-4 py-2 disabled:opacity-50"
            onClick={handleLoadSample}
            disabled={building}
          >
            Load sample
          </button>
        </div>
      </main>
    );
  }

  // ---- CHAT STATE ----
  const selectedQuote = selectedId ? quoteById(selectedId) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">{persona?.name}</h1>
          <p className="text-gray-600">{persona?.vibe}</p>
          <p className="text-xs text-gray-400">
            Built from {quotes.length} real quotes
          </p>
        </div>
        <button className="text-sm text-gray-500 underline" onClick={reset}>
          Start over
        </button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        {/* Conversation */}
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-500">
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
                    "inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm " +
                    (m.role === "user"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-900")
                  }
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "persona" && m.citations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {m.citations.map((id) => (
                        <button
                          key={id}
                          onClick={() => setSelectedId(id)}
                          className={
                            "rounded border px-1.5 py-0.5 font-mono text-xs " +
                            (selectedId === id
                              ? "border-yellow-500 bg-yellow-200"
                              : "border-gray-300 bg-white hover:bg-yellow-50")
                          }
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  )}
                  {m.role === "persona" && !m.grounded && (
                    <p className="mt-1 text-xs italic text-gray-400">
                      no receipt — outside what customers said
                    </p>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <p className="text-sm text-gray-400">{persona?.name} is thinking…</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="mt-auto flex gap-2 pt-4">
            <input
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="Ask the customer a question…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendQuestion();
              }}
              disabled={sending}
            />
            <button
              className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              onClick={sendQuestion}
              disabled={sending}
            >
              Ask
            </button>
          </div>
        </section>

        {/* Evidence panel */}
        <aside className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-gray-500">
            Receipt
          </h2>
          {selectedQuote ? (
            <div>
              <span className="font-mono text-xs text-gray-500">
                [{selectedQuote.id}]
              </span>
              <p className="mt-1 rounded bg-yellow-200 p-2 text-sm">
                {selectedQuote.text}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              Click a citation chip to see the exact quote behind an answer.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
