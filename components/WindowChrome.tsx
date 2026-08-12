import Placeholder from "./Placeholder";
import styles from "./WindowChrome.module.css";
import type { ReactNode } from "react";

type WindowChromeProps = {
  label?: string;
  chip?: string;
  children?: ReactNode;
};

export default function WindowChrome({
  label = "Preview coming soon",
  chip,
  children,
}: WindowChromeProps) {
  return (
    <div className={styles.window}>
      <div className={styles.titlebar}>
        <div className={styles.dots}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
        {chip && <div className={styles.address}>{chip}</div>}
      </div>
      <div className={styles.body}>
        {children ?? <Placeholder label={label} />}
      </div>
    </div>
  );
}
