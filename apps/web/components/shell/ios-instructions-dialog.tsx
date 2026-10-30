"use client";

import { Share, PlusSquare, Smartphone, Check } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";

export function IosInstructionsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.ReactElement {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          style={{ width: "min(460px, 94vw)" }}
          aria-describedby="ios-install-desc"
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                background: "color-mix(in srgb, var(--fg-brand-primary-600) 14%, transparent)",
                color: "var(--fg-brand-primary-600)",
                flex: "none",
              }}
            >
              <Smartphone size={22} aria-hidden="true" />
            </div>
            <div>
              <DialogPrimitive.Title className="settings-confirm-title">
                Install PansGPT on iOS
              </DialogPrimitive.Title>
              <p
                id="ios-install-desc"
                style={{
                  margin: "2px 0 0",
                  fontSize: "12px",
                  color: "var(--text-tertiary-600)",
                }}
              >
                Add PansGPT directly to your iPhone or iPad Home Screen
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              margin: "12px 0 6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                  fontWeight: 600,
                  fontSize: "11px",
                  flex: "none",
                }}
              >
                1
              </div>
              <div>
                Open <strong>Safari</strong> on your iPhone or iPad and navigate to{" "}
                <code
                  style={{
                    background: "var(--bg-secondary)",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "12px",
                  }}
                >
                  pansgpt.com
                </code>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                  fontWeight: 600,
                  fontSize: "11px",
                  flex: "none",
                }}
              >
                2
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                Tap the <strong>Share</strong> button{" "}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                  }}
                >
                  <Share size={13} style={{ marginRight: "4px" }} /> Share
                </span>{" "}
                in Safari&apos;s bottom toolbar.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                  fontWeight: 600,
                  fontSize: "11px",
                  flex: "none",
                }}
              >
                3
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                Scroll down and select{" "}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                  }}
                >
                  <PlusSquare size={13} style={{ marginRight: "4px" }} /> Add to Home Screen
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                fontSize: "13px",
                lineHeight: "1.5",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                  fontWeight: 600,
                  fontSize: "11px",
                  flex: "none",
                }}
              >
                4
              </div>
              <div>
                Tap <strong>Add</strong> in the top-right corner. PansGPT will launch full-screen
                with offline monograph access!
              </div>
            </div>
          </div>

          <div className="settings-confirm-actions" style={{ marginTop: "16px" }}>
            <button
              type="button"
              className="settings-button-manage"
              style={{
                background: "var(--fg-brand-primary-600)",
                color: "#ffffff",
                border: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => onOpenChange(false)}
            >
              <Check size={14} /> Got it
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
