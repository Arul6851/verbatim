"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * The signature beat: an amber highlighter sweeps left-to-right across text
 * when `active`. Color == proof.
 *
 * Uses an animated background (box-decoration-break: clone) rather than an
 * absolute overlay so it highlights correctly even when the text WRAPS across
 * multiple lines — each line gets its own marker. Reduced-motion users just see
 * the final highlighted state with no sweep.
 */
export function HighlightText({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  const reduce = useReducedMotion();
  // Start hidden, then reveal on the next frame so the background-size
  // transition runs from 0 → full on mount and whenever `active` flips.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(active));
    return () => cancelAnimationFrame(id);
  }, [active]);

  const on = reduce ? active : shown;

  return (
    <span
      className="box-decoration-clone"
      style={{
        backgroundImage:
          "linear-gradient(var(--highlight), var(--highlight))",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left center",
        backgroundSize: on ? "100% 0.85em" : "0% 0.85em",
        transition: reduce
          ? "none"
          : "background-size 0.55s cubic-bezier(0.22, 1, 0.36, 1)",
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        borderRadius: "2px",
        padding: "0 0.05em",
      }}
    >
      {children}
    </span>
  );
}
