import Image from "next/image";
import StackSection from "@/components/StackSection";
import PhoneFrame from "@/components/PhoneFrame";
import styles from "./sections.module.css";
import bookingStyles from "./BookingSiteSection.module.css";

export default function BookingSiteSection() {
  return (
    <StackSection id="booking-site" z={5}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={styles.stack}>
          <p className={styles.eyebrow}>Your booking site</p>
          <h2 className={styles.title}>A site your clients recognize</h2>
          <p className={styles.body} style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>
            Every business gets a dedicated booking site on its own domain
            or subdomain — your name, your palette, your services. Ordiset
            stays invisible behind it. A Telegram booking bot ships with
            every site too — just connect it and start taking bookings
            straight from chat.
          </p>
          <div className={styles.grow} style={{ marginTop: "clamp(16px, 2vw, 28px)" }}>
            <div className={bookingStyles.showcase}>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot1}`}>
                <PhoneFrame label="Aura Massage & Relax — specialist selection">
                  <Image
                    src="/demo-shots/aura-specialists-mobile.png"
                    alt="Aura Massage & Relax mobile booking site — specialist selection"
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot2}`}>
                <PhoneFrame label="Blush Nail Studio — specialist selection">
                  <Image
                    src="/demo-shots/blush-specialists-mobile.png"
                    alt="Blush Nail Studio mobile booking site — specialist selection"
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot3}`}>
                <PhoneFrame label="Loom & Blade — specialist selection">
                  <Image
                    src="/demo-shots/loom-specialists-mobile.png"
                    alt="Loom & Blade mobile booking site — specialist selection"
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot4}`}>
                <PhoneFrame label="Loom & Blade — book a visit">
                  <Image
                    src="/demo-shots/loom-booking-mobile.png"
                    alt="Loom & Blade mobile booking site — book a visit"
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot5}`}>
                <PhoneFrame label="Aura Massage & Relax — book a visit">
                  <Image
                    src="/demo-shots/aura-booking-mobile.png"
                    alt="Aura Massage & Relax mobile booking site — book a visit"
                    fill
                    sizes="164px"
                    style={{ objectFit: "cover" }}
                  />
                </PhoneFrame>
              </div>
              <div className={`${bookingStyles.phoneShot} ${bookingStyles.shot6}`}>
                <PhoneFrame label="Booking bot conversation on Telegram">
                  <Image
                    src="/demo-shots/telegram-bot.png"
                    alt="Telegram booking bot conversation with appointment reminders"
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
