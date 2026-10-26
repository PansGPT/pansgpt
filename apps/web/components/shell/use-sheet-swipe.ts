"use client";

import { useEffect, useRef } from "react";

/** Native listeners also receive touches from the chat's React portals. */
export function useSheetSwipe(
  element: HTMLDivElement | null,
  historyOpen: boolean,
  onHistory: (open: boolean) => void,
  onDismiss: () => void
): void {
  const suppressClickUntil = useRef(0);
  useEffect(() => {
    if (!element) return;
    const views = element.querySelector<HTMLElement>(".mobile-home-chat-views");
    let gesture: {
      x: number;
      y: number;
      dx: number;
      dy: number;
      time: number;
      down: boolean;
      axis: "x" | "y" | null;
    } | null = null;
    const reset = () => {
      element.removeAttribute("data-dragging");
      element.style.removeProperty("--sheet-swipe-y");
      views?.style.removeProperty("--sheet-swipe-x");
    };
    const start = (event: TouchEvent) => {
      suppressClickUntil.current = 0;
      gesture = null;
      reset();
      if (
        event.touches.length !== 1 ||
        element.querySelector("#academic-disclaimer-checkbox") ||
        window.getSelection()?.isCollapsed === false
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      if (
        !target ||
        target.closest("input, textarea, select, a, [contenteditable=true], [role=slider]")
      )
        return;
      const button = target.closest("button");
      if (button && !button.matches(".mobile-home-history-row, .mobile-home-chat-handle")) return;
      const touch = event.touches[0]!;
      let down = true;
      for (
        let node = target instanceof HTMLElement ? target : target.parentElement;
        node && node !== element;
        node = node.parentElement
      ) {
        if (node.scrollHeight > node.clientHeight + 1 && node.scrollTop > 1) down = false;
      }
      // The top strip remains a dismissal surface even when messages are scrolled.
      if (touch.clientY < element.getBoundingClientRect().top + 84) down = true;
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        dx: 0,
        dy: 0,
        time: performance.now(),
        down,
        axis: null,
      };
    };
    const move = (event: TouchEvent) => {
      if (!gesture) return;
      if (event.touches.length !== 1 || window.getSelection()?.isCollapsed === false) {
        gesture = null;
        reset();
        return;
      }
      const touch = event.touches[0]!;
      gesture.dx = touch.clientX - gesture.x;
      gesture.dy = touch.clientY - gesture.y;
      const ax = Math.abs(gesture.dx),
        ay = Math.abs(gesture.dy);
      if (!gesture.axis) {
        if (performance.now() - gesture.time > 650) {
          gesture = null;
          return;
        }
        if (ax > 12 && ax > ay * 1.4 && (historyOpen ? gesture.dx < 0 : gesture.dx > 0))
          gesture.axis = "x";
        else if (gesture.down && gesture.dy > 12 && ay > ax * 1.4) gesture.axis = "y";
        else if (ay > 12 && ay > ax * 1.4) {
          gesture = null;
          return;
        }
      }
      if (!gesture.axis || !event.cancelable) return;
      event.preventDefault();
      element.dataset.dragging = gesture.axis;
      if (gesture.axis === "x") {
        const distance = Math.min(
          element.clientWidth,
          Math.max(0, historyOpen ? -gesture.dx : gesture.dx)
        );
        views?.style.setProperty("--sheet-swipe-x", `${historyOpen ? -distance : distance}px`);
      } else element.style.setProperty("--sheet-swipe-y", `${Math.max(0, gesture.dy)}px`);
    };
    const end = () => {
      const finished = gesture;
      gesture = null;
      if (!finished) {
        reset();
        return;
      }
      const horizontal =
        finished.axis === "x" &&
        (historyOpen ? -finished.dx : finished.dx) >= Math.min(90, element.clientWidth * 0.22);
      const dismiss = finished.axis === "y" && finished.dy >= 80;
      if (finished.axis) suppressClickUntil.current = performance.now() + 400;
      if (dismiss) element.style.setProperty("--sheet-dismiss-start", `${finished.dy}px`);
      reset();
      if (horizontal) {
        onHistory(!historyOpen);
        element.focus({ preventScroll: true });
      } else if (dismiss) onDismiss();
    };
    const cancel = () => {
      gesture = null;
      reset();
    };
    const click = (event: MouseEvent) => {
      if (event.detail === 0 || (event instanceof PointerEvent && event.pointerType !== "touch"))
        return;
      if (performance.now() < suppressClickUntil.current) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    element.addEventListener("touchstart", start, { passive: true });
    element.addEventListener("touchmove", move, { passive: false });
    element.addEventListener("touchend", end);
    element.addEventListener("touchcancel", cancel);
    element.addEventListener("click", click, true);
    return () => {
      element.removeEventListener("touchstart", start);
      element.removeEventListener("touchmove", move);
      element.removeEventListener("touchend", end);
      element.removeEventListener("touchcancel", cancel);
      element.removeEventListener("click", click, true);
      reset();
    };
  }, [element, historyOpen, onHistory, onDismiss]);
}
