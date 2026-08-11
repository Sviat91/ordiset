"use client";

import { useRef, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import styles from "./PinnedSection.module.css";

type PinnedSectionProps = {
  id: string;
  children: ReactNode;
  className?: string;
};

function subscribeToMobileQuery(callback: () => void) {
  const mediaQuery = window.matchMedia("(max-width: 768px)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getIsMobileSnapshot() {
  return window.matchMedia("(max-width: 768px)").matches;
}

function getIsMobileServerSnapshot() {
  return false;
}

export default function PinnedSection({
  id,
  children,
  className,
}: PinnedSectionProps) {
  const trackRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useSyncExternalStore(
    subscribeToMobileQuery,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end start"],
  });
  const exitOpacity = useTransform(scrollYProgress, [0.5, 0.85], [1, 0]);
  const exitScale = useTransform(scrollYProgress, [0.5, 0.85], [1, 0.94]);

  if (prefersReducedMotion || isMobile) {
    return (
      <section id={id} ref={trackRef} className={styles.track}>
        <div className={`${styles.stage} ${className ?? ""}`}>
          {children}
        </div>
      </section>
    );
  }

  // Settle-in (opacity/y via whileInView) and hand-off (opacity/scale via
  // scroll-linked motion values in `style`) are split across two nested
  // motion.divs — both target `opacity`/`transform`, and combining them on a
  // single element causes the whileInView-driven opacity to get stuck at
  // its initial value (confirmed with the plan's original single-div
  // version: the DOM never advances past `opacity: 0`).
  return (
    <section id={id} ref={trackRef} className={styles.track}>
      <motion.div
        className={`${styles.stage} ${className ?? ""}`}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div
          className={styles.exit}
          style={{ opacity: exitOpacity, scale: exitScale }}
        >
          {children}
        </motion.div>
      </motion.div>
    </section>
  );
}
