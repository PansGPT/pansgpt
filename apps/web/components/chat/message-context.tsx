"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { ChatActionMode, ChatMessageContext } from "@pansgpt/types";
import { chatActionTools } from "./tools";
import { useChatActions } from "./actions-context";
import { ChatLibraryPicker } from "./library-picker";
import { LibraryAttachment } from "./attachment";
import "./message-context.css";

export function MessageContextTags({
  context,
}: {
  context?: ChatMessageContext | null;
}): React.ReactElement | null {
  const action = context?.action_mode
    ? chatActionTools.find((item) => item.actionMode === context.action_mode)
    : undefined;
  const Icon = action?.icon;
  if (!action) return null;
  return (
    <span className="study-chat-message-context" role="group" aria-label="Message selections">
      {action && Icon && (
        <span className="study-chat-message-tool" data-tool-mode={action.actionMode}>
          <Icon size={15} aria-hidden="true" />
          <span>{action.name}</span>
        </span>
      )}{" "}
    </span>
  );
}

/** A separate immutable prefix over the first line of the native text input. */
export function InlineToolInput({
  mode,
  onRemove,
  className,
  hidden = false,
  children,
}: {
  mode: ChatActionMode | null;
  onRemove: () => void;
  className?: string;
  hidden?: boolean;
  children: ReactNode;
}): React.ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const prefix = useRef<HTMLSpanElement>(null);
  const action = mode ? chatActionTools.find((item) => item.actionMode === mode) : undefined;
  const Icon = action?.icon;
  useLayoutEffect(() => {
    if (!root.current || !prefix.current) return;
    const update = () => {
      root.current?.style.setProperty(
        "--tool-prefix-width",
        `${prefix.current?.getBoundingClientRect().width ?? 0}px`
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(prefix.current);
    return () => observer.disconnect();
  }, [mode]);
  useLayoutEffect(() => {
    const input = root.current?.querySelector("textarea");
    if (!input || !mode) return;
    const atStart = () => input.selectionStart === 0 && input.selectionEnd === 0;
    const remove = (event: Event) => {
      const backspace =
        event instanceof KeyboardEvent
          ? event.key === "Backspace" && !event.isComposing
          : event instanceof InputEvent &&
            event.inputType === "deleteContentBackward" &&
            !event.isComposing;
      if (backspace && atStart() && event.cancelable) {
        event.preventDefault();
        const form = input.closest("form");
        onRemove();
        // Removing the wrapper in a fresh composer can replace its textarea.
        // Keep typing at the same boundary without requiring another tap.
        requestAnimationFrame(() => {
          const current = form?.querySelector("textarea");
          current?.focus();
          current?.setSelectionRange(0, 0);
        });
      }
    };
    input.addEventListener("keydown", remove);
    input.addEventListener("beforeinput", remove);
    return () => {
      input.removeEventListener("keydown", remove);
      input.removeEventListener("beforeinput", remove);
    };
  }, [mode, onRemove]);
  if (!action && !className) return <>{children}</>;
  return (
    <div
      ref={root}
      hidden={hidden}
      className={`study-chat-inline-input ${className ?? ""}`}
      data-tool-prefix={!!action}
    >
      {action && Icon && (
        <span ref={prefix} className="study-chat-input-prefix">
          <Icon size={15} aria-hidden="true" />
          <span>{action.name}</span>
        </span>
      )}
      {children}
    </div>
  );
}

export function EditMessageContext({
  context,
  onChange,
}: {
  context: ChatMessageContext;
  onChange: (context: ChatMessageContext) => void;
}): React.ReactElement {
  const actions = useChatActions();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const update = onChange;
  return (
    <div className="study-chat-context-editor">
      {context.library_document && (
        <LibraryAttachment
          source={context.library_document}
          onRemove={
            actions.fixedDocumentId
              ? undefined
              : () => update({ ...context, library_document: null })
          }
        />
      )}
      {!actions.fixedDocumentId && !context.library_document && (
        <button
          type="button"
          className="study-chat-edit-source"
          onClick={() => setLibraryOpen(true)}
        >
          Add library document
        </button>
      )}
      <ChatLibraryPicker
        open={libraryOpen}
        revision={0}
        onOpenChange={setLibraryOpen}
        onSelect={(document) => {
          update({ ...context, library_document: { id: document.id, title: document.title } });
          setLibraryOpen(false);
        }}
      />
    </div>
  );
}
