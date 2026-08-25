"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/locales";
import { useLocale } from "@/components/LocaleProvider";
import StableLabel from "@/components/StableLabel";
import styles from "./LanguageSwitcher.module.css";

export default function LanguageSwitcher() {
  const { locale, dict, setLocale } = useLocale();
  const pathname = usePathname();
  const rest = pathname.replace(/^\/[^/]+/, "");
  const hrefFor = (l: Locale) => `/${l}${rest}`;

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        summaryRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <details open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary ref={summaryRef} className={styles.summary} aria-label={dict.nav.languageLabel}>
          <StableLabel pick={(_, l) => LOCALE_LABELS[l]} />
          <svg className={styles.chevron} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </summary>
      </details>
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.menu}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top right" }}
          >
            {LOCALES.filter((l) => l !== locale).map((l) => (
              <a
                key={l}
                href={hrefFor(l)}
                hrefLang={l}
                className={styles.item}
                onClick={(e) => {
                  e.preventDefault();
                  setOpen(false);
                  setLocale(l);
                }}
              >
                {LOCALE_LABELS[l]}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
