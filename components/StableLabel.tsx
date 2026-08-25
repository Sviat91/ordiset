"use client";

import { DICTIONARIES } from "@/lib/dictionaries-client";
import { LOCALES, type Dictionary, type Locale } from "@/lib/locales";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./StableLabel.module.css";

/** Reserves the width of the widest locale variant of a short UI label, so
 *  buttons and nav links stop resizing — and stop shifting their
 *  neighbours — when the language changes. Pure CSS (all variants stacked
 *  in one grid cell): correct in the first paint, no measurement, no
 *  post-hydration reflow. The host element must be block-level and
 *  auto-width, which every call site already is. */
export default function StableLabel({
  pick,
}: {
  // `locale` is passed too because the language chip's labels come from
  // LOCALE_LABELS rather than from the dictionaries.
  pick: (dict: Dictionary, locale: Locale) => string;
}) {
  const { locale } = useLocale();
  return (
    <span className={styles.stack}>
      {LOCALES.map((l) => {
        const current = l === locale;
        // Stable key + same element type: a switch only swaps className /
        // aria-hidden on three already-mounted nodes, never remounts them.
        return (
          <span
            key={l}
            lang={l}
            className={current ? styles.current : styles.ghost}
            aria-hidden={current ? undefined : true}
          >
            {pick(DICTIONARIES[l], l)}
          </span>
        );
      })}
    </span>
  );
}
