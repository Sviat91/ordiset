import Placeholder from "./Placeholder";
import styles from "./WindowChrome.module.css";
import type { ReactNode } from "react";

type WindowChromeProps = {
  label: string;
  chip?: string;
  children?: ReactNode;
};

export default function WindowChrome({
  label,
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
        <div className={styles.address}>{chip ?? "app.ordiset.com"}</div>
      </div>
      <div className={styles.body}>
        {children ?? <Placeholder label={label} />}
      </div>
    </div>
  );
}
