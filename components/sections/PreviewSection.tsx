import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import PhoneFrame from "@/components/PhoneFrame";
import DemoStage from "@/components/DemoStage";
import styles from "./sections.module.css";

export default function PreviewSection() {
  return (
    <StackSection id="preview" z={2}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={`${styles.growFull} ${styles.desktopOnly}`}>
          <WindowChrome chrome={false}>
            <DemoStage
              src="/demo-app/index.html"
              title="Ordiset live demo"
              reloadOnStorageKey="ordiset-demo-brand"
            />
          </WindowChrome>
        </div>
        <div className={styles.mobileOnly}>
          <PhoneFrame label="Live demo preview — coming soon">
            <DemoStage
              src="/demo-app/index.html"
              title="Ordiset live demo (preview, mobile)"
              reloadOnStorageKey="ordiset-demo-brand"
              fixedViewport={{ width: 390, height: 844 }}
            />
          </PhoneFrame>
        </div>
      </div>
    </StackSection>
  );
}
