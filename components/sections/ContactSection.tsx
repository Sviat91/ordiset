"use client";

import ContactForm from "@/components/ContactForm";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";
import contactStyles from "./ContactSection.module.css";

export default function ContactSection() {
  const { dict } = useLocale();
  return (
    <section id="contact" className={contactStyles.section}>
      <div className={styles.container}>
        <div className={styles.stack}>
          <p className={styles.eyebrow}>{dict.contact.eyebrow}</p>
          <h2 className={styles.title}>{dict.contact.title}</h2>
          <p className={styles.body}>{dict.contact.body}</p>
          <div className={contactStyles.formWrap}>
            <ContactForm />
          </div>
        </div>
        <footer className={contactStyles.footer}>{dict.contact.footer}</footer>
      </div>
    </section>
  );
}
