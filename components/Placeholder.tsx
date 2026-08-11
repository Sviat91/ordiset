import styles from "./Placeholder.module.css";

type PlaceholderProps = {
  label: string;
};

export default function Placeholder({ label }: PlaceholderProps) {
  return (
    <div className={styles.placeholder}>
      <span className={styles.dot} />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
