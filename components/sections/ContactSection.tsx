import ContactForm from "@/components/ContactForm";
import styles from "./sections.module.css";
import contactStyles from "./ContactSection.module.css";

export default function ContactSection() {
  return (
    <section id="contact" className={contactStyles.section}>
      <div className={styles.container}>
        <div className={styles.stack}>
          <p className={styles.eyebrow}>Contact</p>
          <h2 className={styles.title}>Let&apos;s set up your booking system</h2>
          <p className={styles.body}>
            Tell us about your business and we&apos;ll get back to you with a
            walkthrough.
          </p>
          <div className={contactStyles.formWrap}>
            <ContactForm />
          </div>
        </div>
        <footer className={contactStyles.footer}>© 2026 Ordiset</footer>
      </div>
    </section>
  );
}
