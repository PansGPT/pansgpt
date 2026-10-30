"use client";
import { useEffect } from "react";
import { ComposerPrimitive, useAui, useAuiState } from "@assistant-ui/react";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";
import { ChatAttachment } from "./attachment";

/** Native assistant-ui controls, shared Home pill styling. */
export function ChatComposer({ initialDraft }: { initialDraft?: string }): React.ReactElement {
  const aui = useAui();
  useEffect(() => {
    if (initialDraft !== undefined) aui.composer().setText(initialDraft);
  }, [aui, initialDraft]);
  const busy = useAuiState(
    (state) => state.thread.isRunning || state.composer.submission !== undefined
  );
  const dictating = useAuiState((state) => state.composer.dictation != null);
  const empty = useAuiState((state) => !state.composer.text.trim());
  return (
    <ComposerPrimitive.Root
      className="study-chat-composer p-study-composer"
      data-variant="adaptive"
      compact
      onSubmit={(event) => {
        if (empty || busy || dictating) event.preventDefault();
      }}
    >
      <div className="study-chat-composer-attachments p-study-composer-attachments">
        <ComposerPrimitive.Attachments>
          {() => <ChatAttachment removable />}
        </ComposerPrimitive.Attachments>
      </div>
      <ComposerPrimitive.Input
        className="p-study-composer-input"
        aria-label="Study question"
        placeholder="Message PansGPT…"
        rows={1}
        maxLength={10000}
        autoFocus={false}
        addAttachmentOnPaste={!busy}
      />
      <div className="p-study-composer-toolbar">
        <ComposerPrimitive.AddAttachment
          type="button"
          className="p-study-composer-control"
          aria-label="Attach study material"
          disabled={busy}
          title="Attach PDF, text, PNG or JPEG (up to 4 files, 10 MB each)"
        >
          <Plus size={25} aria-hidden="true" />
        </ComposerPrimitive.AddAttachment>
        <div className="p-study-composer-actions">
          {dictating ? (
            <ComposerPrimitive.StopDictation
              className="p-study-composer-control"
              aria-label="Finish recording"
              title="Finish recording and transcribe"
            >
              <Square size={18} aria-hidden="true" />
            </ComposerPrimitive.StopDictation>
          ) : (
            <ComposerPrimitive.Dictate
              className="p-study-composer-control"
              aria-label="Voice input"
              disabled={busy}
              title="Record a question; transcription fills this input"
            >
              <Mic size={19} aria-hidden="true" />
            </ComposerPrimitive.Dictate>
          )}
          {busy ? (
            <ComposerPrimitive.Cancel
              className="p-study-composer-control p-study-composer-submit"
              aria-label="Stop generating"
              title="Stop generating"
            >
              <Square size={18} aria-hidden="true" />
            </ComposerPrimitive.Cancel>
          ) : (
            <ComposerPrimitive.Send
              className="p-study-composer-control p-study-composer-submit"
              aria-label="Send message"
              disabled={empty || busy || dictating}
            >
              <ArrowUp size={19} aria-hidden="true" />
            </ComposerPrimitive.Send>
          )}
        </div>
      </div>
      {dictating && (
        <span className="p-study-composer-status" role="status">
          Recording / transcribing…
        </span>
      )}
    </ComposerPrimitive.Root>
  );
}

export function ChatEditComposer(): React.ReactElement {
  return (
    <ComposerPrimitive.Root className="study-chat-edit">
      <ComposerPrimitive.Input aria-label="Edit question" maxLength={10000} rows={3} />
      <div>
        <ComposerPrimitive.Cancel>Cancel edit</ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send>Save as new branch</ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}
