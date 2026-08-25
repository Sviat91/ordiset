"use client";

import Image from "next/image";
import StackSection from "@/components/StackSection";
import StableTextBlock from "@/components/StableTextBlock";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";
import notifStyles from "./NotificationsSection.module.css";

export default function NotificationsSection() {
  const { dict: d } = useLocale();
  const dict = d.notifications;
  return (
    <StackSection id="notifications" z={6}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={styles.stack}>
          <StableTextBlock>
            {(t) => (
              <>
                <p className={styles.eyebrow}>{t.notifications.eyebrow}</p>
                <h2 className={styles.title}>{t.notifications.title}</h2>
                <p className={styles.body}>{t.notifications.body}</p>
              </>
            )}
          </StableTextBlock>
          <div className={styles.grow} style={{ marginTop: "clamp(16px, 2vw, 28px)" }}>
            <div className={notifStyles.showcase}>
              <div className={`${notifStyles.shot} ${notifStyles.shotLeft}`}>
                <Image
                  src="/demo-shots/admin-sms.png"
                  alt={dict.altSms}
                  fill
                  sizes="360px"
                  className={notifStyles.shotImg}
                />
              </div>
              <div className={`${notifStyles.shot} ${notifStyles.shotCenter}`}>
                <Image
                  src="/demo-shots/admin-notifications.png"
                  alt={dict.altNotifications}
                  fill
                  sizes="380px"
                  className={notifStyles.shotImg}
                  priority
                />
              </div>
              <div className={`${notifStyles.shot} ${notifStyles.shotRight}`}>
                <Image
                  src="/demo-shots/admin-templates.png"
                  alt={dict.altTemplates}
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
