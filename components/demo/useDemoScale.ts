"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_W = 1280;
const CANVAS_H = 800;

export function useDemoScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.min(width / CANVAS_W, height / CANVAS_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, scale };
}
