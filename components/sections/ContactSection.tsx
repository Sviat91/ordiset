"use client";

import ContactForm from "@/components/ContactForm";
import StableTextBlock from "@/components/StableTextBlock";
import { useLocale } from "@/components/LocaleProvider";
import styles from "./sections.module.css";
import contactStyles from "./ContactSection.module.css";

export default function ContactSection() {
  const { dict } = useLocale();
  return (
    <section id="contact" className={contactStyles.section}>
      <div className={styles.container}>
        <div className={styles.stack}>
          <StableTextBlock>
            {(t) => (
              <>
                <p className={styles.eyebrow}>{t.contact.eyebrow}</p>
                <h2 className={styles.title}>{t.contact.title}</h2>
                <p className={styles.body}>{t.contact.body}</p>
              </>
            )}
          </StableTextBlock>
          <div className={contactStyles.formWrap}>
            <ContactForm />
          </div>
        </div>
        <footer className={contactStyles.footer}>{dict.contact.footer}</footer>
      </div>
    </section>
  );
}
