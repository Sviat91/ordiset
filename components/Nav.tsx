import Image from "next/image";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#mobile", label: "Mobile" },
  { href: "#customize", label: "Customize" },
  { href: "#booking-site", label: "Booking site" },
  { href: "#notifications", label: "Notifications" },
];

// No hamburger/drawer in this pass — below 768px the link list is hidden
// and only the logo + CTA remain visible.
export default function Nav() {
  return (
    <header className={styles.nav}>
      <div className={styles.row}>
        <a href="#overview" className={styles.brand}>
          <span className={styles.mark}>
            <Image
              src="/ordiset-mark.png"
              alt="Ordiset"
              width={660}
              height={660}
              priority
              className={styles.markImg}
            />
          </span>
          <span className={styles.wordmark}>ORDISET</span>
        </a>

        <nav className={styles.links}>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className={styles.link}>
              {link.label}
            </a>
          ))}
        </nav>

        <a href="#contact" className={styles.cta}>
          Contact
        </a>
      </div>
    </header>
  );
}
