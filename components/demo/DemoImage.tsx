import Image from "next/image";
import type { ImageSlot } from "./data/images";
import styles from "./DemoImage.module.css";

type DemoImageProps = {
  slot: ImageSlot;
  sizes: string;
  shape?: "card" | "circle";
  className?: string;
  priority?: boolean;
};

export default function DemoImage({ slot, sizes, shape = "card", className, priority }: DemoImageProps) {
  return (
    <div
      className={`${styles.frame} ${shape === "circle" ? styles.circle : ""} ${className ?? ""}`}
      style={{ aspectRatio: slot.ratio }}
    >
      {slot.src ? (
        <Image src={slot.src} alt={slot.alt} fill sizes={sizes} priority={priority} className={styles.img} />
      ) : (
        <div className={styles.placeholder}>
          <span className={styles.placeholderLabel}>{slot.label}</span>
          <span className={styles.placeholderId}>{slot.id}</span>
        </div>
      )}
    </div>
  );
}
