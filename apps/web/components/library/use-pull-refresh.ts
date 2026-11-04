"use client";
import { useEffect, useRef, useState, type RefObject } from "react";

export const PULL_REFRESH_THRESHOLD = 64;

export function usePullRefresh(
  scroller: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  refresh: () => void
): number {
  const [distance, setDistance] = useState(0);
  const pull = useRef(0);
  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    let origin: { x: number; y: number } | null = null;
    function reset(): void {
      origin = null;
      pull.current = 0;
      setDistance(0);
    }
    function start(event: TouchEvent): void {
      if (
        !enabled ||
        element!.scrollTop > 0 ||
        event.touches.length !== 1 ||
        !window.matchMedia("(max-width: 860px)").matches
      )
        return;
      const touch = event.touches[0]!;
      origin = { x: touch.clientX, y: touch.clientY };
    }
    function move(event: TouchEvent): void {
      if (!origin) return;
      if (event.touches.length !== 1 || element!.scrollTop > 0) {
        reset();
        return;
      }
      const touch = event.touches[0]!;
      const dy = touch.clientY - origin.y;
      const dx = Math.abs(touch.clientX - origin.x);
      if (dy < 0 || dx > Math.abs(dy)) {
        reset();
        return;
      }
      if (dy < 6) return;
      if (event.cancelable) event.preventDefault();
      pull.current = Math.min(88, dy * 0.5);
      setDistance(pull.current);
    }
    function end(): void {
      const shouldRefresh = enabled && pull.current >= PULL_REFRESH_THRESHOLD;
      reset();
      if (shouldRefresh) refresh();
    }
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end, { passive: true });
    element.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", reset);
    };
  }, [scroller, enabled, refresh]);
  return distance;
}
