"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useMotionValueEvent } from "framer-motion";
import { getSectionTops, getSectionTop } from "@/lib/sections";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#preview", label: "Preview" },
  { href: "#admin", label: "Admin panel" },
  { href: "#mobile", label: "Mobile" },
  { href: "#booking-site", label: "Booking site" },
  { href: "#notifications", label: "Notifications" },
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const linksRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Map<string, HTMLAnchorElement>>(new Map());
  const prefersReducedMotion = useReducedMotion();
  const suppressObserverRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);
  const { scrollY } = useScroll();

  useEffect(() => {
    const setInitialActiveId = () => {
      const id = computeActiveId();
      if (id) setActiveId(id);
    };
    setInitialActiveId();
  }, []);

  useMotionValueEvent(scrollY, "change", () => {
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
  }, [activeId]);

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
              alt="Ordiset"
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
                {link.label}
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

        <a href="#contact" className={styles.cta} onClick={scrollToId("contact")}>
          Contact
        </a>
      </div>
    </header>
  );
}
