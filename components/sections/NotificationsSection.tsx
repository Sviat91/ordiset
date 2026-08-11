import PinnedSection from "@/components/PinnedSection";
import PhoneFrame from "@/components/PhoneFrame";
import styles from "./sections.module.css";

export default function NotificationsSection() {
  return (
    <PinnedSection id="notifications">
      <div className={`${styles.container} ${styles.split}`}>
        <div>
          <p className={styles.eyebrow}>Reminders</p>
          <h2 className={styles.title}>
            Confirmations that reach clients where they already are
          </h2>
          <p className={styles.body}>
            Automatic confirmations, reminders and rescheduling links
            delivered through the booking bot — fewer no-shows, fewer phone
            calls, no manual follow-up.
          </p>
        </div>
        <PhoneFrame label="Booking bot notifications — preview coming soon" />
      </div>
    </PinnedSection>
  );
}
