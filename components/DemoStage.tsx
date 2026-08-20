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
};

export default function DemoStage({
  src,
  title,
  minViewportHeight = 800,
}: DemoStageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [needH, setNeedH] = useState(minViewportHeight);

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
  }, [box, syncNeed]);

  const handleLoad = () => {
    syncNeed();
    try {
      iframeRef.current?.contentDocument?.fonts.ready.then(syncNeed);
    } catch {
      // cross-origin or unsupported; ignore
    }
  };

  const hasBox = box !== null && box.h > 0;
  let style: React.CSSProperties;
  if (hasBox) {
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
