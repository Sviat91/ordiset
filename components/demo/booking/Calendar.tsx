"use client";

import { useMemo, useState } from "react";
import { monthGrid } from "../lib/calendar";
import type { MasterId } from "../demoState";
import styles from "./Calendar.module.css";

const WEEKDAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type CalendarProps = {
  masterId: MasterId;
  seed: number;
  selectedDateISO: string | null;
  onSelectDate: (dateISO: string) => void;
};

export default function Calendar({ masterId, seed, selectedDateISO, onSelectDate }: CalendarProps) {
  const [displayed, setDisplayed] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const grid = useMemo(
    () => monthGrid(displayed.year, displayed.month, seed, masterId),
    [displayed.year, displayed.month, seed, masterId],
  );

  const now = new Date();
  const currentYM = now.getFullYear() * 12 + now.getMonth();
  const displayedYM = displayed.year * 12 + displayed.month;
  const canPrev = displayedYM > currentYM;
  const canNext = displayedYM < currentYM + 12;

  const changeMonth = (delta: number) => {
    setDisplayed(({ year, month }) => {
      const total = year * 12 + month + delta;
      return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => changeMonth(-1)}
        >
          ‹
        </button>
        <span className={styles.monthLabel}>
          {MONTH_LABELS[displayed.month]} {displayed.year}
        </span>
        <button
          type="button"
          className={styles.navButton}
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => changeMonth(1)}
        >
          ›
        </button>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className={styles.weekday}>
            {label}
          </span>
        ))}
      </div>

      <div className={styles.grid}>
        {grid.map((cell) => {
          const disabled = !cell.inMonth || cell.isPast || !cell.isOpen;
          const selected = cell.dateISO === selectedDateISO;
          const dateLabel = new Date(`${cell.dateISO}T00:00:00`).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });
          return (
            <button
              key={cell.dateISO}
              type="button"
              className={[
                styles.day,
                !cell.inMonth ? styles.outMonth : "",
                cell.isToday ? styles.today : "",
                selected ? styles.selected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              aria-label={dateLabel}
              aria-pressed={selected}
              onClick={() => onSelectDate(cell.dateISO)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
