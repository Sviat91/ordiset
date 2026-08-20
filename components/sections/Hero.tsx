"use client";

import Image from "next/image";
import StackSection from "@/components/StackSection";
import { getSectionTop } from "@/lib/sections";
import styles from "./sections.module.css";
import heroStyles from "./Hero.module.css";

function scrollToSection(id: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({
      top: getSectionTop(id),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };
}

export default function Hero() {
  return (
    <StackSection id="overview" z={1}>
      <div
        className={`${heroStyles.root} ${styles.containerWide} ${styles.fill}`}
      >
        <span className={heroStyles.glow} aria-hidden />
        <div className={`${heroStyles.content} ${styles.stack}`}>
          <p className={styles.eyebrow}>White-label booking infrastructure</p>
          <h1 className={styles.title}>Your booking system. Your brand.</h1>
          <p className={`${styles.body} ${heroStyles.lede}`}>
            Ordiset gives salons, barbershops, studios, clinics and
            independent pros their own branded booking site — scheduling,
            reminders and client history included. Every color, photo and
            detail is yours to customize from one admin panel, and changes go
            live instantly. No marketplace, no shared traffic — just your
            business, looking exactly like your business.
          </p>
          <div className={heroStyles.actions}>
            <a
              href="#contact"
              className={heroStyles.primary}
              onClick={scrollToSection("contact")}
            >
              Get in touch
            </a>
            <a
              href="#preview"
              className={heroStyles.secondary}
              onClick={scrollToSection("preview")}
            >
              See how it works
            </a>
          </div>
          <div className={styles.grow}>
            <div className={heroStyles.showcase}>
              <div className={`${heroStyles.shot} ${heroStyles.shotLeft}`}>
                <Image
                  src="/demo-shots/about.png"
                  alt="Ordiset demo — About page, light theme"
                  fill
                  sizes="300px"
                  className={heroStyles.shotImg}
                />
              </div>
              <div className={`${heroStyles.shot} ${heroStyles.shotCenter}`}>
                <Image
                  src="/demo-shots/home.png"
                  alt="Ordiset demo — specialist selection"
                  fill
                  sizes="320px"
                  className={heroStyles.shotImg}
                  priority
                />
              </div>
              <div className={`${heroStyles.shot} ${heroStyles.shotRight}`}>
                <Image
                  src="/demo-shots/booking.png"
                  alt="Ordiset demo — booking calendar"
                  fill
                  sizes="300px"
                  className={heroStyles.shotImg}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StackSection>
  );
}
