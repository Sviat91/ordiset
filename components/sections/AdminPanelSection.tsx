"use client";

import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import PhoneFrame from "@/components/PhoneFrame";
import DemoStage from "@/components/DemoStage";
import StableTextBlock from "@/components/StableTextBlock";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";

export default function AdminPanelSection() {
  const { dict: d } = useLocale();
  const dict = d.admin;
  return (
    <StackSection id="admin" z={3}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={`${styles.growFull} ${styles.desktopOnly}`}>
          <WindowChrome chrome={false}>
            <DemoStage
              src="/demo-app/index.html"
              title={dict.demoTitle}
              // Not display text — a DOM text matcher against the embedded
              // (out-of-scope) demo-widget iframe. Translating it breaks the
              // admin demo auto-click. Keep hardcoded English. See D8.
              autoClickText="View admin demo"
            />
          </WindowChrome>
        </div>
        <div className={styles.mobileOnly}>
          <div className={styles.narrowOnly}>
            <StableTextBlock>
              {(t) => (
                <>
                  <p className={styles.eyebrow}>{t.admin.eyebrow}</p>
                  <h2 className={styles.title}>{t.admin.title}</h2>
                </>
              )}
            </StableTextBlock>
          </div>
          <PhoneFrame label={dict.phoneLabel}>
            <DemoStage
              src="/demo-app/index.html"
              title={dict.demoTitleMobile}
              // Not display text — a DOM text matcher against the embedded
              // (out-of-scope) demo-widget iframe. Translating it breaks the
              // admin demo auto-click. Keep hardcoded English. See D8.
              autoClickText="View admin demo"
              fixedViewport={{ width: 390, height: 844 }}
            />
          </PhoneFrame>
        </div>
      </div>
    </StackSection>
  );
}
