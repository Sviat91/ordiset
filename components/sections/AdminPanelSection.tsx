import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import PhoneFrame from "@/components/PhoneFrame";
import DemoStage from "@/components/DemoStage";
import styles from "./sections.module.css";

export default function AdminPanelSection() {
  return (
    <StackSection id="admin" z={3}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={`${styles.growFull} ${styles.desktopOnly}`}>
          <WindowChrome chrome={false}>
            <DemoStage
              src="/demo-app/index.html"
              title="Ordiset admin panel demo"
              autoClickText="View admin demo"
            />
          </WindowChrome>
        </div>
        <div className={styles.mobileOnly}>
          <PhoneFrame label="Admin panel preview — coming soon">
            <DemoStage
              src="/demo-app/index.html"
              title="Ordiset admin panel demo (mobile)"
              autoClickText="View admin demo"
              fixedViewport={{ width: 390, height: 844 }}
            />
          </PhoneFrame>
        </div>
      </div>
    </StackSection>
  );
}
