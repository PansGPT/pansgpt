"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { GovernanceBatchResult, GovernanceRecord } from "@pansgpt/types";
import type { GovernanceAdapter } from "@/lib/governance-api";
import { Button, Dialog, Select } from "./primitives";
export function BatchEditor({
  rows,
  adapter,
  scope,
  close,
  saved,
}: {
  rows: GovernanceRecord[];
  adapter: GovernanceAdapter;
  scope: string;
  close: () => void;
  saved: (message: string) => void;
}): React.ReactElement {
  const [mode, setMode] = useState("subscription_tier");
  const [value, setValue] = useState("pro");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GovernanceBatchResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const response = await adapter.batch(
        new URLSearchParams(scope ? { university_id: scope } : {}),
        rows.map((row) => ({
          action: mode === "suspend" ? "suspend" : "update",
          id: row.id,
          expected_version: row.updated_at,
          reason,
          fields: mode === "suspend" ? {} : { [mode]: value },
        })),
        controller.current.signal
      );
      setResult(response);
    } catch (error) {
      if (!controller.current.signal.aborted)
        setError(
          error instanceof Error ? error.message : "The batch could not be completed. Please retry."
        );
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }
  return (
    <Dialog
      title={`Update ${rows.length} selected student${rows.length === 1 ? "" : "s"}`}
      description="Each account is checked and updated independently. You’ll see the result for every student."
      close={() =>
        result
          ? saved("Batch results recorded. Refresh a failed account before trying again.")
          : close()
      }
      busy={busy}
    >
      {result ? (
        <>
          <ul className="gov-batch-results">
            {result.items.map((item) => (
              <li key={item.id}>
                <strong>{rows.find((row) => row.id === item.id)?.title ?? "Student"}</strong>
                <span data-success={item.success}>{item.success ? "Updated" : item.message}</span>
              </li>
            ))}
          </ul>
          <div className="gov-dialog-actions">
            <Button
              onClick={() =>
                saved(
                  `${result.items.filter((item) => item.success).length} of ${rows.length} students updated.`
                )
              }
            >
              Done
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit}>
          <fieldset disabled={busy} className="gov-form-fields">
            <Select
              label="Change to apply"
              value={mode}
              onChange={(e) => {
                setMode(e.target.value);
                setValue(e.target.value === "current_level" ? "400" : "pro");
              }}
            >
              <option value="subscription_tier">Subscription tier</option>
              <option value="current_level">Academic level</option>
              <option value="suspend">Suspend access</option>
            </Select>
            {mode !== "suspend" && (
              <Select label="New value" value={value} onChange={(e) => setValue(e.target.value)}>
                {(mode === "current_level"
                  ? ["100", "200", "300", "400", "500", "600"]
                  : ["free", "pro"]
                ).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
            )}
            <label className="gov-field gov-field-wide">
              <span>Reason for this change</span>
              <textarea
                required
                minLength={3}
                maxLength={1000}
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <p className="gov-inline-note gov-field-wide">
              Selected: {rows.map((row) => row.title).join(", ")}
            </p>
          </fieldset>
          {error && (
            <p className="gov-form-error" role="alert">
              {error}
            </p>
          )}
          <div className="gov-dialog-actions">
            <Button variant="secondary" disabled={busy} onClick={close}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={busy}
              loadingText="Updating students…"
              destructive={mode === "suspend"}
            >
              Apply to {rows.length} students
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
