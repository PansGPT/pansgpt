"use client";
import { useEffect, useLayoutEffect, useRef } from "react";
import {
  ComposerPrimitive,
  getExternalStoreMessages,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { ArrowUp, Info, Mic, Plus, Square } from "lucide-react";
import type { ChatMessageView } from "@pansgpt/types";
import { Tooltip } from "@pansgpt/ui/shell";
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const text = useAuiState((state) => state.composer.text);
  const originalText = useAuiState(
    (state) => getExternalStoreMessages<ChatMessageView>(state.message)[0]?.content ?? ""
  );
  const changed = text.trim().length > 0 && text !== originalText;

  useLayoutEffect(() => {
    const input = inputRef.current;
    const measure = measureRef.current;
    if (!input || !measure) return;
    fitEditInput(input, measure);
  }, [text]);

  useEffect(() => {
    const input = inputRef.current;
    const measure = measureRef.current;
    const parent = input?.closest(".study-chat-edit")?.parentElement;
    if (!input || !measure || !parent || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitEditInput(input, measure));
    observer.observe(parent);
    return () => observer.disconnect();
  }, []);

  return (
    <ComposerPrimitive.Root className="study-chat-edit">
      <div className="study-chat-edit-input-area">
        <ComposerPrimitive.Input
          ref={inputRef}
          aria-label="Edit question"
          autoFocus
          maxLength={10000}
          rows={1}
          onInput={(event) => {
            const measure = measureRef.current;
            if (measure) fitEditInput(event.currentTarget, measure);
          }}
        />
        <span ref={measureRef} className="study-chat-edit-measure" aria-hidden="true">
          {text || " "}
        </span>
      </div>
      <div className="study-chat-edit-actions">
        <Tooltip content="Sending creates a new branch from this question.">
          <span
            className="study-chat-edit-info"
            role="img"
            aria-label="Editing creates a new branch"
          >
            <Info size={15} aria-hidden="true" />
          </span>
        </Tooltip>
        <ComposerPrimitive.Cancel>Cancel</ComposerPrimitive.Cancel>
        <ComposerPrimitive.Send disabled={!changed}>Send</ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}

function fitEditInput(input: HTMLTextAreaElement, measure: HTMLSpanElement): void {
  const form = input.closest<HTMLElement>(".study-chat-edit");
  const inputArea = input.closest<HTMLElement>(".study-chat-edit-input-area");
  const parentWidth = form?.parentElement?.clientWidth ?? 760;
  const areaStyle = inputArea ? getComputedStyle(inputArea) : null;
  const inputStyle = getComputedStyle(input);
  const areaPadding = areaStyle
    ? Number.parseFloat(areaStyle.paddingLeft) + Number.parseFloat(areaStyle.paddingRight)
    : 0;
  const areaBorder = areaStyle
    ? Number.parseFloat(areaStyle.borderLeftWidth) + Number.parseFloat(areaStyle.borderRightWidth)
    : 0;
  const inputPadding =
    Number.parseFloat(inputStyle.paddingLeft) + Number.parseFloat(inputStyle.paddingRight);
  const inputBorder =
    Number.parseFloat(inputStyle.borderLeftWidth) + Number.parseFloat(inputStyle.borderRightWidth);
  const maximumFormWidth = Math.min(760, parentWidth * 0.85);
  const maximumInputWidth = Math.max(48, maximumFormWidth - areaPadding - areaBorder);
  const contentWidth = measure.getBoundingClientRect().width + inputPadding + inputBorder;
  input.style.width = `${Math.min(Math.max(48, contentWidth), maximumInputWidth)}px`;
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}
