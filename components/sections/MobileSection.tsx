"use client";

import StackSection from "@/components/StackSection";
import PhoneFrame from "@/components/PhoneFrame";
import DemoStage from "@/components/DemoStage";
import StableTextBlock from "@/components/StableTextBlock";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";

export default function MobileSection() {
  const { dict: d } = useLocale();
  const dict = d.mobile;
  return (
    <StackSection id="mobile" z={4}>
      <div
        className={`${styles.container} ${styles.split} ${styles.fill} ${styles.centerY}`}
      >
        <StableTextBlock>
          {(t) => (
            <>
              <p className={styles.eyebrow}>{t.mobile.eyebrow}</p>
              <h2 className={styles.title}>{t.mobile.title}</h2>
              <p className={styles.body}>{t.mobile.body}</p>
            </>
          )}
        </StableTextBlock>
        <PhoneFrame label={dict.phoneLabel}>
          <DemoStage
            src="/demo-app/index.html"
            title={dict.demoTitle}
            fixedViewport={{ width: 390, height: 844 }}
          />
        </PhoneFrame>
      </div>
    </StackSection>
  );
}
