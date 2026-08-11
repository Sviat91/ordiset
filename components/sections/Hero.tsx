import PinnedSection from "@/components/PinnedSection";
import WindowChrome from "@/components/WindowChrome";
import styles from "./sections.module.css";
import heroStyles from "./Hero.module.css";

export default function Hero() {
  return (
    <PinnedSection id="overview">
      <div className={`${styles.container} ${styles.stack}`}>
        <p className={styles.eyebrow}>White-label booking infrastructure</p>
        <h1 className={styles.title}>Your booking system. Your brand.</h1>
        <p className={styles.body}>
          Ordiset gives salons, barbershops, studios, clinics and independent
          pros their own branded booking site — scheduling, reminders and
          client history included. No marketplace, no shared traffic. Just
          your business, running on infrastructure built for it.
        </p>
        <div className={heroStyles.actions}>
          <a href="#contact" className={heroStyles.primary}>
            Get in touch
          </a>
          <a href="#mobile" className={heroStyles.secondary}>
            See how it works
          </a>
        </div>
        <div className={heroStyles.visual}>
          <WindowChrome label="Live demo — coming soon" />
        </div>
      </div>
    </PinnedSection>
  );
}
