import Image from "next/image";
import StackSection from "@/components/StackSection";
import styles from "./sections.module.css";
import notifStyles from "./NotificationsSection.module.css";

export default function NotificationsSection() {
  return (
    <StackSection id="notifications" z={6}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={styles.stack}>
          <p className={styles.eyebrow}>Notifications</p>
          <h2 className={styles.title}>Every notification, fully configurable</h2>
          <p className={styles.body}>
            Turn on email, SMS or Telegram reminders from one settings
            panel — clients who book through your bot are notified there
            automatically. SMS setup takes just a few minutes, with
            clear step-by-step instructions included.
          </p>
          <div className={styles.grow} style={{ marginTop: "clamp(16px, 2vw, 28px)" }}>
            <div className={notifStyles.showcase}>
              <div className={`${notifStyles.shot} ${notifStyles.shotLeft}`}>
                <Image
                  src="/demo-shots/admin-sms.png"
                  alt="Ordiset admin — SMS provider configuration"
                  fill
                  sizes="360px"
                  className={notifStyles.shotImg}
                />
              </div>
              <div className={`${notifStyles.shot} ${notifStyles.shotCenter}`}>
                <Image
                  src="/demo-shots/admin-notifications.png"
                  alt="Ordiset admin — email and Telegram notification settings"
                  fill
                  sizes="380px"
                  className={notifStyles.shotImg}
                  priority
                />
              </div>
              <div className={`${notifStyles.shot} ${notifStyles.shotRight}`}>
                <Image
                  src="/demo-shots/admin-templates.png"
                  alt="Ordiset admin — reminder message templates"
                  fill
                  sizes="360px"
                  className={notifStyles.shotImg}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </StackSection>
  );
}
