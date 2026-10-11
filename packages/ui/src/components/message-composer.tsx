"use client";

import { useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Input, Textarea } from "./field";
import { MessageAsset } from "./message-assets";

export type MessageComposerProps = Omit<ComponentProps<"form">, "onSubmit" | "onChange"> & {
  variant?: "minimal" | "textarea" | "advanced";
  label: string;
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
  pending?: boolean;
  onAttach?: () => void;
  onEmoji?: () => void;
  onRecord?: () => void;
  onShortcuts?: () => void;
  contextLabel?: string;
  contextAvatar?: ReactNode;
  onContextChange?: () => void;
};
export function MessageComposer({
  variant = "minimal",
  label,
  placeholder,
  value,
  defaultValue = "",
  onValueChange,
  onSend,
  disabled = false,
  pending = false,
  onAttach,
  onEmoji,
  onRecord,
  onShortcuts,
  contextLabel,
  contextAvatar,
  onContextChange,
  className,
  ...props
}: MessageComposerProps): React.ReactElement {
  const [draft, setDraft] = useState(defaultValue);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const current = useRef(value ?? draft);
  current.current = value ?? draft;
  const errorId = useId();
  const text = value ?? draft;
  const blocked = disabled || pending || sending;
  const change = (next: string): void => {
    current.current = next;
    if (value === undefined) setDraft(next);
    onValueChange?.(next);
    setError("");
  };
  const send = async (): Promise<void> => {
    if (busy.current || blocked || !current.current.trim()) return;
    const snapshot = current.current;
    busy.current = true;
    setSending(true);
    setError("");
    try {
      await onSend(snapshot.trim());
      if (current.current === snapshot) change("");
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Message could not be sent. Try again."
      );
    } finally {
      busy.current = false;
      setSending(false);
    }
  };
  const fieldProps = {
    "aria-label": label,
    "aria-describedby": error ? errorId : undefined,
    "aria-invalid": Boolean(error),
    placeholder: placeholder ?? (variant === "advanced" ? "Ask me anything..." : "Message"),
    value: text,
    disabled: disabled || pending,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      change(event.currentTarget.value),
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        void send();
      }
    },
  };
  const utility = (
    name:
      | "primitive4_imgMicrophone02"
      | "primitive4_imgRecording02"
      | "primitive4_imgAttachment2"
      | "primitive4_imgFaceSmile",
    actionLabel: string,
    action?: () => void
  ): ReactNode => (
    <button
      type="button"
      className="p-message-composer-utility"
      aria-label={actionLabel}
      disabled={blocked || !action}
      onClick={action}
    >
      <MessageAsset name={name} />
    </button>
  );
  return (
    <form
      {...props}
      className={cn("p-message-composer", className)}
      data-variant={variant}
      aria-label={props["aria-label"] ?? label}
      aria-busy={pending || sending}
      onSubmit={(event) => {
        event.preventDefault();
        void send();
      }}
    >
      {variant === "minimal" ? (
        <>
          <Input {...fieldProps} size="md" />
          <button
            type="submit"
            className="p-message-composer-send"
            aria-label="Send message"
            disabled={blocked || !text.trim()}
          >
            <MessageAsset name="primitive4_imgSend01" />
          </button>
        </>
      ) : (
        <>
          <Textarea {...fieldProps} resizable={false} rows={3} />
          <span className="p-message-composer-record">
            {utility(
              variant === "advanced" ? "primitive4_imgMicrophone02" : "primitive4_imgRecording02",
              "Record audio",
              onRecord
            )}
          </span>
          {variant === "advanced" ? (
            <>
              <MessageAsset
                className="p-message-composer-resize"
                name="primitive4_imgResizeHandle"
              />
              <div className="p-message-composer-footer">
                <button
                  type="button"
                  className="p-message-composer-context"
                  aria-label="Change message context"
                  disabled={blocked || !onContextChange}
                  onClick={onContextChange}
                >
                  {contextAvatar}
                  <span>{contextLabel}</span>
                  <MessageAsset name="primitive4_imgChevronDown" />
                </button>
                <button type="button" disabled={blocked || !onShortcuts} onClick={onShortcuts}>
                  <MessageAsset name="primitive4_imgItalicSquare" />
                  Shortcuts
                </button>
                <button type="button" disabled={blocked || !onAttach} onClick={onAttach}>
                  <MessageAsset name="primitive4_imgAttachment01" />
                  Attach
                </button>
              </div>
            </>
          ) : (
            <div className="p-message-composer-actions">
              {utility("primitive4_imgAttachment2", "Attach file", onAttach)}
              {utility("primitive4_imgFaceSmile", "Add emoji", onEmoji)}
              <button type="submit" disabled={blocked || !text.trim()}>
                Send
              </button>
            </div>
          )}
        </>
      )}
      {error && (
        <div id={errorId} className="p-message-composer-error" role="alert">
          {error}
        </div>
      )}
    </form>
  );
}
