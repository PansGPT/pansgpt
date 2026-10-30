"use client";
import { X } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";

export function ShortcutsDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: () => void;
}): React.ReactElement {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="shortcuts-description"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            returnFocus();
          }}
        >
          <div className="settings-shortcuts-header">
            <DialogPrimitive.Title className="settings-confirm-title">
              Keyboard shortcuts
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="settings-close-button"
              aria-label="Close keyboard shortcuts"
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description id="shortcuts-description" className="p-sr-only">
            Quick keyboard controls for PansGPT.
          </DialogPrimitive.Description>
          <dl className="settings-shortcuts-list">
            <div>
              <dt>Search</dt>
              <dd>
                <kbd>Ctrl / Cmd + K</kbd>
              </dd>
            </div>
            <div>
              <dt>New line</dt>
              <dd>
                <kbd>Shift + Enter</kbd>
              </dd>
            </div>
            <div>
              <dt>Close a dialog</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
          </dl>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
