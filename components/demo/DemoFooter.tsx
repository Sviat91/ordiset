import styles from "./DemoFooter.module.css";

export default function DemoFooter() {
  return (
    <footer className={styles.footer}>
      <span className={styles.link}>Privacy Policy</span>
      <span className={styles.sep}>·</span>
      <span className={styles.link}>Terms of Service</span>
      <span className={styles.sep}>·</span>
      <span className={styles.link}>Help Center</span>
      <span className={styles.divider}>|</span>
      <span>© 2026 Loom &amp; Blade. All rights reserved.</span>
    </footer>
  );
}
