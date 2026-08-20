import StackSection from "@/components/StackSection";
import WindowChrome from "@/components/WindowChrome";
import DemoStage from "@/components/DemoStage";
import styles from "./sections.module.css";

export default function PreviewSection() {
  return (
    <StackSection id="preview" z={2}>
      <div className={`${styles.containerWide} ${styles.fill}`}>
        <div className={styles.growFull}>
          <WindowChrome chrome={false}>
            <DemoStage src="/demo-app/index.html" title="Ordiset live demo" />
          </WindowChrome>
        </div>
      </div>
    </StackSection>
  );
}
