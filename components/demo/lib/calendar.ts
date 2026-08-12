import type { BookedSlot, MasterId } from "../demoState";

export const OPEN_HOUR = 10;
export const CLOSE_HOUR = 19;
export const STEP_MIN = 30;

export type DayCell = {
  dateISO: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isOpen: boolean;
};

export type TimeSlot = {
  time: string;
  taken: boolean;
};

function hash32(...nums: number[]): number {
  let h = 2166136261;
  for (const n of nums) {
    h ^= n;
    h = Math.imul(h, 16777619);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function masterSalt(masterId: string): number {
  let sum = 0;
  for (let i = 0; i < masterId.length; i++) sum += masterId.charCodeAt(i);
  return sum;
}

export function toDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function closedWeekdaysForMonth(seed: number, year: number, month: number, masterId: string): Set<number> {
  const rng = mulberry32(hash32(seed, year, month, masterSalt(masterId)));
  const closedCount = 2 + Math.floor(rng() * 2);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdayDays: number[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dow = new Date(year, month, day).getDay();
    if (dow !== 0 && dow !== 6) weekdayDays.push(day);
  }

  for (let i = weekdayDays.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [weekdayDays[i], weekdayDays[j]] = [weekdayDays[j], weekdayDays[i]];
  }

  return new Set(weekdayDays.slice(0, closedCount));
}

export function isDayOpen(date: Date, seed: number, masterId: string): boolean {
  const today = startOfDay(new Date());
  const day = startOfDay(date);
  if (day < today) return false;

  const dow = date.getDay();
  if (dow === 0) return false;

  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  if (dow === 6) {
    const rng = mulberry32(hash32(seed, y, m, d, masterSalt(masterId)));
    return rng() < 0.25;
  }

  const closed = closedWeekdaysForMonth(seed, y, m, masterId);
  return !closed.has(d);
}

function mondayIndex(dow: number): number {
  return (dow + 6) % 7;
}

export function monthGrid(year: number, month: number, seed: number, masterId: MasterId): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const leadingDays = mondayIndex(firstOfMonth.getDay());
  const gridStart = new Date(year, month, 1 - leadingDays);
  const today = startOfDay(new Date());

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const day = startOfDay(date);
    cells.push({
      dateISO: toDateISO(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: day.getTime() === today.getTime(),
      isPast: day < today,
      isOpen: isDayOpen(date, seed, masterId),
    });
  }
  return cells;
}

export function timeSlots(
  dateISO: string,
  seed: number,
  masterId: MasterId,
  durationMin: number,
  bookings: BookedSlot[],
): TimeSlot[] {
  const [y, m, d] = dateISO.split("-").map(Number);
  const salt = masterSalt(masterId);
  const now = new Date();
  const nowISO = toDateISO(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const slots: TimeSlot[] = [];
  const openMin = OPEN_HOUR * 60;
  const closeMin = CLOSE_HOUR * 60;

  let index = 0;
  for (let t = openMin; t + durationMin <= closeMin; t += STEP_MIN) {
    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    const time = `${hh}:${mm}`;

    const rng = mulberry32(hash32(seed, y, m - 1, d, index, salt));
    let taken = rng() < 0.3;
    if (!taken) {
      taken = bookings.some((b) => b.masterId === masterId && b.dateISO === dateISO && b.time === time);
    }
    if (!taken && dateISO === nowISO && t <= nowMinutes) {
      taken = true;
    }

    slots.push({ time, taken });
    index++;
  }
  return slots;
}
