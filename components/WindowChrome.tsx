import Placeholder from "./Placeholder";
import styles from "./WindowChrome.module.css";
import type { ReactNode } from "react";

type WindowChromeProps = {
  label?: string;
  chip?: string;
  /** Set false to drop the dots/address titlebar for a full-bleed frame. */
  chrome?: boolean;
  children?: ReactNode;
};

export default function WindowChrome({
  label = "Preview coming soon",
  chip,
  chrome = true,
  children,
}: WindowChromeProps) {
  return (
    <div className={styles.window}>
      {chrome && (
        <div className={styles.titlebar}>
          <div className={styles.dots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </div>
          {chip && <div className={styles.address}>{chip}</div>}
        </div>
      )}
      <div className={`${styles.body} ${!chrome ? styles.bodyFull : ""}`}>
        {children ?? <Placeholder label={label} />}
      </div>
    </div>
  );
}
