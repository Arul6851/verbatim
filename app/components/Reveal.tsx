"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Fade + slide-up on scroll-in. Transform/opacity only. Reduced-motion is
 * handled globally (globals.css zeroes durations), and `once` avoids re-firing.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
