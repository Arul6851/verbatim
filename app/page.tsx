"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "motion/react";
import { Reveal } from "./components/Reveal";
import { ReceiptDemo } from "./components/ReceiptDemo";
import { HighlightText } from "./components/HighlightText";
import { useEffect, useState } from "react";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300 " +
        (scrolled
          ? "border-b border-hairline bg-paper/85 backdrop-blur"
          : "border-b border-transparent")
      }
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-lg font-bold tracking-tight">
          Verbatim<span className="text-highlight">.</span>
        </Link>
        <Link
          href="/app"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
        >
          Try it
        </Link>
      </nav>
    </header>
  );
}

function Hero() {
  const { scrollY } = useScroll();
  const yDemo = useTransform(scrollY, [0, 400], [0, -30]);

  return (
    <section className="relative overflow-hidden px-6 pt-32 pb-20 md:pt-40 md:pb-28">
      {/* subtle paper grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(var(--hairline) 1px, transparent 1px), linear-gradient(90deg, var(--hairline) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 80%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <Reveal>
            <p className="eyebrow">User research · On the record</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              The user-research tool that{" "}
              <HighlightText active>can&apos;t make things up.</HighlightText>
            </h1>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted">
              Verbatim turns real reviews into a customer you can interview — and
              every answer comes with the receipt: the exact quote it&apos;s
              based on.
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/app"
                className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition-transform hover:-translate-y-0.5"
              >
                Try it free →
              </Link>
              <a
                href="#how"
                className="rounded-full border border-hairline px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-white"
              >
                See how it works
              </a>
            </div>
          </Reveal>
        </div>

        <motion.div style={{ y: yDemo }} className="flex justify-center md:justify-end">
          <Reveal delay={0.2}>
            <ReceiptDemo />
          </Reveal>
        </motion.div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-y border-hairline bg-white px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="eyebrow">The problem</p>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-4 font-display text-2xl leading-snug md:text-3xl">
            AI research tools invent feedback you can&apos;t trust.{" "}
            <span className="text-muted">
              Verbatim only repeats what real customers actually said.
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Paste real reviews",
    body: "Drop in App Store reviews, support tickets, a subreddit dump — any real customer voice. Or load a sample in one click.",
  },
  {
    n: "02",
    title: "Meet the customer behind them",
    body: "Verbatim builds an interviewable persona from the quotes — a coherent individual, not a faceless summary.",
  },
  {
    n: "03",
    title: "Every answer cites the receipt",
    body: "Ask anything. Each reply shows the exact source quote — and if the quotes don't cover it, the persona says so.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="eyebrow text-center">How it works</p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold tracking-tight md:text-4xl">
            From raw reviews to a customer you can question.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div className="h-full rounded-xl border border-hairline bg-white p-6">
                <span className="font-mono text-sm text-chip-text">{s.n}</span>
                <h3 className="mt-3 font-display text-xl font-semibold">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeeTheReceipt() {
  return (
    <section className="border-y border-hairline bg-white px-6 py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
        <div>
          <Reveal>
            <p className="eyebrow">The signature</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Click any claim. See the proof.
            </h2>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              The amber highlighter is the whole stance made visible: every
              citation tethers to a real sentence a real customer wrote. Color
              means proof. Nothing is invented — and you can always check.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.1} className="flex justify-center md:justify-start">
          <ReceiptDemo />
        </Reveal>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 py-28">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <h2 className="font-display text-3xl font-bold leading-tight tracking-tight md:text-5xl">
            Stop guessing what your users think.
            <br />
            <span className="text-muted">Read it from the source.</span>
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 flex justify-center">
            <Link
              href="/app"
              className="rounded-full bg-ink px-7 py-3.5 text-base font-medium text-paper transition-transform hover:-translate-y-0.5"
            >
              Try it free →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-hairline px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-muted md:flex-row">
        <span className="font-display font-semibold text-ink">
          Verbatim<span className="text-highlight">.</span>
        </span>
        <span className="eyebrow">Built for World Product Day · #EveryoneShipsNow</span>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="flex-1">
      <Nav />
      <main>
        <Hero />
        <Problem />
        <HowItWorks />
        <SeeTheReceipt />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
