"use client";
import { useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button, DialogPrimitive } from "@pansgpt/ui/shell";
import { SettingsRow } from "../settings-row";
export function HelpSection(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const message = useRef<HTMLTextAreaElement>(null);
  const messageId = useId();
  const descriptionId = useId();
  return (
    <>
      <SettingsRow
        title="Send feedback"
        description="Share an idea or report a problem."
        chevron
        onClick={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setOpen(true);
        }}
      />
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="settings-confirm-overlay" />
          <DialogPrimitive.Content
            className="settings-confirm-dialog settings-feedback-dialog"
            aria-describedby={descriptionId}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              message.current?.focus();
            }}
            onCloseAutoFocus={(event) => {
              if (opener.current) {
                event.preventDefault();
                opener.current.focus();
              }
            }}
          >
            <div className="settings-shortcuts-header">
              <DialogPrimitive.Title className="settings-confirm-title">
                Send feedback
              </DialogPrimitive.Title>
              <DialogPrimitive.Close className="settings-close-button" aria-label="Close feedback">
                <X size={18} />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description
              id={descriptionId}
              className="settings-confirm-description"
            >
              Share an idea or report a problem.
            </DialogPrimitive.Description>
            <div className="settings-feedback">
              <label htmlFor={messageId}>Your message</label>
              <textarea
                ref={message}
                id={messageId}
                className="settings-input"
                rows={4}
                placeholder="Share an idea or describe a problem..."
              />
              <Button leadingIcon={null} trailingIcon={null} disabled>
                Send feedback
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
