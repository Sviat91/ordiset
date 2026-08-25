"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import type { Dictionary } from "@/lib/locales";
import { useLocale } from "@/components/LocaleProvider";
import StableLabel from "@/components/StableLabel";
import styles from "./ContactForm.module.css";

type FieldName = "name" | "email" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "submitting" | "sent" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialValues: Values = { name: "", email: "", message: "" };

function validate(values: Values, dict: Dictionary["contactForm"]): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) {
    errors.name = dict.errorName;
  }
  if (!EMAIL_RE.test(values.email)) {
    errors.email = dict.errorEmail;
  }
  if (values.message.trim().length < 10) {
    errors.message = dict.errorMessage;
  }
  return errors;
}

export default function ContactForm() {
  const { dict: d } = useLocale();
  const dict = d.contactForm;
  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>(
    {},
  );
  const [status, setStatus] = useState<Status>("idle");

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const fieldRefs = { name: nameRef, email: emailRef, message: messageRef };

  function fieldError(name: FieldName) {
    return touched[name] ? errors[name] : undefined;
  }

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name as FieldName]) return prev;
      const next = { ...prev };
      delete next[name as FieldName];
      return next;
    });
  }

  function handleBlur(e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name } = e.target as { name: FieldName };
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldError = validate(values, dict)[name];
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[name] = fieldError;
      else delete next[name];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(values, dict);
    setErrors(validationErrors);
    setTouched({ name: true, email: true, message: true });

    const firstInvalid = (Object.keys(fieldRefs) as FieldName[]).find(
      (key) => validationErrors[key],
    );
    if (firstInvalid) {
      fieldRefs[firstInvalid].current?.focus();
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("sent");
      setValues(initialValues);
      setTouched({});
    } catch {
      setStatus("error");
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <input
          id="name"
          name="name"
          type="text"
          ref={nameRef}
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={dict.nameLabel}
          aria-label={dict.nameLabel}
          aria-invalid={Boolean(fieldError("name"))}
          aria-describedby={fieldError("name") ? "name-error" : undefined}
          className={`${styles.input} ${fieldError("name") ? styles.inputError : ""}`}
        />
        {fieldError("name") && (
          <p id="name-error" role="alert" className={styles.error}>
            {fieldError("name")}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <input
          id="email"
          name="email"
          type="email"
          ref={emailRef}
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={dict.emailLabel}
          aria-label={dict.emailLabel}
          aria-invalid={Boolean(fieldError("email"))}
          aria-describedby={fieldError("email") ? "email-error" : undefined}
          className={`${styles.input} ${fieldError("email") ? styles.inputError : ""}`}
        />
        {fieldError("email") && (
          <p id="email-error" role="alert" className={styles.error}>
            {fieldError("email")}
          </p>
        )}
      </div>

      <div className={styles.field}>
        <textarea
          id="message"
          name="message"
          rows={5}
          ref={messageRef}
          value={values.message}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={dict.messageLabel}
          aria-label={dict.messageLabel}
          aria-invalid={Boolean(fieldError("message"))}
          aria-describedby={fieldError("message") ? "message-error" : undefined}
          className={`${styles.input} ${fieldError("message") ? styles.inputError : ""}`}
        />
        {fieldError("message") && (
          <p id="message-error" role="alert" className={styles.error}>
            {fieldError("message")}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "submitting"}
        className={styles.submit}
      >
        <StableLabel
          pick={(t) =>
            status === "submitting" ? t.contactForm.submitting : t.contactForm.submit
          }
        />
      </button>

      {status === "sent" && (
        <p role="status" className={styles.success}>
          {dict.success}
        </p>
      )}

      {status === "error" && (
        <p role="alert" className={styles.error}>
          {dict.errorGeneric}
        </p>
      )}
    </form>
  );
}
