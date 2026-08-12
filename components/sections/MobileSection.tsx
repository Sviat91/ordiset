import StackSection from "@/components/StackSection";
import PhoneFrame from "@/components/PhoneFrame";
import styles from "./sections.module.css";

export default function MobileSection() {
  return (
    <StackSection id="mobile" z={3}>
      <div
        className={`${styles.container} ${styles.split} ${styles.fill} ${styles.centerY}`}
      >
        <div>
          <p className={styles.eyebrow}>Mobile</p>
          <h2 className={styles.title}>Booking that feels native on a phone</h2>
          <p className={styles.body}>
            Most of your clients book from a phone at the end of the day. The
            Ordiset booking flow is mobile-first — pick a service, pick a
            time, confirm. No app to install, no account to create.
          </p>
        </div>
        <PhoneFrame label="Mobile booking flow — preview coming soon" />
      </div>
    </StackSection>
  );
}
