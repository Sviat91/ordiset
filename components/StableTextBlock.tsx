"use client";

import { useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { DICTIONARIES } from "@/lib/dictionaries-client";
import { LOCALES, type Dictionary } from "@/lib/locales";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./StableTextBlock.module.css";

/** Reserves the height of the tallest locale variant of the same text, so a
 *  sibling visual block's share of the layout budget stops depending on
 *  which language is showing — and cross-fades between variants on switch
 *  instead of cutting instantly. All three variants share one CSS Grid
 *  cell: the row auto-sizes to the tallest item sharing it even though they
 *  overlap, so the reservation is native CSS, not measured (same technique
 *  as StableLabel, here applied to a wrapping block instead of a single
 *  line). Font sizing is never touched. */
export default function StableTextBlock({
  children,
}: {
  children: (dict: Dictionary) => ReactNode;
}) {
  const { locale } = useLocale();
  // Ghosts are client-only: the server HTML for /uk must contain only
  // Ukrainian copy (hreflang/canonical point at single-language docs).
  const [ghosts, setGhosts] = useState(false);
  useLayoutEffect(() => {
    // Runs before paint, so mounting the ghosts lands in the same pre-paint
    // flush as the rest of hydration — no visible jump.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot client-only mount, not a measurement loop.
    setGhosts(true);
  }, []);

  return (
    <div className={styles.wrap}>
      {LOCALES.map((l) => {
        const current = l === locale;
        if (!current && !ghosts) return null;
        // Stable key + same element type: a locale switch only swaps
        // className/aria-hidden on already-mounted nodes, never remounts them.
        return (
          <div
            key={l}
            lang={l}
            className={current ? styles.current : styles.ghost}
            aria-hidden={current ? undefined : true}
          >
            {children(DICTIONARIES[l])}
          </div>
        );
      })}
    </div>
  );
}
