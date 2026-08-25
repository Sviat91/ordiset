"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  const rootRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);

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
    <details
      className={styles.root}
      ref={rootRef}
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary ref={summaryRef} className={styles.summary} aria-label={dict.nav.languageLabel}>
        <StableLabel pick={(_, l) => LOCALE_LABELS[l]} />
        <span className={styles.chevron} aria-hidden>
          ⌄
        </span>
      </summary>
      <div className={styles.menu}>
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
      </div>
    </details>
  );
}
