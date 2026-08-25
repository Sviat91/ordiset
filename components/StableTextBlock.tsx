"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DICTIONARIES } from "@/lib/dictionaries-client";
import { LOCALES, type Dictionary } from "@/lib/locales";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./StableTextBlock.module.css";

/** Reserves the height of the tallest locale variant of the same text, so
 *  a sibling visual block's share of the layout budget stops depending on
 *  which language is showing. Font sizing is never touched. */
export default function StableTextBlock({
  children,
}: {
  children: (dict: Dictionary) => ReactNode;
}) {
  const { locale } = useLocale();
  const wrapRef = useRef<HTMLDivElement>(null);
  // Ghosts are client-only: the server HTML for /uk must contain only
  // Ukrainian copy (hreflang/canonical point at single-language docs).
  const [ghosts, setGhosts] = useState(false);
  const [minHeight, setMinHeight] = useState<number>();

  useLayoutEffect(() => {
    if (!ghosts) {
      // Layout effects run before paint and React re-renders synchronously
      // from them, so mounting the ghosts and applying the reservation
      // below both land in this same pre-paint flush — no visible jump.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate two-phase mount: ghosts must exist in the DOM before their height can be measured, so this synchronous setState is the trigger for that second pass, not a mistake.
      setGhosts(true);
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const variants = Array.from(el.children) as HTMLElement[];
    const measure = () => {
      // offsetHeight, not getBoundingClientRect(): StackSection applies a
      // scroll-driven `scale` to the whole section, which would shrink
      // every rect-based reading.
      const tallest = variants.reduce((max, v) => Math.max(max, v.offsetHeight), 0);
      setMinHeight((prev) => (prev === tallest ? prev : tallest));
    };
    measure();
    // Observing the variants (not the container) covers width changes,
    // the next/font swap-in, zoom and user font settings in one path.
    const ro = new ResizeObserver(measure);
    variants.forEach((v) => ro.observe(v));
    return () => ro.disconnect();
  }, [ghosts]);

  return (
    <div ref={wrapRef} className={styles.wrap} style={{ minHeight }}>
      {LOCALES.map((l) => {
        const current = l === locale;
        if (!current && !ghosts) return null;
        // Stable key + same element type: a locale switch only swaps
        // attributes on these three nodes, it never remounts them.
        return (
          <div
            key={l}
            lang={l}
            className={current ? undefined : styles.ghost}
            aria-hidden={current ? undefined : true}
          >
            {children(DICTIONARIES[l])}
          </div>
        );
      })}
    </div>
  );
}
