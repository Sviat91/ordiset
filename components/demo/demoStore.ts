import type { BookedSlot, DemoStore } from "./demoState";

const STORAGE_KEY = "ordiset-demo-v1";

function isBookedSlot(value: unknown): value is BookedSlot {
  if (!value || typeof value !== "object") return false;
  const slot = value as Record<string, unknown>;
  return (
    (slot.masterId === "marek" || slot.masterId === "anna") &&
    typeof slot.serviceId === "string" &&
    typeof slot.dateISO === "string" &&
    typeof slot.time === "string"
  );
}

function isDemoStore(value: unknown): value is DemoStore {
  if (!value || typeof value !== "object") return false;
  const store = value as Record<string, unknown>;
  return (
    store.version === 1 &&
    typeof store.seed === "number" &&
    (store.theme === "light" || store.theme === "dark") &&
    Array.isArray(store.bookings) &&
    store.bookings.every(isBookedSlot)
  );
}

function createStore(): DemoStore {
  return {
    version: 1,
    seed: Math.floor(Math.random() * 2 ** 31),
    theme: "light",
    bookings: [],
  };
}

export function readStore(): DemoStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createStore();
    const parsed: unknown = JSON.parse(raw);
    return isDemoStore(parsed) ? parsed : createStore();
  } catch {
    return createStore();
  }
}

export function writeStore(store: DemoStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {}
}
