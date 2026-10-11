import type { KeyboardEvent } from "react";

/** Select on arrow keydown so a fast keyup cannot race deferred primitive focus. */
export function navigateRadioGroup(
  event: KeyboardEvent<HTMLButtonElement>,
  options: { orientation?: "horizontal" | "vertical"; dir?: "ltr" | "rtl"; loop?: boolean }
): void {
  const keys =
    options.orientation === "horizontal" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  if (![...keys, "Home", "End"].includes(event.key)) return;
  const group = event.currentTarget.closest('[role="radiogroup"]');
  const enabled = Array.from(
    group?.querySelectorAll<HTMLButtonElement>('[role="radio"]:not(:disabled)') ?? []
  );
  if (!enabled.length) return;
  const current = enabled.indexOf(event.currentTarget);
  const rtl =
    options.orientation === "horizontal" && (options.dir ?? document.documentElement.dir) === "rtl";
  const step = event.key === keys[1] ? (rtl ? -1 : 1) : rtl ? 1 : -1;
  let next = event.key === "Home" ? 0 : event.key === "End" ? enabled.length - 1 : current + step;
  next =
    options.loop === false
      ? Math.max(0, Math.min(enabled.length - 1, next))
      : (next + enabled.length) % enabled.length;
  event.preventDefault();
  enabled[next]?.focus();
  enabled[next]?.click();
}
