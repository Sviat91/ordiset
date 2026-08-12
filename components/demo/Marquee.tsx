import type { ReactNode } from "react";
import styles from "./Marquee.module.css";

type MarqueeProps = {
  children: ReactNode;
  className?: string;
};

export default function Marquee({ children, className }: MarqueeProps) {
  return (
    <div className={`${styles.root} ${className ?? ""}`}>
      <div className={styles.track}>
        <div className={styles.group}>{children}</div>
        <div className={styles.group} aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
