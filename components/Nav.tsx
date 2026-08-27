"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from "framer-motion";
import { getSectionTops, getSectionTop } from "@/lib/sections";
import type { Dictionary } from "@/lib/locales";
import { useLocale } from "@/components/LocaleProvider";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import StableLabel from "@/components/StableLabel";
import styles from "./Nav.module.css";

const LINKS: { href: string; key: keyof Dictionary["nav"] }[] = [
  { href: "#overview", key: "overview" },
  { href: "#preview", key: "preview" },
  { href: "#admin", key: "admin" },
  { href: "#mobile", key: "mobile" },
  { href: "#booking-site", key: "bookingSite" },
  { href: "#notifications", key: "notifications" },
];

function computeActiveId(): string | null {
  const line = window.scrollY + window.innerHeight / 2;
  let activeId: string | null = null;
  for (const { id, top } of getSectionTops()) {
    if (top > line) break;
    activeId = id;
  }
  return activeId;
}

// No hamburger/drawer in this pass — below 768px the link list is hidden
// and only the logo + CTA remain visible.
export default function Nav() {
  const { locale, dict: d } = useLocale();
  const dict = d.nav;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const linksRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const prefersReducedMotion = useReducedMotion();
  const suppressObserverRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const { scrollY } = useScroll();
  // Mirrors `@media (max-width: 1023px) { .links { display: none } }` in
  // Nav.module.css — update both together.
  const linksVisibleRef = useRef<MediaQueryList | null>(null);

  useEffect(() => {
    const setInitialActiveId = () => {
      const id = computeActiveId();
      if (id) setActiveId(id);
    };
    setInitialActiveId();
  }, []);

  useEffect(() => {
    linksVisibleRef.current = window.matchMedia("(min-width: 1024px)");
  }, []);

  useMotionValueEvent(scrollY, "change", () => {
    // Below 1024px .links is display:none and the indicator has nothing to
    // attach to, so this whole path is invisible — but computeActiveId ->
    // getSectionTops() reads offsetHeight on all seven sections *every
    // scroll frame*, while framer-motion writes an inline transform to
    // those same sections every frame. That read/write interleave is a
    // forced-layout thrash loop and is a prime suspect for the "heavy,
    // rubbery" mobile scroll. matchMedia().matches is live and costs no
    // layout (unlike offsetParent). M7/D9.
    if (linksVisibleRef.current && !linksVisibleRef.current.matches) return;
    if (suppressObserverRef.current) return;
    const id = computeActiveId();
    if (id) setActiveId(id);
  });

  useEffect(() => {
    const onScrollEnd = () => {
      if (scrollTimeoutRef.current !== null) window.clearTimeout(scrollTimeoutRef.current);
      suppressObserverRef.current = false;
    };
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      window.removeEventListener("scrollend", onScrollEnd);
      if (scrollTimeoutRef.current !== null) window.clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const updateIndicator = () => {
      const id = activeId;
      const isNavLink = LINKS.some((link) => link.href === `#${id}`);
      const linksEl = linksRef.current;
      const activeLink = id ? linkRefs.current.get(id) : undefined;

      if (!isNavLink || !linksEl || !activeLink) {
        setIndicator(null);
        return;
      }

      const linksRect = linksEl.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setIndicator({
        left: linkRect.left - linksRect.left,
        width: linkRect.width,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
    // `locale` is not read in the effect body, but label widths change with
    // the locale, so the measurement must be redone on switch too.
  }, [activeId, locale]);

  const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (scrollTimeoutRef.current !== null) window.clearTimeout(scrollTimeoutRef.current);
    suppressObserverRef.current = true;
    setActiveId(id);
    window.scrollTo({ top: getSectionTop(id), behavior: prefersReducedMotion ? "auto" : "smooth" });
    scrollTimeoutRef.current = window.setTimeout(() => {
      suppressObserverRef.current = false;
    }, 1000);
  };

  return (
    <header className={styles.nav}>
      <div className={styles.row}>
        <a href="#overview" className={styles.brand} onClick={scrollToId("overview")}>
          <span className={styles.mark}>
            <Image
              src="/ordiset-logo.png"
              alt={dict.logoAlt}
              width={2400}
              height={1309}
              sizes="120px"
              priority
              className={styles.markImg}
            />
          </span>
          <span className={styles.wordmark}>ORDISET</span>
        </a>

        <nav className={styles.links} ref={linksRef}>
          {LINKS.map((link) => {
            const id = link.href.slice(1);
            return (
              <a
                key={link.href}
                href={link.href}
                className={styles.link}
                ref={(el) => {
                  if (el) linkRefs.current.set(id, el);
                  else linkRefs.current.delete(id);
                }}
                onClick={scrollToId(id)}
              >
                <StableLabel pick={(t) => t.nav[link.key]} />
              </a>
            );
          })}
          {indicator && (
            <motion.span
              className={styles.indicator}
              animate={{ left: indicator.left, width: indicator.width }}
              transition={prefersReducedMotion ? { duration: 0 } : undefined}
            />
          )}
        </nav>

        <LanguageSwitcher />

        <a href="#contact" className={styles.cta} onClick={scrollToId("contact")}>
          <StableLabel pick={(t) => t.nav.contact} />
        </a>
      </div>
    </header>
  );
}
