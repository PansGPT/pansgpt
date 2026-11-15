"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask, TextLayer } from "pdfjs-dist";
import type { ReaderRect } from "@pansgpt/types";
import type { ReaderSnip } from "@/lib/reader-snips";
import { SnipLayer } from "./snip-layer";

export function PdfPage({
  pdf,
  number,
  width,
  focusRects,
  onRatio,
  onReload,
  snipping,
  onSnip,
  onSnipError,
}: {
  pdf: PDFDocumentProxy;
  number: number;
  width: number;
  focusRects?: ReaderRect[];
  onRatio: (page: number, ratio: number) => void;
  onReload: () => void;
  snipping: boolean;
  onSnip: (snip: ReaderSnip) => void;
  onSnipError: () => void;
}): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null);
  const text = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    let render: RenderTask | undefined,
      layer: TextLayer | undefined,
      page: PDFPageProxy | undefined;
    const target = canvas.current!,
      textTarget = text.current!;
    async function paint(): Promise<void> {
      try {
        page = await pdf.getPage(number);
        if (disposed) return;
        const base = page.getViewport({ scale: 1 });
        onRatio(number, base.height / base.width);
        const scale = width / base.width;
        const viewport = page.getViewport({ scale });
        // Bound each canvas to six million pixels; large pages trade raster density for memory.
        const density = Math.min(
          2,
          window.devicePixelRatio || 1,
          Math.sqrt(6_000_000 / (viewport.width * viewport.height))
        );
        target.width = Math.floor(viewport.width * density);
        target.height = Math.floor(viewport.height * density);
        const pdfjs = await import("pdfjs-dist");
        if (disposed) return;
        render = page.render({
          canvas: target,
          viewport,
          background: "#ffffff",
          transform: [density, 0, 0, density, 0, 0],
        });
        textTarget.replaceChildren();
        textTarget.style.setProperty("--scale-factor", String(scale));
        textTarget.style.setProperty("--total-scale-factor", String(scale));
        layer = new pdfjs.TextLayer({
          textContentSource: page.streamTextContent(),
          container: textTarget,
          viewport,
        });
        await Promise.all([render.promise, layer.render()]);
        if (!disposed) {
          target.dataset.rendered = "true";
          setError(false);
        }
      } catch {
        if (!disposed) setError(true);
      }
    }
    void paint();
    return () => {
      disposed = true;
      render?.cancel();
      layer?.cancel();
      textTarget.replaceChildren();
      delete target.dataset.rendered;
      const release = () => {
        target.width = 0;
        target.height = 0;
        page?.cleanup();
      };
      if (render) void render.promise.catch(() => undefined).then(release);
      else release();
    };
  }, [pdf, number, width, onRatio, attempt]);
  const styleRect = (rect: ReaderRect): CSSProperties => ({
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  });
  return (
    <div className="reader-page" data-page-number={number} aria-label={`Page ${number}`}>
      <canvas key={`canvas:${width}:${attempt}`} ref={canvas} aria-hidden="true" />
      <div key={`text:${width}:${attempt}`} ref={text} className="textLayer" />
      <div className="reader-highlight-layer" aria-hidden="true">
        {focusRects?.map((rect, index) => (
          <span key={`focus:${index}`} className="reader-source-rect" style={styleRect(rect)} />
        ))}
      </div>
      {snipping && (
        <SnipLayer canvas={canvas} page={number} onSnip={onSnip} onError={onSnipError} />
      )}
      {error && (
        <div className="reader-page-error" role="alert">
          This page couldn’t render.
          <button
            type="button"
            onClick={() => {
              setError(false);
              setAttempt((value) => value + 1);
            }}
          >
            Retry page {number}
          </button>
          <button type="button" onClick={onReload}>
            Refresh PDF access
          </button>
        </div>
      )}
    </div>
  );
}
