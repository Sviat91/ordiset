"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, FormEvent } from "react";
import styles from "./ContactForm.module.css";

type FieldName = "name" | "email" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "submitting" | "sent";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const initialValues: Values = { name: "", email: "", message: "" };

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (values.name.trim().length < 2) {
    errors.name = "Enter your name (at least 2 characters).";
  }
  if (!EMAIL_RE.test(values.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (values.message.trim().length < 10) {
    errors.message = "Tell us a bit more (at least 10 characters).";
  }
  return errors;
}

export default function ContactForm() {
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
    const fieldError = validate(values)[name];
    setErrors((prev) => {
      const next = { ...prev };
      if (fieldError) next[name] = fieldError;
      else delete next[name];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationErrors = validate(values);
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
    // TODO: wire to a real endpoint — out of scope for this pass
    await new Promise((resolve) => setTimeout(resolve, 600));
    setStatus("sent");
    setValues(initialValues);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor="name" className={styles.label}>
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          ref={nameRef}
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
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
        <label htmlFor="email" className={styles.label}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          ref={emailRef}
          value={values.email}
          onChange={handleChange}
          onBlur={handleBlur}
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
        <label htmlFor="message" className={styles.label}>
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          ref={messageRef}
          value={values.message}
          onChange={handleChange}
          onBlur={handleBlur}
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
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>

      {status === "sent" && (
        <p role="status" className={styles.success}>
          Thanks — we&apos;ll be in touch shortly.
        </p>
      )}
    </form>
  );
}
