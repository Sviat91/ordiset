"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./DemoStage.module.css";

type DemoStageProps = {
  src: string;
  title: string;
  /** Minimum CSS-px viewport height guaranteed to the embedded document.
   *  If the frame box is shorter, the whole document is uniformly scaled
   *  down so this many CSS px still fit. Raised automatically at runtime
   *  if the embedded page turns out to need more. */
  minViewportHeight?: number; // default 800
  /** If set, a bounded poll looks for the first button/link whose text
   *  includes this string once the iframe has loaded, and clicks it. */
  autoClickText?: string;
  /** If set, watches this localStorage key for changes made by another
   *  same-origin embed and reloads this iframe when it changes. */
  reloadOnStorageKey?: string;
  /** If set, renders the embedded document at this fixed CSS-px size
   *  (e.g. a real phone viewport) uniformly scaled to fit the box, and
   *  lets it scroll internally like a real device instead of auto-fitting
   *  its height. Use for embeds the visitor navigates around in — without
   *  this, `minViewportHeight`'s scale-to-fit only ever grows (see
   *  `syncNeed`), so visiting a taller in-app page permanently shrinks
   *  every other page of the same embed. Mutually exclusive in effect
   *  with `minViewportHeight`/auto-fit; content-height tracking is
   *  skipped entirely when this is set. */
  fixedViewport?: { width: number; height: number };
};

