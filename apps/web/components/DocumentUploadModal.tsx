"use client";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button, Input, Slideout } from "@pansgpt/ui/shell";
import { z } from "zod";
import type { LibraryUploadRequest, LibraryUploadResponse } from "@pansgpt/types";
import { env } from "@/env";
import { libraryError } from "@/lib/library-catalog";

const uploadResponse: z.ZodType<LibraryUploadResponse> = z.object({
  document_id: z.uuid(),
  storage_key: z.string(),
  presigned_upload_url: z.url().refine((value) => new URL(value).protocol === "https:"),
  expires_in_seconds: z.number().int().positive(),
});
const confirmation = z.object({
  document_id: z.uuid(),
  mode: z.enum(["queued", "sync", "no_db", "awaiting_approval"]),
  message: z.string(),
});

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: () => void;
  userRole: string;
  token?: string;
}

export function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  userRole,
  token,
}: DocumentUploadModalProps): React.ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [level, setLevel] = useState("300");
  const [stage, setStage] = useState<
    "idle" | "preparing" | "uploading" | "confirming" | "complete"
  >("idle");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const busy = stage !== "idle" && stage !== "complete";
  const permitted = ["lecturer", "university_admin", "super_admin"].includes(userRole);
  useEffect(() => () => pending.current?.abort(), []);
  function close(): void {
    pending.current?.abort();
    onClose();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!file || !token || !permitted || busy) return;
    if (
      !file.name.toLowerCase().endsWith(".pdf") ||
      (file.type && file.type !== "application/pdf")
    ) {
      setError("Please choose a PDF document.");
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setError(null);
    setStage("preparing");
    const payload: LibraryUploadRequest = {
      title: title.trim(),
      course_code: courseCode.trim().toUpperCase(),
      course_title: courseTitle.trim(),
      target_levels: [level],
      file_name: file.name,
      mime_type: "application/pdf",
      file_size_bytes: file.size,
    };
    try {
      const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/api/v1/library/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!response.ok)
        throw await libraryError(
          response,
          response.status === 413
            ? "This file exceeds the upload limit. Please choose a smaller PDF."
            : "We couldn't prepare the upload. Please check your details and try again."
        );
      const upload = uploadResponse.parse(await response.json());
      setStage("uploading");
      const transferred = await fetch(upload.presigned_upload_url, {
        method: "PUT",
        headers: { "Content-Type": "application/pdf" },
        body: file,
        signal: controller.signal,
      });
      if (!transferred.ok) throw new Error("The file transfer failed. Please try again.");
      setStage("confirming");
      const confirmed = await fetch(
        `${env.NEXT_PUBLIC_API_URL}/api/v1/library/${upload.document_id}/confirm-upload`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        }
      );
      if (!confirmed.ok)
        throw await libraryError(
          confirmed,
          "The file was transferred, but processing could not start. Please contact your administrator before uploading it again."
        );
      const result = confirmation.parse(await confirmed.json());
      if (result.document_id !== upload.document_id || result.mode === "no_db")
        throw new Error(
          "We couldn't verify that the material was saved. Please contact your administrator."
        );
      if (controller.signal.aborted) return;
      setMessage(
        result.mode === "awaiting_approval"
          ? "Your material was submitted for university approval."
          : "Your material was uploaded. Processing will continue in the background."
      );
      setStage("complete");
      onUploadSuccess?.();
    } catch (cause: unknown) {
      if (controller.signal.aborted) return;
      setError(
        cause instanceof Error && cause.name !== "ZodError"
          ? cause.message
          : "The upload could not be verified. Please try again."
      );
      setStage("idle");
    }
  }
  return (
    <Slideout
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={userRole === "lecturer" ? "Submit course material" : "Upload course material"}
      description={
        userRole === "lecturer"
          ? "Your university reviews submitted materials before students can access them."
          : "Share a PDF with your university’s library."
      }
      className="library-upload-dialog"
    >
      {!permitted ? (
        <p>Only university administrators and lecturers can submit course materials.</p>
      ) : stage === "complete" ? (
        <div className="library-upload-success">
          <FileText size={32} />
          <h3>Material received</h3>
          <p role="status">{message}</p>
          <Button leadingIcon={null} trailingIcon={null} onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <form className="library-upload-form" onSubmit={(event) => void submit(event)}>
          <label className="library-upload-file">
            <Upload size={26} />
            <strong>{file?.name || "Choose a PDF document"}</strong>
            <span>Your original document will be stored privately.</span>
            <input
              aria-label="PDF document"
              type="file"
              accept=".pdf,application/pdf"
              disabled={busy}
              required
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setFile(next);
                setError(null);
                if (next && !title) setTitle(next.name.replace(/\.pdf$/i, ""));
              }}
            />
          </label>
          <Input
            label="Document title"
            required
            minLength={2}
            maxLength={255}
            value={title}
            disabled={busy}
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            label="Course code"
            required
            minLength={2}
            maxLength={20}
            placeholder="e.g. PCL 401"
            value={courseCode}
            disabled={busy}
            onChange={(event) => setCourseCode(event.target.value)}
          />
          <Input
            label="Course title"
            required
            minLength={2}
            maxLength={255}
            placeholder="e.g. Clinical Pharmacology"
            value={courseTitle}
            disabled={busy}
            onChange={(event) => setCourseTitle(event.target.value)}
          />
          <label className="library-upload-level">
            Target academic level
            <select
              aria-label="Target academic level"
              disabled={busy}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            >
              {[100, 200, 300, 400, 500, 600].map((value) => (
                <option key={value} value={value}>
                  {value} Level
                </option>
              ))}
            </select>
          </label>
          {error && (
            <p className="library-inline-error" role="alert">
              {error}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy || !file || !token}
            leadingIcon={<Upload size={16} />}
            trailingIcon={null}
          >
            {stage === "preparing"
              ? "Preparing upload…"
              : stage === "uploading"
                ? "Uploading PDF…"
                : stage === "confirming"
                  ? "Confirming upload…"
                  : userRole === "lecturer"
                    ? "Submit for approval"
                    : "Upload material"}
          </Button>
        </form>
      )}
    </Slideout>
  );
}
