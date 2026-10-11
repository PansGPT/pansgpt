"use client";

import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { ProgressBar } from "./progress";
import { UploadAsset, type UploadAssetName } from "./upload-assets";

export type UploadRejection = { file: File; reason: "type" | "size" | "multiple" };
export type FileDropzoneProps = Omit<
  ComponentProps<"div">,
  "children" | "onDrop" | "onDragEnter" | "onDragLeave" | "onDragOver"
> & {
  onFilesSelected: (files: File[]) => void;
  onFilesRejected?: (files: UploadRejection[]) => void;
  accept?: string;
  multiple?: boolean;
  maxBytes?: number;
  disabled?: boolean;
  name?: string;
  hint?: ReactNode;
  uploadLabel?: string;
  inputLabel?: string;
  showDragHint?: boolean;
  state?: "default" | "hover" | "disabled";
};

function acceptsFile(file: File, accept?: string): boolean {
  if (!accept?.trim()) return true;
  return accept.split(",").some((value) => {
    const type = value.trim().toLowerCase();
    if (!type) return false;
    if (type === "*/*") return true;
    if (type.startsWith(".")) return file.name.toLowerCase().endsWith(type);
    if (type.endsWith("/*")) return file.type.toLowerCase().startsWith(type.slice(0, -1));
    return file.type.toLowerCase() === type;
  });
}

