"use client";

import { useEffect, useRef, useState } from "react";
import type { Service } from "../data/masters";
import styles from "./ServiceSelect.module.css";

type ServiceSelectProps = {
  services: Service[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function ServiceSelect({ services, selectedId, onSelect }: ServiceSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = services.find((service) => service.id === selectedId) ?? null;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={styles.triggerLabel}>{selected ? selected.name : "Select a service"}</span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <ul className={styles.list} role="listbox">
          {services.map((service) => (
            <li key={service.id}>
              <button
                type="button"
                role="option"
                aria-selected={service.id === selectedId}
                className={styles.row}
                onClick={() => {
                  onSelect(service.id);
                  setOpen(false);
                }}
              >
                <span className={styles.rowName}>{service.name}</span>
                <span className={styles.rowMeta}>
                  <span className={styles.rowDuration}>{service.durationMin} min</span>
                  <span className={styles.rowPrices}>
                    <span className={styles.priceOriginal}>{service.originalPrice}</span>
                    <span className={styles.priceDiscounted}>{service.price}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
