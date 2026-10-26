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

interface WordRevealer {
  add: (element: HTMLSpanElement, offset: number) => () => void;
  cancelPending: () => void;
}

function createWordRevealer(animate: boolean): WordRevealer {
  const seen = new Set<number>();
  const pending = new Map<number, HTMLSpanElement>();
  let frame: number | undefined;
  let nextReleaseAt = 0;
  function cancelPending(): void {
    if (frame !== undefined) cancelAnimationFrame(frame);
    frame = undefined;
    pending.clear();
  }
  return {
    cancelPending,
    add(element, offset) {
      if (
        !animate ||
        seen.has(offset) ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        seen.add(offset);
        element.style.transition = "none";
        element.classList.add("is-in");
        return () => {};
      }
      pending.set(offset, element);
      if (frame === undefined)
        frame = requestAnimationFrame(() => {
          frame = undefined;
          const words = [...pending].sort(([left], [right]) => left - right);
          pending.clear();
          const first = words[0]?.[1];
          if (!first) return;
          const now = performance.now();
          const start = Math.max(now, nextReleaseAt);
          const budget = Math.max(
            0,
            now + motionMilliseconds(first, "--stream-max-stagger", 900) - start
          );
          const gap = Math.min(
            motionMilliseconds(first, "--stream-gap", 60),
            budget / Math.max(words.length, 1)
          );
          nextReleaseAt = start + words.length * gap;
          // One flush establishes all new words' rest state. Each arriving batch resolves
          // in order, honoring the recipe's gap with a bounded visual catch-up window.
          void first.offsetWidth;
          words.forEach(([position, word], index) => {
            if (!word.isConnected) return;
            word.style.transitionDelay = `${Math.round(start - now + index * gap)}ms`;
            word.classList.add("is-in");
            // A cancelled effect has not revealed anything. Mark seen only after release,
            // so React Strict Mode can safely clean up and subscribe again before paint.
            seen.add(position);
          });
        });
      return () => {
        if (pending.get(offset) === element) pending.delete(offset);
      };
    },
  };
}

const StreamReveal = createContext<WordRevealer | null>(null);

export function StreamRevealProvider({
  animate,
  children,
}: {
  animate: boolean;
  children: ReactNode;
}): React.ReactElement {
  const value = useMemo(() => createWordRevealer(animate), [animate]);
  useLayoutEffect(() => () => value.cancelPending(), [value]);
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
    return context.add(element, offset);
  }, [context, offset]);
  return (
    <span ref={root} className="t-stream-w" data-stream-offset={offset}>
      {children}
    </span>
  );
}
