"use client";

import Image from "next/image";
import StackSection from "@/components/StackSection";
import StableTextBlock from "@/components/StableTextBlock";
import { getSectionTop } from "@/lib/sections";
import { useLocale } from "@/components/LocaleProvider";
import StableLabel from "@/components/StableLabel";
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
  const { dict: d } = useLocale();
  const dict = d.hero;
  return (
    <StackSection id="overview" z={1}>
      <div
        className={`${heroStyles.root} ${styles.containerWide} ${styles.fill}`}
      >
        <span className={heroStyles.glow} aria-hidden />
        <div className={`${heroStyles.content} ${styles.stack}`}>
          <StableTextBlock>
            {(t) => (
              <>
                <p className={styles.eyebrow}>{t.hero.eyebrow}</p>
                <h1 className={styles.title}>{t.hero.title}</h1>
                <p className={`${styles.body} ${heroStyles.lede}`}>{t.hero.lede}</p>
              </>
            )}
          </StableTextBlock>
          <div className={heroStyles.actions}>
            <a
              href="#contact"
              className={heroStyles.primary}
              onClick={scrollToSection("contact")}
            >
              <StableLabel pick={(t) => t.hero.ctaPrimary} />
            </a>
            <a
              href="#preview"
              className={heroStyles.secondary}
              onClick={scrollToSection("preview")}
            >
              <StableLabel pick={(t) => t.hero.ctaSecondary} />
            </a>
          </div>
          <div className={styles.grow}>
            <div className={heroStyles.showcase}>
              <div className={`${heroStyles.shot} ${heroStyles.shotFarLeft}`}>
                <Image
                  src="/demo-shots/aura-specialists.png"
                  alt={dict.altAuraSpecialists}
                  fill
                  sizes="300px"
                  className={heroStyles.shotImg}
                />
              </div>
              <div className={`${heroStyles.shot} ${heroStyles.shotLeft}`}>
                <Image
                  src="/demo-shots/about.png"
                  alt={dict.altAbout}
                  fill
                  sizes="300px"
                  className={heroStyles.shotImg}
                />
              </div>
              <div className={`${heroStyles.shot} ${heroStyles.shotCenter}`}>
                <Image
                  src="/demo-shots/home.png"
                  alt={dict.altHome}
                  fill
                  sizes="320px"
                  className={heroStyles.shotImg}
                  priority
                />
              </div>
              <div className={`${heroStyles.shot} ${heroStyles.shotRight}`}>
                <Image
                  src="/demo-shots/booking.png"
                  alt={dict.altBooking}
                  fill
                  sizes="300px"
                  className={heroStyles.shotImg}
                />
              </div>
              <div className={`${heroStyles.shot} ${heroStyles.shotFarRight}`}>
                <Image
                  src="/demo-shots/blush-specialists.png"
                  alt={dict.altBlushSpecialists}
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
