"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Bug, Check, AlertCircle, X, Loader2 } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import { feedbackRequestId, SettingsError, submitFeedback } from "@/lib/settings";
import type { FeedbackCategory, FeedbackRequest } from "@pansgpt/types";

export type BugCategory =
  "ui_glitch" | "clinical_accuracy" | "document_pdf" | "payment_credits" | "other";

const CATEGORIES: { id: BugCategory; label: string }[] = [
  { id: "ui_glitch", label: "UI Glitch / Visual Bug" },
  { id: "clinical_accuracy", label: "Clinical / Pharmacy Calculation Error" },
  { id: "document_pdf", label: "PDF / Monograph Ingestion Issue" },
  { id: "payment_credits", label: "Payment / Credits Issue" },
  { id: "other", label: "Other Feedback / Feature Request" },
];

type ReportProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus?: () => void;
};
export function ReportBugDialog(props: ReportProps): React.ReactElement {
  const { session } = useAuth();
  return (
    <AccountReport
      key={session?.user.id ?? "signed-out"}
      {...props}
      token={session?.access_token}
    />
  );
}
function AccountReport({
  open,
  onOpenChange,
  returnFocus,
  token,
}: ReportProps & { token: string | undefined }): React.ReactElement {
  const [category, setCategory] = useState<BugCategory>("ui_glitch");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = useRef(true);
  const pending = useRef(false);
  const attempted = useRef<FeedbackRequest | null>(null);
  const categoryId = useId();
  const messageId = useId();
  const descriptionId = useId();
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  function resetForm(): void {
    setDescription("");
    setCategory("ui_glitch");
    attempted.current = null;
    setSubmitting(false);
    setSubmitted(false);
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (pending.current) return;
    if (!description.trim()) {
      setError("Please describe the issue before submitting.");
      return;
    }

    setSubmitting(true);
    pending.current = true;
    setError(null);

    try {
      const categories: Record<BugCategory, FeedbackCategory> = {
        ui_glitch: "bug",
        clinical_accuracy: "content",
        document_pdf: "bug",
        payment_credits: "billing",
        other: "other",
      };
      const text = description.trim();
      const mappedCategory = categories[category];
      if (
        !attempted.current ||
        attempted.current.description !== text ||
        attempted.current.category !== mappedCategory
      )
        attempted.current = {
          request_id: feedbackRequestId(),
          category: mappedCategory,
          description: text,
        };
      await submitFeedback(token, attempted.current);
      if (!active.current) return;
      setSubmitted(true);
      setDescription("");
      attempted.current = null;
    } catch (err: unknown) {
      if (active.current)
        setError(
          err instanceof SettingsError
            ? err.message
            : "Couldn't send your feedback. Please try again."
        );
    } finally {
      pending.current = false;
      if (active.current) setSubmitting(false);
    }
  }

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (pending.current) return;
        if (!next && submitted) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          style={{ width: "min(480px, 94vw)" }}
          aria-describedby={descriptionId}
          onEscapeKeyDown={(event) => {
            event.stopPropagation();
            if (pending.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            if (returnFocus) {
              event.preventDefault();
              returnFocus();
            }
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "color-mix(in srgb, #ef4444 14%, transparent)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "none",
                }}
              >
                <Bug size={18} />
              </div>
              <div>
                <DialogPrimitive.Title
                  className="settings-confirm-title"
                  style={{ fontSize: "16px" }}
                >
                  Report a bug
                </DialogPrimitive.Title>
                <DialogPrimitive.Description
                  id={descriptionId}
                  style={{
                    margin: "2px 0 0",
                    fontSize: "12px",
                    color: "var(--text-tertiary-600)",
                  }}
                >
                  Help us improve PansGPT by reporting issues or inaccuracies.
                </DialogPrimitive.Description>
              </div>
            </div>
            <DialogPrimitive.Close
              className="settings-close-button"
              aria-label="Close bug report dialog"
              disabled={submitting}
              style={{ flex: "none" }}
            >
              <X size={18} />
            </DialogPrimitive.Close>
          </div>

          {submitted ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                padding: "24px 12px",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  background: "color-mix(in srgb, #10b981 16%, transparent)",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Check size={24} />
              </div>
              <strong role="status" style={{ fontSize: "15px", color: "var(--text-primary-900)" }}>
                Report received!
              </strong>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  color: "var(--text-secondary-700)",
                  maxWidth: "340px",
                  lineHeight: "1.5",
                }}
              >
                Thank you for helping us maintain clinical accuracy and system stability. Our team
                has received your report.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                style={{
                  marginTop: "8px",
                  padding: "8px 24px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border-secondary)",
                  color: "var(--text-primary-900)",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Category Picker */}
              <div>
                <label
                  htmlFor={categoryId}
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-secondary-700)",
                    marginBottom: "6px",
                  }}
                >
                  Issue category
                </label>
                <select
                  id={categoryId}
                  disabled={submitting}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as BugCategory)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                    color: "var(--text-primary-900)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description Field */}
              <div>
                <label
                  htmlFor={messageId}
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--text-secondary-700)",
                    marginBottom: "6px",
                  }}
                >
                  What happened?
                </label>
                <textarea
                  id={messageId}
                  maxLength={4000}
                  required
                  disabled={submitting}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the bug, what you expected, or any inaccurate clinical calculation..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-secondary)",
                    color: "var(--text-primary-900)",
                    fontSize: "13px",
                    lineHeight: "1.4",
                    resize: "vertical",
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {error && (
                <div
                  role="alert"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "color-mix(in srgb, #ef4444 10%, transparent)",
                    color: "#ef4444",
                    fontSize: "12px",
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "4px",
                }}
              >
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => onOpenChange(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid var(--border-secondary)",
                    color: "var(--text-secondary-700)",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !description.trim()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 18px",
                    borderRadius: "8px",
                    background: "var(--fg-brand-primary-600)",
                    border: "none",
                    color: "#fff",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: submitting ? "not-allowed" : "pointer",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  <span>{submitting ? "Sending..." : error ? "Retry" : "Submit report"}</span>
                </button>
              </div>
            </form>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
