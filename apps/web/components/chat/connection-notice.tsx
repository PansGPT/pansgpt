"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, AlertTriangle, Info, RotateCcw, X } from "lucide-react";
import { useChatActions } from "./actions-context";

function subscribe(notify: () => void): () => void {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}

function subscribeMobile(notify: () => void): () => void {
  const query = window.matchMedia("(max-width: 860px)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

const mobileCopy: Record<string, string> = {
  "You're offline. Your draft is kept. Reconnect to send a message.":
    "You're offline. Reconnect to send.",
  "You're offline. Check your connection and try again.": "You're offline. Reconnect to send.",
  "Something went wrong. Please try again.": "Something went wrong. Try again.",
  "The response could not be completed. Please try again.": "Couldn't finish. Try again.",
  "This response couldn't finish. Please send a new message.":
    "Couldn't finish. Send a new message.",
  "Attach up to four files at a time.": "Up to 4 files per message.",
  "Use a question up to 10,000 characters and at most four attachments.":
    "Use a shorter message and up to 4 files.",
  "We couldn't attach that file. Choose a supported file up to 10 MB.":
    "Use a supported file under 10 MB.",
  "We couldn't attach that image. Choose a PNG or JPEG up to 10 MB.":
    "Use a PNG or JPEG under 10 MB.",
  "Choose a PNG or JPEG image up to 10 MB.": "Use a PNG or JPEG under 10 MB.",
  "We couldn't transcribe that recording. Please try again.": "Couldn't transcribe. Try again.",
  "We couldn't upload this file. Please try again.": "Couldn't upload. Try again.",
  "We couldn't attach this file. Choose it again to retry.":
    "Couldn't attach. Choose the file again.",
  "Microphone access is blocked. Allow it in your browser settings, or type your question.":
    "Allow microphone access, or type.",
  "Voice recording isn't available. You can type your question.":
    "Voice unavailable. Type your question.",
  "Your change wasn't saved. Please try again.": "Couldn't save. Try again.",
  "Your session has expired. Sign in again to continue.": "Sign in again to continue.",
  "You don't have enough credits to continue. Check your usage.":
    "Not enough credits. Check usage.",
  "We're receiving a lot of requests. Please try again shortly.": "We're busy. Try again shortly.",
  "This is taking longer than usual.": "Taking a little longer…",
};

function useChatNoticeMessage(message: string): string {
  const mobile = useSyncExternalStore(
    subscribeMobile,
    () => window.matchMedia("(max-width: 860px)").matches,
    () => false
  );
  return mobile ? (mobileCopy[message] ?? message) : message;
}

export function ChatError({
  message,
  children,
  reference,
}: {
  message: string;
  children?: ReactNode;
  reference?: string;
}): React.ReactElement {
  const copy = useChatNoticeMessage(message);
  return (
    <div
      className="study-chat-error-row"
      data-request-id={reference}
      title={reference ? `Response reference: ${reference}` : undefined}
    >
      <AlertCircle size={18} aria-hidden="true" />
      <p role="alert">{copy}</p>
      <div className="study-chat-error-actions">{children}</div>
    </div>
  );
}

export function ChatNotice({
  message,
  kind = "warning",
  role = "alert",
  children,
  onDismiss,
}: {
  message: string;
  kind?: "warning" | "info";
  role?: "alert" | "status";
  children?: ReactNode;
  onDismiss?: () => void;
}): React.ReactElement | null {
  const [dismissed, setDismissed] = useState<string | null>(null);
  const copy = useChatNoticeMessage(message);
  if (dismissed === message) return children ? <>{children}</> : null;
  const Icon = kind === "info" ? Info : AlertTriangle;
  return (
    <div className="study-chat-notice-banner" data-kind={kind}>
      <Icon className="study-chat-notice-icon" size={17} aria-hidden="true" />
      <div className="study-chat-notice-copy">
        <p role={role}>{copy}</p>
        {children}
      </div>
      <button
        type="button"
        className="study-chat-notice-dismiss"
        aria-label="Dismiss notice"
        onClick={() => {
          setDismissed(message);
          onDismiss?.();
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function ChatComposerNotices({
  error,
  attachmentError,
  actions,
  onDismissAttachmentError,
}: {
  error?: string | null;
  attachmentError?: string | null;
  actions?: ReactNode;
  onDismissAttachmentError?: () => void;
}): React.ReactElement | null {
  const { canRetryVoice, retryVoice } = useChatActions();
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
  const errors = [
    ...new Set(
      [error, attachmentError].filter(
        (message): message is string =>
          !!message && (online || !message.startsWith("You're offline."))
      )
    ),
  ];
  if (online && !errors.length) return null;
  return (
    <div className="study-chat-composer-notices">
      {!online && (
        <div className="study-chat-offline-banner" role="status">
          <AlertTriangle size={17} aria-hidden="true" />
          <p>{"You're offline. Check your connection."}</p>
        </div>
      )}
      {errors
        .filter((message) => message === error && canRetryVoice && retryVoice)
        .map((message) => (
          <ChatError key={message} message={message}>
            {actions}
          </ChatError>
        ))}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="study-chat-toast-stack" aria-label="Chat notices" data-offline={!online}>
            {errors
              .filter((message) => !(message === error && canRetryVoice && retryVoice))
              .map((message) => (
                <ChatNotice
                  key={message}
                  message={message}
                  onDismiss={message === attachmentError ? onDismissAttachmentError : undefined}
                >
                  {message === error ? actions : undefined}
                </ChatNotice>
              ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export function VoiceRecoveryAction(): React.ReactElement | null {
  const { retryVoice, canRetryVoice, online } = useChatActions();
  return canRetryVoice && retryVoice ? (
    <span className="study-chat-recovery-actions">
      <button
        type="button"
        aria-label="Retry transcription"
        disabled={online === false}
        onClick={() => void retryVoice()}
      >
        <RotateCcw size={14} aria-hidden="true" /> Retry
      </button>
    </span>
  ) : null;
}
