import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import styles from "./sections.module.css";

export default function CustomizeSection() {
  return (
    <StackSection id="customize" z={2}>
      <div
        className={`${styles.containerWide} ${styles.stack} ${styles.fill}`}
      >
        <p className={styles.eyebrow}>Customization</p>
        <h2 className={styles.title}>Full control over how it looks</h2>
        <p className={styles.body}>
          Colors, logo, services, staff, working hours, deposits and
          cancellation rules — all editable from one admin panel. Every
          change goes live on your booking site instantly, and it stays your
          brand end to end.
        </p>
        <div className={styles.grow}>
          <WindowChrome />
        </div>
      </div>
    </StackSection>
  );
}
