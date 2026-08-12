import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import styles from "./sections.module.css";
import heroStyles from "./Hero.module.css";

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
            reminders and client history included. No marketplace, no shared
            traffic. Just your business, running on infrastructure built for
            it.
          </p>
          <div className={heroStyles.actions}>
            <a href="#contact" className={heroStyles.primary}>
              Get in touch
            </a>
            <a href="#mobile" className={heroStyles.secondary}>
              See how it works
            </a>
          </div>
          <div className={styles.grow}>
            <WindowChrome />
          </div>
        </div>
      </div>
    </StackSection>
  );
}
