import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Dictionary, type Locale } from "@/lib/locales";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  uk: () => import("@/dictionaries/uk.json").then((m) => m.default),
  pl: () => import("@/dictionaries/pl.json").then((m) => m.default),
};

export const getDictionary = async (): Promise<Dictionary> => {
  const locale = await lang();
  if (!hasLocale(locale)) notFound();
  return dictionaries[locale]();
};
