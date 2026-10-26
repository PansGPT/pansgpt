"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
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
      dot.style.setProperty("--d", String(Math.round(((index % 4) * cycle) / 10)));
    });
  }, []);
  return (
    <span ref={root} className="t-matrix" data-variant="scan" aria-hidden="true">
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

const StreamReveal = createContext<{ active: boolean; seen: Set<number> } | null>(null);

export function StreamRevealProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}): React.ReactElement {
  const seen = useMemo(() => new Set<number>(), []);
  const value = useMemo(() => ({ active, seen }), [active, seen]);
  return <StreamReveal.Provider value={value}>{children}</StreamReveal.Provider>;
}

/** Stable source offsets prevent Markdown restructuring from replaying previous prose. */
export function StreamingWord({
  offset,
  children,
}: {
  offset: number;
  children: ReactNode;
}): React.ReactElement {
  const context = useContext(StreamReveal);
  const root = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = root.current;
    if (!element || !context) return;
    if (!context.active || context.seen.has(offset)) {
      context.seen.add(offset);
      element.classList.add("is-in");
      return;
    }
    context.seen.add(offset);
    void element.offsetWidth;
    // Reveal this arriving batch immediately; no artificial word queue or replay.
    const frame = requestAnimationFrame(() => element.classList.add("is-in"));
    return () => cancelAnimationFrame(frame);
  }, [context, offset]);
  return (
    <span ref={root} className="t-stream-w" data-stream-offset={offset}>
      {children}
    </span>
  );
}