export default function DemoStage({
  src,
  title,
  minViewportHeight = 800,
  autoClickText,
  reloadOnStorageKey,
  fixedViewport,
}: DemoStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [needH, setNeedH] = useState(minViewportHeight);
  const [loadNonce, setLoadNonce] = useState(0);
  const [contentNonce, setContentNonce] = useState(0);
  const clickedRef = useRef(false);
  const contentRoRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const prev = boxRef.current;
      if (prev && prev.w === width && prev.h === height) return;
      const next = { w: width, h: height };
      boxRef.current = next;
      setBox(next);
      setNeedH(minViewportHeight);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [minViewportHeight]);

  const syncNeed = useCallback(() => {
    try {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return;
      const required = doc.documentElement.scrollHeight;
      setNeedH((prev) => {
        const boxH = box?.h ?? 0;
        return required > Math.max(boxH, prev) ? required : prev;
      });
    } catch {
      // cross-origin or not yet accessible; leave needH as-is
    }
  }, [box]);

  useEffect(() => {
    if (!box) return;
    const raf = requestAnimationFrame(syncNeed);
    return () => cancelAnimationFrame(raf);
  }, [box, contentNonce, syncNeed]);

  const handleLoad = () => {
    clickedRef.current = false;
    setLoadNonce((n) => n + 1);
    // Fixed-viewport embeds (e.g. the phone-frame mobile preview) never
    // auto-fit height — content taller than the fixed viewport scrolls
    // internally instead, like a real device. Content-height tracking
    // would be both unused and wasted work here.
    if (fixedViewport) return;
    syncNeed();
    // Watch the embedded document's own content height continuously, so
    // any post-load change (in-app navigation, sidebar collapse/expand,
    // etc.) keeps `needH` (and thus the letterboxing frame) correctly
    // sized instead of only ever measuring once at load.
    contentRoRef.current?.disconnect();
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc?.documentElement) {
        const ro = new ResizeObserver(() => {
          syncNeed();
        });
        ro.observe(doc.documentElement);
        contentRoRef.current = ro;
      }
    } catch {
      // cross-origin or not yet accessible; ignore
    }
    try {
      iframeRef.current?.contentDocument?.fonts.ready.then(syncNeed);
    } catch {
      // cross-origin or unsupported; ignore
    }
  };

  useEffect(() => {
    return () => {
      contentRoRef.current?.disconnect();
    };
  }, []);

  // Auto-click: the embedded demo's admin-nav button has no stable id/data
  // attribute (text match is the only hook), and its target view isn't
  // guaranteed to be committed by the time `load` fires (React mounts on
  // its own scheduler task) — nor is `load` guaranteed to fire at all if
  // the iframe was already warm (bfcache). A `MutationObserver` on the
  // iframe's body reacts as soon as the button actually appears (rather
  // than hoping a fixed poll interval lines up in time on a slow/cold
  // first load), started on mount and restarted on every `load`. It's
  // still bounded by an overall timeout so it can't run forever if the
  // button never appears.
  useEffect(() => {
    if (!autoClickText) return;
    let observer: MutationObserver | undefined;
    let overallTimer: number | undefined;
    let topUpTimer: number | undefined;

    const tryClick = () => {
      if (clickedRef.current) return true;
      try {
        const doc = iframeRef.current?.contentDocument;
        // `match` belongs to the iframe's own realm, so it is never an
        // `instanceof` the parent page's `HTMLElement` constructor even
        // though it's the exact same interface — cast rather than
        // runtime-check; the "button, a" selector already guarantees a
        // clickable element.
        const match = doc
          ? (Array.from(doc.querySelectorAll("button, a")).find((el) =>
              el.textContent?.includes(autoClickText),
            ) as HTMLElement | undefined)
          : undefined;
        if (match) {
          clickedRef.current = true;
          match.click();
          // needH is otherwise monotonic-increasing (see syncNeed); reset
          // it here so a shorter post-click view isn't stuck at the taller
          // pre-click height, then force a re-measure via contentNonce.
          setNeedH(minViewportHeight);
          setContentNonce((n) => n + 1);
          // Safety top-up for layout that settles late in the new view.
          topUpTimer = window.setTimeout(() => {
            setContentNonce((n) => n + 1);
          }, 400);
          return true;
        }
      } catch {
        // cross-origin or not yet accessible; keep watching
      }
      return false;
    };

    if (!tryClick()) {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
          observer = new MutationObserver(() => {
            if (tryClick()) observer?.disconnect();
          });
          observer.observe(doc.body, { childList: true, subtree: true });
        }
      } catch {
        // cross-origin or not yet accessible; nothing to observe
      }
      overallTimer = window.setTimeout(() => {
        observer?.disconnect();
      }, 10000);
    }

    return () => {
      observer?.disconnect();
      if (overallTimer !== undefined) window.clearTimeout(overallTimer);
      if (topUpTimer !== undefined) window.clearTimeout(topUpTimer);
    };
  }, [autoClickText, loadNonce, minViewportHeight]);

  // Cross-iframe brand sync: a same-origin child-iframe write to
  // localStorage was verified live (V6) not to fire a `storage` event on
  // this parent window, so this polls the shared storage area directly
  // instead of relying on event delivery (D7).
  useEffect(() => {
    if (!reloadOnStorageKey) return;
    let last = localStorage.getItem(reloadOnStorageKey);
    const id = window.setInterval(() => {
      const now = localStorage.getItem(reloadOnStorageKey);
      if (now === last) return;
      last = now;
      iframeRef.current?.contentWindow?.location.reload();
    }, 1000);
    return () => window.clearInterval(id);
  }, [reloadOnStorageKey]);

  const hasBox = box !== null && box.h > 0;
  let style: React.CSSProperties;
  if (hasBox && fixedViewport) {
    // Fill the box completely (like object-fit: cover) rather than
    // driving scale off content height — the size never changes as the
    // visitor navigates inside the embed. The box's aspect ratio is only
    // ever approximately the fixed viewport's (frame padding/border skew
    // it slightly), so `min` here would leave a visible gap on one axis;
    // `max` overscans by a sliver instead, clipped by the frame's own
    // `overflow: hidden` — invisible in practice, unlike a gap.
    const s = Math.max(box.w / fixedViewport.width, box.h / fixedViewport.height);
    style = {
      width: fixedViewport.width,
      height: fixedViewport.height,
      transform: `scale(${s})`,
      opacity: 1,
    };
  } else if (hasBox) {
    const cssH = Math.max(box.h, needH);
    const s = box.h / cssH;
    const width = Math.ceil(box.w / s);
    const height = Math.ceil(cssH);
    style = {
      width,
      height,
      transform: `scale(${s})`,
      opacity: 1,
    };
  } else {
    style = { opacity: 0 };
  }

  return (
    <div ref={ref} className={styles.stage}>
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        onLoad={handleLoad}
        className={styles.frame}
        style={style}
      />
    </div>
  );
}
