"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { DialogPrimitive, Button } from "@pansgpt/ui/shell";

export function DeleteHistoryDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
}): React.ReactElement {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      setError("Failed to delete conversation history. Please retry.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          aria-describedby="delete-history-desc"
        >
          <div className="settings-confirm-icon-wrap" aria-hidden="true">
            <AlertTriangle size={24} className="settings-confirm-icon" />
          </div>
          <DialogPrimitive.Title className="settings-confirm-title">
            Delete conversation history?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description
            id="delete-history-desc"
            className="settings-confirm-description"
          >
            This will permanently remove your stored conversations and messages from this device and
            your university account. This action cannot be undone.
          </DialogPrimitive.Description>

          {error && (
            <p className="settings-error-notice" role="alert">
              {error}
            </p>
          )}

          <div className="settings-confirm-actions">
            <Button
              variant="secondary"
              leadingIcon={null}
              trailingIcon={null}
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleConfirm()}
              className="settings-button-danger"
            >
              {busy ? "Deleting…" : "Delete all chats"}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
