export const LOCALES = ["en", "uk", "pl"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_LABELS: Record<Locale, string> = { en: "EN", uk: "UA", pl: "PL" };
export const OG_LOCALES: Record<Locale, string> = { en: "en_US", uk: "uk_UA", pl: "pl_PL" };
export const hasLocale = (value: string): value is Locale =>
  (LOCALES as readonly string[]).includes(value);

// No `["default"]` indexer here: with this repo's tsconfig, `typeof import(...)`
// for a JSON module already resolves to the JSON's own shape, not a
// `{ default: ... }`-wrapped namespace — indexing into `default` is a tsc error.
export type Dictionary = typeof import("@/dictionaries/en.json");
