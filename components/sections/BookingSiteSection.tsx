import PinnedSection from "@/components/PinnedSection";
import PhoneFrame from "@/components/PhoneFrame";
import styles from "./sections.module.css";

export default function BookingSiteSection() {
  return (
    <PinnedSection id="booking-site">
      <div className={`${styles.container} ${styles.split} ${styles.visualFirst}`}>
        <div>
          <p className={styles.eyebrow}>Your booking site</p>
          <h2 className={styles.title}>A site your clients recognize</h2>
          <p className={styles.body}>
            Every business gets a dedicated booking site on its own domain
            or subdomain — your name, your palette, your services. Ordiset
            stays invisible behind it.
          </p>
        </div>
        <PhoneFrame label="Client booking site — preview coming soon" />
      </div>
    </PinnedSection>
  );
}
