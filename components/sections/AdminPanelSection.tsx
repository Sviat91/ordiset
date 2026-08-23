import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import DemoStage from "@/components/DemoStage";
import styles from "./sections.module.css";

export default function AdminPanelSection() {
  return (
    <StackSection id="admin" z={3}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={`${styles.growFull}`}>
          <WindowChrome chrome={false}>
            <DemoStage
              src="/demo-app/index.html"
              title="Ordiset admin panel demo"
              autoClickText="View admin demo"
            />
          </WindowChrome>
        </div>
      </div>
    </StackSection>
  );
}
