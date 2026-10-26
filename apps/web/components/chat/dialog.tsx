"use client";
import type { ReactNode } from "react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import { X } from "lucide-react";
import "./conversation-controls.css";

export function ConversationDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  onCloseAutoFocus,
  blocked = false,
  className = "",
  minimalHeader = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  onCloseAutoFocus?: (event: Event) => void;
  blocked?: boolean;
  className?: string;
  minimalHeader?: boolean;
}): React.ReactElement {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!blocked) onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="p-dialog-overlay" data-chat-overlay />
        <DialogPrimitive.Content
          data-chat-overlay
          className={`study-chat-dialog ${className}`}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            if (blocked) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            if (blocked) event.preventDefault();
          }}
        >
          <DialogPrimitive.Title className={minimalHeader ? "p-sr-only" : undefined}>
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className={minimalHeader ? "p-sr-only" : undefined}>
            {description}
          </DialogPrimitive.Description>
          {children}
          <DialogPrimitive.Close
            className="study-chat-dialog-close"
            aria-label="Close dialog"
            disabled={blocked}
          >
            <X size={18} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
