"use client";

import { useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";

const shownGuides = new Set<string>();
export function hasSeenReaderGuide(ownerId: string): boolean {
  if (shownGuides.has(ownerId)) return true;
  try {
    return localStorage.getItem(`pansgpt_reader_guide_seen_${ownerId}`) === "true";
  } catch {
    return false;
  }
}
export function rememberReaderGuide(ownerId: string): void {
  shownGuides.add(ownerId);
  try {
    localStorage.setItem(`pansgpt_reader_guide_seen_${ownerId}`, "true");
  } catch {
    /* Keep the preference for this session if browser storage is unavailable. */
  }
}

const steps = [
  {
    title: "AI Chat",
    gif: "/reader-guide/ai-chat.gif",
    description:
      "Ask about the open PDF or add supporting materials. Tap the chat icon at the bottom to open your conversation.",
  },
  {
    title: "Snip Tool",
    gif: "/reader-guide/snip.gif",
    description:
      "Tap the scissors, then draw a box over a diagram, table or image. Ask AI sends it straight to chat. Add to chat input adds only the image so you can write your own question.",
  },
  {
    title: "Text Highlights",
    gif: "/reader-guide/highlight.gif",
    description:
      "Finish selecting text to reveal Explain, Copy and More. Explain and the actions in More send your selection straight to chat.",
  },
] as const;

function subscribeMotion(notify: () => void): () => void {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

function TutorialSteps({ onClose }: { onClose: () => void }): React.ReactElement {
  const [step, setStep] = useState(0);
  const [animation, setAnimation] = useState<boolean | null>(null);
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
  const playing = animation ?? !reduced;
  const current = steps[step]!;
  const last = step === steps.length - 1;
  function goTo(next: number): void {
    setStep(next);
    setAnimation(null);
  }
  return (
    <>
      <div className="reader-guide-demo">
        {playing ? (
          <>
            {/* Native GIF playback preserves the original legacy demonstration. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.gif}
              alt={`${current.title} demonstration`}
              width={634}
              height={381}
            />
            <button
              type="button"
              className="reader-guide-playback"
              aria-label="Pause demonstration"
              onClick={() => setAnimation(false)}
            >
              <Pause size={15} />
            </button>
          </>
        ) : (
          <button type="button" className="reader-guide-play" onClick={() => setAnimation(true)}>
            <Play size={24} />
            <span>Play demonstration</span>
          </button>
        )}
        <DialogPrimitive.Close className="reader-guide-close" aria-label="Close study mode guide">
          <X size={16} />
        </DialogPrimitive.Close>
      </div>
      <div className="reader-guide-copy" aria-live="polite">
        <p>Study Mode Guide</p>
        <DialogPrimitive.Title>{current.title}</DialogPrimitive.Title>
        <DialogPrimitive.Description>{current.description}</DialogPrimitive.Description>
      </div>
      <footer className="reader-guide-footer">
        <div className="reader-guide-dots" aria-label="Guide steps">
          {steps.map((item, index) => (
            <button
              type="button"
              key={item.title}
              aria-label={`Show ${item.title} guide`}
              aria-current={index === step ? "step" : undefined}
              onClick={() => goTo(index)}
            >
              <span />
            </button>
          ))}
        </div>
        <div className="reader-guide-navigation">
          {step > 0 && (
            <button type="button" onClick={() => goTo(step - 1)}>
              <ChevronLeft size={16} />
              Back
            </button>
          )}
          <button
            type="button"
            className="reader-guide-next"
            onClick={() => (last ? onClose() : goTo(step + 1))}
          >
            {last ? "Get started" : "Next"}
            {!last && <ChevronRight size={16} />}
          </button>
        </div>
      </footer>
    </>
  );
}

export function ReaderTutorial({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="reader-dialog-overlay" />
        <DialogPrimitive.Content
          className="reader-guide"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            Array.from(document.querySelectorAll<HTMLElement>('[aria-label="Open reader help"]'))
              .find((button) => button.offsetParent !== null)
              ?.focus();
          }}
        >
          <TutorialSteps onClose={() => onOpenChange(false)} />
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
