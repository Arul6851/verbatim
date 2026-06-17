"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { HighlightText } from "./HighlightText";

/**
 * A self-contained loop of the product's magic: a persona answer appears, its
 * citation chip lights, and the amber highlighter sweeps across the exact
 * source quote it's based on. The one motion that sells the whole product.
 */
export function ReceiptDemo() {
  const reduce = useReducedMotion();
  // step: 0 reply, 1 chip lit, 2 highlight swept, then loop. With reduced
  // motion we pin to the final state so nothing animates.
  const [step, setStep] = useState(reduce ? 2 : 0);

  useEffect(() => {
    if (reduce) return;
    const timings = [900, 700, 2600]; // dwell on each step before advancing
    const t = setTimeout(
      () => setStep((s) => (s + 1) % 3),
      timings[step]
    );
    return () => clearTimeout(t);
  }, [step, reduce]);

  const chipLit = step >= 1;
  const swept = step >= 2;

  return (
    <div className="w-full max-w-md rounded-xl border border-hairline bg-white p-5 shadow-[0_1px_0_var(--hairline),0_24px_48px_-24px_rgba(24,23,15,0.25)]">
      <div className="eyebrow mb-3">Verbatim · live receipt</div>

      {/* Interviewer question */}
      <p className="text-sm text-muted">
        <span className="font-mono text-xs text-muted/80">Q ·</span> What&apos;s
        the most frustrating part?
      </p>

      {/* Persona reply */}
      <div className="mt-3 rounded-lg bg-paper p-3">
        <div className="mb-1 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-semibold text-paper">
            M
          </span>
          <span className="font-display text-sm font-semibold text-ink">
            Maya
          </span>
        </div>
        <p className="text-sm leading-relaxed text-ink">
          Honestly, sync broke twice this month and I lost a whole note — it was
          terrifying.
        </p>
        <motion.button
          type="button"
          aria-label="citation q2"
          className="mt-2 rounded-md border px-1.5 py-0.5 font-mono text-xs transition-colors"
          animate={{
            backgroundColor: chipLit ? "#ffe45c" : "#ffffff",
            borderColor: chipLit ? "#ffe45c" : "#e4e1d7",
            color: chipLit ? "#7a5b00" : "#6e6a5e",
          }}
          transition={{ duration: reduce ? 0 : 0.3 }}
        >
          q2
        </motion.button>
      </div>

      {/* Evidence / receipt */}
      <div className="mt-4 border-t border-hairline pt-3">
        <div className="eyebrow mb-2">Receipt · q2</div>
        <p className="text-sm leading-relaxed text-ink">
          <HighlightText active={swept}>
            Sync broke twice this month and I lost a whole note. Terrifying.
          </HighlightText>
        </p>
      </div>
    </div>
  );
}
