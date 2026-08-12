"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useDemo } from "./demoContext";
import { BRAND_LOGO } from "./data/images";
import styles from "./DemoTopBar.module.css";

type DemoTopBarProps = {
  showBrand?: boolean;
  showAccount?: boolean;
  showBack?: boolean;
};

const LOCALES = [
  { code: "en", label: "EN", enabled: true },
  { code: "pl", label: "PL", enabled: false },
];

export default function DemoTopBar({ showBrand, showAccount, showBack }: DemoTopBarProps) {
  const { state, dispatch } = useDemo();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLangOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [langOpen]);

  const theme = state.store?.theme ?? "light";

  return (
    <div className={styles.bar}>
      <div className={styles.left}>
        {showBack && (
          <button
            type="button"
            className={styles.backButton}
            aria-label="Back"
            onClick={() => dispatch({ type: "back" })}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {showBrand && (
          <div className={styles.brand}>
            {BRAND_LOGO.src ? (
              <Image
                src={BRAND_LOGO.src}
                alt={BRAND_LOGO.alt}
                width={28}
                height={28}
                className={styles.logoImg}
              />
            ) : (
              <span className={styles.logoMonogram} aria-hidden="true">
                L&B
              </span>
            )}
            <span className={styles.wordmark}>Loom &amp; Blade</span>
          </div>
        )}
      </div>

      <div className={styles.right}>
        <span className={`${styles.aboutTab} ${state.view.name === "about" ? styles.aboutActive : ""}`}>
          About Us
        </span>

        <div className={styles.lang} ref={langRef}>
          <button
            type="button"
            className={styles.langButton}
            aria-haspopup="listbox"
            aria-expanded={langOpen}
            onClick={() => setLangOpen((open) => !open)}
          >
            {state.locale.toUpperCase()} <span aria-hidden="true">⌄</span>
          </button>
          {langOpen && (
            <ul className={styles.langMenu} role="listbox">
              {LOCALES.map((locale) => (
                <li key={locale.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={state.locale === locale.code}
                    disabled={!locale.enabled}
                    className={styles.langOption}
                    onClick={() => {
                      dispatch({ type: "setLocale", locale: locale.code });
                      setLangOpen(false);
                    }}
                  >
                    {locale.label}
                    {!locale.enabled && <span className={styles.langSoon}>coming soon</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {showAccount && (
          <span className={styles.account} aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        )}

        <button
          type="button"
          className={styles.themeToggle}
          aria-pressed={theme === "dark"}
          aria-label="Switch theme"
          onClick={() => dispatch({ type: "toggleTheme" })}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2 16l6-14M9 16l6-14M16 16l6-14" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
