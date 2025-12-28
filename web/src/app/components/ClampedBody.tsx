"use client";

import { useEffect, useRef, useState } from "react";
import { UI } from "../uiStrings";

export function ClampedBody({ text }: { text: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [isClamped, setIsClamped] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;

    const measure = () => setIsClamped(el.scrollHeight > el.clientHeight + 1);

    requestAnimationFrame(measure);

    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(el);

    // @ts-ignore
    document.fonts?.ready?.then(() => requestAnimationFrame(measure));

    return () => ro.disconnect();
  }, [text]);

  return (
    <div className="relative h-full min-h-0">
      <div
        ref={boxRef}
        className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-100/80"
        style={{
          maxHeight: "calc(1.625em * 6)", // 6 lines
          overflow: "hidden",
        }}
      >
        {text}
      </div>

      {isClamped && (
        <>
          <div className="pointer-events-none absolute bottom-0 right-0 h-10 bg-gradient-to-t from-[#0B0D12] to-transparent" />
          <div className="pointer-events-none absolute bottom-0 right-2 z-30 text-xl text-zinc-400">
            {UI.moreText /* "..." */}
          </div>
        </>
      )}
    </div>
  );
}
