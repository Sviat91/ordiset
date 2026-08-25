import en from "@/dictionaries/en.json";
import uk from "@/dictionaries/uk.json";
import pl from "@/dictionaries/pl.json";
import type { Dictionary, Locale } from "@/lib/locales";

// Static imports on purpose: switching locale must be synchronous (no
// await, no loading flash) and the first client render must match SSR
// exactly. Same JSON files the server path in lib/dictionaries.ts reads.
export const DICTIONARIES: Record<Locale, Dictionary> = { en, uk, pl };
