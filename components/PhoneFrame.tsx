import Placeholder from "./Placeholder";
import styles from "./PhoneFrame.module.css";
import type { ReactNode } from "react";

type PhoneFrameProps = {
  label: string;
  children?: ReactNode;
};

export default function PhoneFrame({ label, children }: PhoneFrameProps) {
  return (
    <div className={styles.phone}>
      <div className={styles.screen}>
        <div className={styles.island} />
        {children ?? <Placeholder label={label} />}
      </div>
    </div>
  );
}
