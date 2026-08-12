"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import styles from "./StackSection.module.css";

type StackSectionProps = {
  id: string;
  /** Must ascend in the same order the sections are rendered in app/page.tsx. */
  z: number;
  children: ReactNode;
};

export default function StackSection({ id, z, children }: StackSectionProps) {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const scale = useTransform(scrollYProgress, [0.15, 1], [1, 0.96]);

  if (prefersReducedMotion) {
    return (
      <section id={id} className={styles.card} style={{ zIndex: z }}>
        {z > 1 && <span className={styles.seam} aria-hidden />}
        {children}
      </section>
    );
  }

  return (
    <motion.section
      id={id}
      ref={ref}
      className={styles.card}
      style={{ zIndex: z, scale }}
    >
      {z > 1 && <span className={styles.seam} aria-hidden />}
      {children}
    </motion.section>
  );
}
