"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ReaderRect, ReaderSelection } from "@pansgpt/types";
import { normalizeRect } from "@/lib/reader";
import type { ReaderSnip } from "@/lib/reader-snips";
import type { PdfSource } from "./pdf-engine";
import { PdfPage } from "./pdf-page";
import "pdfjs-dist/web/pdf_viewer.css";

export interface ReaderJump {
  id: number;
  page: number;
  rects?: ReaderRect[];
}

export function PdfViewport({
  source,
  initialPage,
  zoom,
  jump,
  onPage,
  onReadingScroll,
  onTapPage,
  onSelection,
  onReload,
  snipping,
  onSnip,
  onSnipError,
}: {
  source: PdfSource;
  initialPage: number;
  zoom: number;
  jump: ReaderJump | null;
  onPage: (page: number) => void;
  onReadingScroll: (top: number) => void;
  onTapPage: () => void;
  onSelection: (selection: ReaderSelection | null) => void;
  onReload: () => void;
  snipping: boolean;
  onSnip: (snip: ReaderSnip) => void;
  onSnipError: () => void;
}): React.ReactElement {
  "use no memo";
  const scroll = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const current = useRef(Math.min(source.pdf.numPages, Math.max(1, initialPage)));
  const pendingPage = useRef<number | null>(current.current);
  const scrollFrame = useRef(0);
  const [focus, setFocus] = useState<ReaderJump | null>(null);
  const [revision, setRevision] = useState(0);
  // 100% is fit-to-pane at every viewport size, including after resizing chat.
  const width = Math.floor(Math.max(1, available - 16) * zoom);
  const estimate = (index: number): number =>
    width * (source.ratios.get(index + 1) ?? source.ratios.get(1) ?? 1.414) + 24;
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtual = useVirtualizer({
    count: source.pdf.numPages,
    getScrollElement: () => scroll.current,
    estimateSize: estimate,
    overscan: 1,
    enabled: available > 0,
    initialOffset: () => (current.current - 1) * estimate(0),
    useAnimationFrameWithResizeObserver: true,
  });
  const onRatio = useCallback(
    (page: number, ratio: number) => {
      if (source.ratios.get(page) === ratio) return;
      source.ratios.set(page, ratio);
      setRevision((value) => value + 1);
    },
    [source]
  );
  useEffect(() => {
    const target = scroll.current;
    if (!target) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.width);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!available) return;
    const page = current.current;
    pendingPage.current = page;
    const frame = requestAnimationFrame(() => {
      virtual.measure();
      virtual.scrollToIndex(page - 1, { align: "start" });
    });
    onSelection(null);
    return () => cancelAnimationFrame(frame);
  }, [width, available, virtual, onSelection]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      for (const [page, ratio] of source.ratios) {
        virtual.resizeItem(page - 1, width * ratio + 24);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [source, width, virtual, revision]);
  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), []);
  useEffect(() => {
    if (!jump || !available) return;
    current.current = Math.max(1, Math.min(source.pdf.numPages, jump.page));
    pendingPage.current = current.current;
    virtual.scrollToIndex(current.current - 1, { align: "start" });
    onPage(Math.max(1, Math.min(source.pdf.numPages, jump.page)));
    setFocus(jump);
    const timer = setTimeout(() => setFocus(null), 3000);
    return () => clearTimeout(timer);
  }, [jump, available, virtual, source, onPage]);
  useEffect(() => {
    let frame = 0;
    let settle = 0;
    let pointerActive = false;
    let touchActive = false;
    let keyboardActive = false;
    function selected(): void {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      if (pointerActive || touchActive || keyboardActive) return;
      // Native selection handles and keyboard repeats can settle after pointerup.
      // Keep the menu out of the way until the completed selection is stable.
      settle = window.setTimeout(() => {
        frame = requestAnimationFrame(() => {
          if (pointerActive || touchActive || keyboardActive) return;
          const selection = window.getSelection();
          if (!selection || selection.isCollapsed || !selection.rangeCount) {
            if (document.activeElement?.closest(".reader-selection")) return;
            onSelection(null);
            return;
          }
          const range = selection.getRangeAt(0);
          const page =
            selection.anchorNode?.parentElement?.closest<HTMLElement>("[data-page-number]");
          if (
            !page ||
            !scroll.current?.contains(page) ||
            !page.contains(range.startContainer) ||
            !page.contains(range.endContainer)
          ) {
            onSelection(null);
            return;
          }
          const text = selection.toString().trim();
          if (!text || text.length > 6000) {
            onSelection(null);
            return;
          }
          const pageBox = page.getBoundingClientRect();
          const rects = Array.from(range.getClientRects()).flatMap((rect) => {
            const normalized = normalizeRect(rect, pageBox);
            return normalized ? [normalized] : [];
          });
          if (!rects.length || rects.length > 100) {
            onSelection(null);
            return;
          }
          onSelection({ page: Number(page.dataset.pageNumber), text, rects });
        });
      }, 120);
    }
    function startsInPdf(target: EventTarget | null): boolean {
      return target instanceof Node && !!scroll.current?.contains(target);
    }
    function pointerDown(event: PointerEvent): void {
      if (!startsInPdf(event.target) || event.button !== 0) return;
      pointerActive = true;
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      onSelection(null);
    }
    function pointerUp(): void {
      if (!pointerActive) return;
      pointerActive = false;
      selected();
    }
    function touchStart(event: TouchEvent): void {
      if (!startsInPdf(event.target)) return;
      touchActive = true;
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      onSelection(null);
    }
    function touchEnd(): void {
      if (!touchActive) return;
      touchActive = false;
      pointerActive = false;
      selected();
    }
    function keyDown(event: KeyboardEvent): void {
      if (
        !startsInPdf(event.target) ||
        !event.shiftKey ||
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
          "PageUp",
          "PageDown",
        ].includes(event.key)
      )
        return;
      keyboardActive = true;
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      onSelection(null);
    }
    function keyUp(event: KeyboardEvent): void {
      if (!keyboardActive || event.key !== "Shift") return;
      keyboardActive = false;
      selected();
    }
    function blurred(): void {
      pointerActive = touchActive = keyboardActive = false;
      window.clearTimeout(settle);
      cancelAnimationFrame(frame);
      onSelection(null);
    }
    document.addEventListener("selectionchange", selected);
    document.addEventListener("pointerdown", pointerDown, true);
    document.addEventListener("pointerup", pointerUp, true);
    document.addEventListener("pointercancel", pointerUp, true);
    document.addEventListener("touchstart", touchStart, { capture: true, passive: true });
    document.addEventListener("touchend", touchEnd, true);
    document.addEventListener("touchcancel", touchEnd, true);
    document.addEventListener("keydown", keyDown, true);
    document.addEventListener("keyup", keyUp, true);
    window.addEventListener("blur", blurred);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      document.removeEventListener("selectionchange", selected);
      document.removeEventListener("pointerdown", pointerDown, true);
      document.removeEventListener("pointerup", pointerUp, true);
      document.removeEventListener("pointercancel", pointerUp, true);
      document.removeEventListener("touchstart", touchStart, true);
      document.removeEventListener("touchend", touchEnd, true);
      document.removeEventListener("touchcancel", touchEnd, true);
      document.removeEventListener("keydown", keyDown, true);
      document.removeEventListener("keyup", keyUp, true);
      window.removeEventListener("blur", blurred);
    };
  }, [onSelection]);
  const items = virtual.getVirtualItems();
  return (
    <div
      className="reader-scroll"
      ref={scroll}
      tabIndex={0}
      aria-label="PDF pages"
      onClick={onTapPage}
      onScroll={() => {
        if (scroll.current && pendingPage.current === null)
          onReadingScroll(scroll.current.scrollTop);
        cancelAnimationFrame(scrollFrame.current);
        // Read after the virtualizer commits its new window. Its prior item list can
        // still describe the old page while a distant citation jump is settling.
        scrollFrame.current = requestAnimationFrame(() => {
          const viewport = scroll.current;
          if (!viewport) return;
          const edge = viewport.getBoundingClientRect().top + 40;
          const visible = Array.from(
            viewport.querySelectorAll<HTMLElement>("[data-page-number]")
          ).find((node) => node.getBoundingClientRect().bottom > edge);
          if (!visible) return;
          const number = Number(visible.dataset.pageNumber);
          if (pendingPage.current !== null && pendingPage.current !== number) return;
          pendingPage.current = null;
          current.current = number;
          onPage(number);
        });
        onSelection(null);
      }}
    >
      <div
        className="reader-page-stack"
        style={{ height: virtual.getTotalSize(), minWidth: Math.max(available, width + 16) }}
      >
        {items.map((item) => (
          <div
            key={item.key}
            data-index={item.index}
            className="reader-page-slot"
            style={{ top: item.start, width, height: estimate(item.index) }}
          >
            <PdfPage
              pdf={source.pdf}
              number={item.index + 1}
              width={width}
              onRatio={onRatio}
              onReload={onReload}
              snipping={snipping}
              onSnip={onSnip}
              onSnipError={onSnipError}
              focusRects={focus?.page === item.index + 1 ? focus.rects : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
