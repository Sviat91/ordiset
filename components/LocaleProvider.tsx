"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DICTIONARIES } from "@/lib/dictionaries-client";
import type { Dictionary, Locale } from "@/lib/locales";

type LocaleContextValue = {
  locale: Locale;
  dict: Dictionary;
  setLocale: (next: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used inside <LocaleProvider>");
  return ctx;
}

export default function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      if (next === locale) return;
      const rest = window.location.pathname.replace(/^\/[^/]+/, "");
      // Not router.push: the router would refetch the RSC payload and
      // rebuild the tree, remounting the demo iframes. See D1.
      window.history.replaceState(
        null,
        "",
        `/${next}${rest}${window.location.search}${window.location.hash}`,
      );
      document.documentElement.lang = next;
      document.title = DICTIONARIES[next].metadata.title;
      setLocaleState(next);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, dict: DICTIONARIES[locale], setLocale }),
    [locale, setLocale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}
