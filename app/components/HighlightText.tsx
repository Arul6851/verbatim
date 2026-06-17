"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * The signature beat: an amber highlighter swipes left-to-right across text
 * when `active`. Color == proof. Transform-only (scaleX) so it never thrashes
 * layout; reduced-motion users just see the final highlighted state.
 */
export function HighlightText({
  children,
  active,
}: {
  children: ReactNode;
  active: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <span className="relative isolate inline">
      <motion.span
        aria-hidden
        className="absolute -inset-x-1 inset-y-[0.05em] -z-10 origin-left rounded-[2px] bg-highlight"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: active ? 1 : 0 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
        }
      />
      {children}
    </span>
  );
}
