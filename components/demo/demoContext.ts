"use client";

import { createContext, useContext, type Dispatch } from "react";
import type { DemoAction, DemoState } from "./demoState";

type DemoContextValue = {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
};

export const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used within DemoApp");
  return ctx;
}
