"use client";

import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import PhoneFrame from "@/components/PhoneFrame";
import DemoStage from "@/components/DemoStage";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";

export default function PreviewSection() {
  const { dict: d } = useLocale();
  const dict = d.preview;
  return (
    <StackSection id="preview" z={2}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={`${styles.growFull} ${styles.desktopOnly}`}>
          <WindowChrome chrome={false}>
            <DemoStage
              src="/demo-app/index.html"
              title={dict.demoTitle}
              reloadOnStorageKey="ordiset-demo-brand"
            />
          </WindowChrome>
        </div>
        <div className={styles.mobileOnly}>
          <PhoneFrame label={dict.phoneLabel}>
            <DemoStage
              src="/demo-app/index.html"
              title={dict.demoTitleMobile}
              reloadOnStorageKey="ordiset-demo-brand"
              fixedViewport={{ width: 390, height: 844 }}
            />
          </PhoneFrame>
        </div>
      </div>
    </StackSection>
  );
}
