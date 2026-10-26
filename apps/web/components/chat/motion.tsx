"use client";

import { useLayoutEffect, useRef } from "react";
import "./transitions.css";
import "./motion.css";

function motionMilliseconds(element: HTMLElement, name: string, fallback: number): number {
  const value = Number.parseFloat(getComputedStyle(element).getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

export function MatrixLoader(): React.ReactElement {
  const root = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const cycle = motionMilliseconds(element, "--matrix-cycle", 1200);
    element.querySelectorAll<HTMLElement>("i").forEach((dot, index) => {
      // Upstream's second demo: a scattered twinkle, not the column-scan variant.
      const order = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];
      dot.style.setProperty("--d", String(Math.round(((order[index] ?? 0) * cycle) / 16)));
    });
  }, []);
  return (
    <span ref={root} className="t-matrix" data-variant="twinkle" aria-hidden="true">
      {Array.from({ length: 16 }, (_, index) => (
        <i key={index} />
      ))}
    </span>
  );
}

/** Animate real backend updates; there is no timer that invents the next activity. */
export function ThinkingStatus({ label = "Thinking…" }: { label?: string }): React.ReactElement {
  const root = useRef<HTMLSpanElement>(null);
  const live = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const box = root.current;
    if (!box) return;
    box.querySelectorAll(".is-exit").forEach((element) => element.remove());
    const leaving = live.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (leaving) leaving.classList.add("is-exit");
    const next = document.createElement("span");
    next.className = `t-think-text${leaving && !reduced ? " is-enter-start" : ""}`;
    next.textContent = label;
    next.dataset.text = label;
    next.setAttribute("aria-hidden", "true");
    box.appendChild(next);
    live.current = next;
    const gap = reduced ? 0 : motionMilliseconds(box, "--think-gap", 50);
    const duration = reduced ? 0 : motionMilliseconds(box, "--think-swap", 150);
    const release = setTimeout(() => {
      void next.offsetWidth;
      next.classList.remove("is-enter-start");
    }, gap);
    const cleanup = setTimeout(() => leaving?.remove(), gap + duration);
    return () => {
      clearTimeout(release);
      clearTimeout(cleanup);
    };
  }, [label]);
  return (
    <span className="study-chat-thinking-state">
      <MatrixLoader />
      <span ref={root} className="t-think" role="status" aria-live="polite" aria-atomic="true">
        <span className="t-think-sizer" aria-hidden="true">
          {label}
        </span>
        <span className="p-sr-only">{label}</span>
      </span>
    </span>
  );
}
