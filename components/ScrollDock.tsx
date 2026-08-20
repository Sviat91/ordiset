"use client";

import { useCallback, useEffect, useRef } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";
import { getSectionTops } from "@/lib/sections";

// Feel knobs — the only two constants meant to be tuned:
const COMMIT = 0.7; // fraction of a section that must be traversed to commit to the next one
const SETTLE_MS = 180; // idle time after the last scrollY change that counts as "gesture over"
const TOLERANCE = 0.5; // px; below this we are already docked / no correction is worth issuing

// Must mirror the static-fallback breakpoint in StackSection.module.css exactly.
const STATIC_STACK_QUERY = "(max-width: 899px), (max-height: 700px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const SCROLL_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "PageUp",
  "PageDown",
  "Home",
  "End",
  " ",
]);

// D6: symmetric, direction-aware, segment-local commit threshold.
function computeDockTarget(y: number, from: number): number | null {
  const tops = getSectionTops().map((entry) => entry.top);
  let i = 0;
  for (let idx = 0; idx < tops.length; idx += 1) {
    if (tops[idx] <= y + TOLERANCE) i = idx;
  }
  const segStart = tops[i];
  const segEnd = tops[i + 1];

  if (segEnd === undefined) return null; // last section (#contact)
  if (segEnd - segStart <= 0) return null;
  if (segEnd - segStart > window.innerHeight + 1) return null; // section taller than the viewport
  if (y - segStart <= TOLERANCE) return null; // already docked
  if (y === from) return null; // no net movement

  const p = (y - segStart) / (segEnd - segStart);
  const target =
    y > from
      ? p >= COMMIT
        ? segEnd
        : segStart
      : p <= 1 - COMMIT
        ? segStart
        : segEnd;

  const clamped = Math.max(
    0,
    Math.min(target, document.documentElement.scrollHeight - window.innerHeight),
  );
  return Math.abs(clamped - y) > TOLERANCE ? clamped : null;
}

function isEnabled(): boolean {
  return (
    !window.matchMedia(STATIC_STACK_QUERY).matches &&
    !window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

// Renders nothing. Watches real user scroll input, waits for the gesture to
// settle, and issues at most one corrective smooth-scroll per gesture so the
// page always comes to rest on a section boundary.
export default function ScrollDock() {
  const armedRef = useRef(false);
  // Last known *settled* scrollY — written only by settle() (and once on
  // mount). Never sampled from an input-event handler: under passive
  // wheel/touch listeners the browser is free to apply the scroll before
  // the handler runs, so reading window.scrollY inside arm() would race
  // and could observe the post-scroll position, making every gesture look
  // like zero net movement.
  const restYRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const { scrollY } = useScroll();

  useEffect(() => {
    restYRef.current = window.scrollY;
  }, []);

  const settle = useCallback(() => {
    const y = window.scrollY;
    // Not a user gesture (programmatic scroll from Nav/Hero click, hash
    // navigation, scroll restoration, …) — just record where things ended
    // up so the next real gesture has an accurate baseline; never dock.
    if (!armedRef.current) {
      restYRef.current = y;
      return;
    }
    const from = restYRef.current;
    armedRef.current = false; // D7: unconditional — one dock per gesture
    if (isEnabled()) {
      const target = computeDockTarget(y, from);
      if (target !== null) {
        window.scrollTo({ top: target, behavior: "smooth" });
        restYRef.current = target;
        return;
      }
    }
    restYRef.current = y;
  }, []);

  const restartTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(settle, SETTLE_MS);
  }, [settle]);

  const arm = useCallback(() => {
    if (!isEnabled()) return;
    armedRef.current = true;
    restartTimer();
  }, [restartTimer]);

  useMotionValueEvent(scrollY, "change", () => {
    restartTimer();
  });

  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(e.key)) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, select, [contenteditable]")) return;
      arm();
    };

    window.addEventListener("wheel", arm, { passive: true });
    window.addEventListener("touchstart", arm, { passive: true });
    window.addEventListener("touchmove", arm, { passive: true });
    window.addEventListener("keydown", onKeydown);

    return () => {
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchstart", arm);
      window.removeEventListener("touchmove", arm);
      window.removeEventListener("keydown", onKeydown);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [arm]);

  return null;
}
