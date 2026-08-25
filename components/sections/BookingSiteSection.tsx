"use client";

import Image from "next/image";
import StackSection from "@/components/StackSection";
import PhoneFrame from "@/components/PhoneFrame";
import StableTextBlock from "@/components/StableTextBlock";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";
import bookingStyles from "./BookingSiteSection.module.css";

export default function BookingSiteSection() {
  const { dict: d } = useLocale();
  const dict = d.bookingSite;
  return (
    <StackSection id="booking-site" z={5}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={styles.stack}>
          <StableTextBlock>
            {(t) => (
              <>
                <p className={styles.eyebrow}>{t.bookingSite.eyebrow}</p>
                <h2 className={styles.title}>{t.bookingSite.title}</h2>
                <p className={styles.body} style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>
                  {t.bookingSite.body}
                </p>
              </>
            )}
          </StableTextBlock>
          <div className={styles.grow} style={{ marginTop: "clamp(16px, 2vw, 28px)" }}>
            <div className={bookingStyles.showcase}>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot1}`}>
                <PhoneFrame label={dict.auraSpecialistsLabel}>
                  <Image
                    src="/demo-shots/aura-specialists-mobile.png"
                    alt={dict.auraSpecialistsAlt}
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot2}`}>
                <PhoneFrame label={dict.blushSpecialistsLabel}>
                  <Image
                    src="/demo-shots/blush-specialists-mobile.png"
                    alt={dict.blushSpecialistsAlt}
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot3}`}>
                <PhoneFrame label={dict.loomSpecialistsLabel}>
                  <Image
                    src="/demo-shots/loom-specialists-mobile.png"
                    alt={dict.loomSpecialistsAlt}
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot4}`}>
                <PhoneFrame label={dict.loomBookingLabel}>
                  <Image
                    src="/demo-shots/loom-booking-mobile.png"
                    alt={dict.loomBookingAlt}
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot5}`}>
                <PhoneFrame label={dict.auraBookingLabel}>
                  <Image
                    src="/demo-shots/aura-booking-mobile.png"
                    alt={dict.auraBookingAlt}
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot6}`}>
                <PhoneFrame label={dict.telegramLabel}>
                  <Image
                    src="/demo-shots/telegram-bot.png"
                    alt={dict.telegramAlt}
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StackSection>
  );
}