export function FileDropzone({
  onFilesSelected,
  onFilesRejected,
  accept,
  multiple = true,
  maxBytes,
  disabled = false,
  name,
  hint,
  uploadLabel = "Click to upload",
  inputLabel = "Upload files",
  showDragHint = true,
  state = "default",
  className,
  ...props
}: FileDropzoneProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const inactive = disabled || state === "disabled";
  const hovered = !inactive && (dragging || state === "hover");
  const selectFiles = (files: File[]): void => {
    if (inactive) return;
    const accepted: File[] = [];
    const rejected: UploadRejection[] = [];
    for (const file of files) {
      const reason = !acceptsFile(file, accept)
        ? "type"
        : maxBytes !== undefined && file.size > maxBytes
          ? "size"
          : !multiple && accepted.length > 0
            ? "multiple"
            : undefined;
      if (reason) rejected.push({ file, reason });
      else accepted.push(file);
    }
    setError(
      rejected.length
        ? rejected
            .map(
              ({ file, reason }) =>
                `${file.name}: ${reason === "type" ? "unsupported file type" : reason === "size" ? "file exceeds the size limit" : "only one file is allowed"}.`
            )
            .join(" ")
        : ""
    );
    if (rejected.length) onFilesRejected?.(rejected);
    if (accepted.length) onFilesSelected(accepted);
  };
  return (
    <div
      {...props}
      className={cn("p-file-dropzone", className)}
      data-state={inactive ? "disabled" : hovered ? "hover" : "default"}
      onDragEnter={(event) => {
        if (inactive || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        dragDepth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!inactive) {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (!dragDepth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        selectFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        hidden
        name={name}
        accept={accept}
        multiple={multiple}
        disabled={inactive}
        aria-label={inputLabel}
        onChange={(event) => {
          selectFiles(Array.from(event.currentTarget.files ?? []));
          event.currentTarget.value = "";
        }}
      />
      <span className="p-file-dropzone-featured" aria-hidden="true">
        <UploadAsset name="dropzoneImgUploadCloud02" />
      </span>
      <div className="p-file-dropzone-text">
        <Button
          variant="link-color"
          leadingIcon={null}
          trailingIcon={null}
          disabled={inactive}
          aria-controls={inputId}
          aria-describedby={
            [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined
          }
          onClick={() => inputRef.current?.click()}
        >
          {uploadLabel}
        </Button>
        {showDragHint && <span>or drag and drop</span>}
      </div>
      {hint && (
        <div className="p-file-dropzone-hint" id={hintId}>
          {hint}
        </div>
      )}
      {hovered && showDragHint && (
        <span className="p-file-drag-example" aria-hidden="true">
          <span className="p-file-type-icon" data-file-type="jpg">
            <span className="p-file-type-page">
              <UploadAsset name="dropzoneImgPage" />
            </span>
            <span className="p-file-type-label">JPG</span>
          </span>
          <span className="p-file-drag-cursor">
            <UploadAsset name="dropzoneImgCursor" />
          </span>
        </span>
      )}
      {error && (
        <div className="p-file-dropzone-error" id={errorId} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export type UploadFileType = "pdf" | "mp4" | "fig" | "txt" | "jpg";
export function FileTypeIcon({
  type,
  solid,
}: {
  type: UploadFileType;
  solid: boolean;
}): React.ReactElement {
  const page: UploadAssetName = solid
    ? type === "mp4"
      ? "uploadImgPage3"
      : type === "fig"
        ? "uploadImgPage4"
        : "uploadItemImgPage1"
    : "uploadItemImgPage2";
  return (
    <span
      className="p-file-type-icon"
      data-file-type={type}
      data-solid={solid || undefined}
      aria-hidden="true"
    >
      <span className="p-file-type-page">
        <UploadAsset name={page} />
      </span>
      <span className="p-file-type-label">{type.toUpperCase()}</span>
    </span>
  );
}

export type FileUploadItemProps = Omit<ComponentProps<"div">, "children"> & {
  fileName: string;
  sizeLabel: string;
  status?: "uploading" | "complete" | "error";
  progress?: number;
  progressLabel?: string;
  variant?: "bar" | "fill";
  iconType?: "file-type" | "simple";
  fileType?: UploadFileType;
  showIcon?: boolean;
  errorMessage?: string;
  onRemove?: () => void;
  onRetry?: () => void;
  removeLabel?: string;
  retryLabel?: string;
  announceError?: boolean;
};

export function FileUploadItem({
  fileName,
  sizeLabel,
  status = "uploading",
  progress = 0,
  progressLabel,
  variant = "bar",
  iconType = "file-type",
  fileType = "pdf",
  showIcon = true,
  errorMessage = "Upload failed, please try again.",
  onRemove,
  onRetry,
  removeLabel,
  retryLabel = "Try again",
  announceError = true,
  className,
  ...props
}: FileUploadItemProps): React.ReactElement {
  const value =
    status === "complete"
      ? 100
      : status === "error"
        ? 0
        : Number.isFinite(progress)
          ? Math.max(0, Math.min(progress, 100))
          : 0;
  const icon: UploadAssetName =
    status === "complete"
      ? "uploadItemImgCheckCircle"
      : status === "error"
        ? "uploadItemImgXCircle"
        : "uploadItemImgUploadCloud02";
  const caption =
    variant === "fill"
      ? (progressLabel ?? `${Math.round(value)}%`)
      : status === "complete"
        ? "Complete"
        : status === "error"
          ? "Failed"
          : "Uploading...";
  const errorId = useId();
  return (
    <div
      {...props}
      className={cn("p-file-upload-item", className)}
      data-status={status}
      data-variant={variant}
      data-icon-type={iconType}
      role="group"
      aria-label={fileName}
      aria-describedby={status === "error" ? errorId : undefined}
    >
      {variant === "fill" && status === "uploading" && (
        <div
          className="p-file-upload-fill"
          role="progressbar"
          aria-label={`${fileName} upload progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          style={{ "--upload-progress": `${value}%` } as CSSProperties}
        />
      )}
      {showIcon &&
        (iconType === "file-type" ? (
          <FileTypeIcon type={fileType} solid={variant === "fill"} />
        ) : (
          <span className="p-file-simple-icon" aria-hidden="true">
            <UploadAsset name={status === "error" ? "uploadItemImgFile5" : "uploadItemImgFile04"} />
          </span>
        ))}
      <div className="p-file-upload-body">
        <div className="p-file-upload-text">
          <div className="p-file-upload-name" title={fileName}>
            {fileName}
          </div>
          {status === "error" && variant === "fill" ? (
            <div
              className="p-file-upload-description"
              id={errorId}
              role={announceError ? "alert" : undefined}
            >
              {errorMessage}
            </div>
          ) : (
            <div className="p-file-upload-meta">
              <span>{sizeLabel}</span>
              <span className="p-file-upload-divider" aria-hidden="true">
                <UploadAsset name="uploadItemImgDivider" />
              </span>
              <span
                className="p-file-upload-status"
                id={status === "error" ? errorId : undefined}
                role={status === "error" && announceError ? "alert" : undefined}
              >
                <UploadAsset name={icon} />
                {caption}
              </span>
            </div>
          )}
        </div>
        {status === "error"
          ? onRetry && (
              <Button
                variant="link-color"
                className="p-file-upload-retry"
                leadingIcon={null}
                trailingIcon={null}
                onClick={onRetry}
              >
                {retryLabel}
              </Button>
            )
          : variant === "bar" && (
              <ProgressBar
                value={value}
                showValue
                valueLabel={progressLabel}
                aria-valuetext={progressLabel}
                aria-label={`${fileName} upload progress`}
              />
            )}
      </div>
      {onRemove && (
        <button
          type="button"
          className="p-file-upload-remove"
          aria-label={removeLabel ?? `Remove ${fileName}`}
          onClick={onRemove}
        >
          <UploadAsset name="uploadItemImgTrash01" />
        </button>
      )}
    </div>
  );
}

export type UploadQueueItem = Omit<FileUploadItemProps, "onRemove" | "onRetry" | "variant"> & {
  id: string;
};
export type FileUploadProps = FileDropzoneProps & {
  items?: UploadQueueItem[];
  variant?: "bar" | "fill";
  onRemove?: (id: string) => void;
  onRetry?: (id: string) => void;
};
export function FileUpload({
  items = [],
  variant = "bar",
  onRemove,
  onRetry,
  className,
  ...dropzone
}: FileUploadProps): React.ReactElement {
  return (
    <div className={cn("p-file-upload", className)}>
      <FileDropzone {...dropzone} />
      {items.length > 0 && (
        <div className="p-file-upload-queue" role="list" aria-label="Upload queue">
          {items.map(({ id, ...item }) => (
            <div key={id} role="listitem">
              <FileUploadItem
                {...item}
                variant={variant}
                onRemove={onRemove ? () => onRemove(id) : undefined}
                onRetry={onRetry ? () => onRetry(id) : undefined}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
