import Image from "next/image";
import StackSection from "@/components/StackSection";
import PhoneFrame from "@/components/PhoneFrame";
import styles from "./sections.module.css";

export default function NotificationsSection() {
  return (
    <StackSection id="notifications" z={6}>
      <div
        className={`${styles.container} ${styles.split} ${styles.fill} ${styles.centerY}`}
      >
        <div>
          <p className={styles.eyebrow}>Reminders</p>
          <h2 className={styles.title}>
            Confirmations that reach clients where they already are
          </h2>
          <p className={styles.body}>
            Automatic confirmations, reminders and rescheduling links
            delivered straight to Telegram through the booking bot — plus SMS
            for clients who don&apos;t use it. Fewer no-shows, fewer phone
            calls, no manual follow-up.
          </p>
        </div>
        <PhoneFrame label="Booking bot notifications — preview coming soon">
          <Image
            src="/demo-shots/telegram-bot.png"
            alt="Telegram booking bot conversation with appointment reminders"
            fill
            sizes="360px"
            style={{ objectFit: "cover" }}
          />
        </PhoneFrame>
      </div>
    </StackSection>
  );
}
