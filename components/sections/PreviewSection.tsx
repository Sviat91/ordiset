"use client";

import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import DemoStage from "@/components/DemoStage";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";

export default function PreviewSection() {
  const { dict: d } = useLocale();
  const dict = d.preview;
  return (
    <StackSection id="preview" z={2} hideOnNarrow>
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
      </div>
    </StackSection>
  );
}
