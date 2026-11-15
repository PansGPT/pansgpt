"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import { useSheetSwipe } from "./use-sheet-swipe";
import "./mobile-home-chat.css";

/** Shared Home/reader surface; conversation runtimes stay outside its portal. */
export function MobileChatSheet({
  open,
  onOpenChange,
  historyOpen,
  onHistoryChange,
  title,
  description,
  returnFocus,
  contentRef,
  children,
  className = "",
  closeLabel = "Close chat",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  historyOpen: boolean;
  onHistoryChange: (open: boolean) => void;
  title: string;
  description: string;
  returnFocus: RefObject<HTMLElement | null>;
  contentRef?: (node: HTMLDivElement | null) => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}): React.ReactElement {
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const bind = useCallback(
    (node: HTMLDivElement | null) => {
      surfaceRef.current = node;
      setSurface(node);
      contentRef?.(node);
    },
    [contentRef]
  );
  const dismiss = useCallback(() => onOpenChange(false), [onOpenChange]);
  useSheetSwipe(surface, historyOpen, onHistoryChange, dismiss);
  useEffect(() => {
    if (!surface || !open) return;
    const viewport = window.visualViewport;
    const update = () => {
      surface.style.setProperty(
        "--chat-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`
      );
      surface.style.setProperty("--chat-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [surface, open]);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="mobile-home-chat-overlay" />
        <DialogPrimitive.Content
          ref={bind}
          className={`mobile-home-chat-sheet ${className}`}
          onInteractOutside={(event) => {
            const original = event.detail.originalEvent;
            if (original?.type === "focusin") {
              event.preventDefault();
              return;
            }
            const target = original?.target;
            if (target instanceof Element && target.closest("[data-chat-overlay]"))
              event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (document.querySelector('[data-chat-overlay][data-state="open"]'))
              event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            surfaceRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus.current?.focus({ preventScroll: true });
          }}
        >
          <DialogPrimitive.Title className="p-sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="p-sr-only">
            {description}
          </DialogPrimitive.Description>
          <DialogPrimitive.Close className="mobile-home-chat-handle" aria-label={closeLabel}>
            <span />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
