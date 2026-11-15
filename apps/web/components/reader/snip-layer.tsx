"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { ReaderRect } from "@pansgpt/types";
import type { ReaderSnip } from "@/lib/reader-snips";

export function SnipLayer({
  canvas,
  page,
  onSnip,
  onError,
}: {
  canvas: RefObject<HTMLCanvasElement | null>;
  page: number;
  onSnip: (snip: ReaderSnip) => void;
  onError: () => void;
}): React.ReactElement {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [rect, setRect] = useState<ReaderRect | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    []
  );
  return (
    <div
      className="reader-snip-layer"
      aria-label={`Snip page ${page}`}
      onPointerDown={(event) => {
        if (event.button !== 0 || !canvas.current?.dataset.rendered) return;
        const box = event.currentTarget.getBoundingClientRect();
        start.current = {
          x: (event.clientX - box.left) / box.width,
          y: (event.clientY - box.top) / box.height,
        };
        setRect(null);
        event.currentTarget.setPointerCapture(event.pointerId);
        event.preventDefault();
      }}
      onPointerMove={(event) => {
        if (!start.current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const box = event.currentTarget.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
        const y = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
        setRect({
          x: Math.min(x, start.current.x),
          y: Math.min(y, start.current.y),
          width: Math.abs(x - start.current.x),
          height: Math.abs(y - start.current.y),
        });
      }}
      onPointerCancel={() => {
        generation.current++;
        start.current = null;
        setRect(null);
      }}
      onPointerUp={(event) => {
        const target = canvas.current;
        if (!start.current || !target || !rect) return;
        start.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (
          rect.width * event.currentTarget.clientWidth < 12 ||
          rect.height * event.currentTarget.clientHeight < 12
        ) {
          setRect(null);
          return;
        }
        const crop = document.createElement("canvas");
        crop.width = Math.max(1, Math.round(rect.width * target.width));
        crop.height = Math.max(1, Math.round(rect.height * target.height));
        const context = crop.getContext("2d");
        if (!context) {
          onError();
          return;
        }
        context.drawImage(
          target,
          rect.x * target.width,
          rect.y * target.height,
          rect.width * target.width,
          rect.height * target.height,
          0,
          0,
          crop.width,
          crop.height
        );
        const id = ++generation.current;
        crop.toBlob((blob) => {
          if (generation.current !== id) return;
          if (!blob) {
            onError();
            return;
          }
          const file = new File([blob], "Snippet.png", { type: "image/png" });
          onSnip({ page, rect, file, preview: URL.createObjectURL(blob) });
        }, "image/png");
      }}
    >
      {rect && (
        <span
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.width * 100}%`,
            height: `${rect.height * 100}%`,
          }}
        />
      )}
    </div>
  );
}
