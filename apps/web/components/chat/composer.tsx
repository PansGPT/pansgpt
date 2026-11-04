"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import {
  ComposerPrimitive,
  getExternalStoreMessages,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import {
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  ArrowUp,
  Camera,
  Folder,
  Info,
  Image as ImageIcon,
  Library as LibraryIcon,
  Mic,
  Pencil,
  Plus,
  Square,
  Upload,
  X,
} from "lucide-react";
import type { ChatActionMode, ChatMessageView, LibraryDocument } from "@pansgpt/types";
import { Tooltip } from "@pansgpt/ui/shell";
import { ChatAttachment } from "./attachment";
import { UserMessageEditing } from "./message";
import { chatActionTools, moreChatActions, primaryChatActions } from "./tools";
import { ChatLibraryPicker } from "./library-picker";

type ChatComposerSlot = {
  target: HTMLDivElement | null;
  setTarget: Dispatch<SetStateAction<HTMLDivElement | null>>;
  mobileEditing: boolean;
  setMobileEditing: Dispatch<SetStateAction<boolean>>;
};

const ChatComposerSlotContext = createContext<ChatComposerSlot | null>(null);
function ignoreActionModeChange(): void {}

export function ChatComposerSlotProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const [mobileEditing, setMobileEditing] = useState(false);
  return (
    <ChatComposerSlotContext.Provider
      value={{ target, setTarget, mobileEditing, setMobileEditing }}
    >
      {children}
    </ChatComposerSlotContext.Provider>
  );
}

/** Native assistant-ui controls, shared Home pill styling. */
export function ChatComposer({
  initialDraft,
  editing = false,
  actionMode = null,
  onActionModeChange = ignoreActionModeChange,
  libraryDocument = null,
  onLibraryDocumentSelect,
}: {
  initialDraft?: string;
  editing?: boolean;
  actionMode?: ChatActionMode | null;
  onActionModeChange?: (actionMode: ChatActionMode | null) => void;
  libraryDocument?: LibraryDocument | null;
  onLibraryDocumentSelect?: (document: LibraryDocument | null) => void;
}): React.ReactElement {
  const composerSlot = useContext(ChatComposerSlotContext);
  const aui = useAui();
  const hostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [menuOrigin, setMenuOrigin] = useState<"top-left" | "bottom-left">("bottom-left");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  useEffect(() => {
    if (!editing && initialDraft !== undefined) aui.composer().setText(initialDraft);
  }, [aui, editing, initialDraft]);
  const busy = useAuiState(
    (state) => state.thread.isRunning || state.composer.submission !== undefined
  );
  const dictating = useAuiState((state) => state.composer.dictation != null);
  const empty = useAuiState((state) => !state.composer.text.trim());
  const selectedAction = actionMode
    ? chatActionTools.find((action) => action.actionMode === actionMode)
    : undefined;
  const SelectedActionIcon = selectedAction?.icon;
  const closeMenu = useCallback(
    (restoreFocus = false) => {
      if (!menuOpen) return;
      setMenuOpen(false);
      setMenuClosing(true);
      setMoreActionsOpen(false);
      const duration =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
        ) || 150;
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
      closeTimer.current = window.setTimeout(() => {
        setMenuClosing(false);
        closeTimer.current = null;
      }, duration);
      if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
    },
    [menuOpen]
  );
  const openMenu = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
    const bounds = triggerRef.current?.getBoundingClientRect();
    if (bounds) {
      const spaceAbove = bounds.top;
      const spaceBelow = window.innerHeight - bounds.bottom;
      const estimatedMenuHeight = 320;
      setMenuOrigin(
        spaceBelow >= estimatedMenuHeight || spaceBelow >= spaceAbove ? "top-left" : "bottom-left"
      );
    }
    setMoreActionsOpen(false);
    setMenuClosing(false);
    setMenuOpen(true);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const firstVisible = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []
      ).find((button) => button.getClientRects().length > 0);
      firstVisible?.focus();
    });
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !hostRef.current?.contains(event.target)) closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenu(true);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen, closeMenu]);
  useEffect(() => {
    if (!menuOpen || window.matchMedia("(min-width: 861px)").matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);
  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    []
  );
  useEffect(() => {
    if (!composerSlot?.mobileEditing) return;
    queueMicrotask(() => {
      closeMenu();
      setLibraryOpen(false);
      onActionModeChange(null);
    });
  }, [composerSlot?.mobileEditing, closeMenu, onActionModeChange]);
  function selectAction(selectedMode: ChatActionMode): void {
    onActionModeChange(selectedMode);
    closeMenu();
    window.requestAnimationFrame(() =>
      hostRef.current
        ?.querySelector<HTMLTextAreaElement>(".study-chat-composer .p-study-composer-input")
        ?.focus()
    );
  }
  function addImageFiles(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    setAttachmentError(null);
    void (async () => {
      const attachedCount = aui.composer().getState().attachments.length;
      if (attachedCount + files.length > 4) {
        setAttachmentError("Attach up to four files at a time.");
        return;
      }
      for (const file of files) {
        if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 10 * 1024 * 1024) {
          setAttachmentError("Choose a PNG or JPEG image up to 10 MB.");
          return;
        }
        try {
          await aui.composer().addAttachment(file);
        } catch {
          setAttachmentError("We couldn't attach that image. Choose a PNG or JPEG up to 10 MB.");
          return;
        }
      }
    })();
  }
  const actionMenu = (
    <>
      {(menuOpen || menuClosing) && (
        <button
          type="button"
          className={`study-chat-action-backdrop${menuOpen ? " is-open" : " is-closing"}`}
          aria-label="Close uploads and study actions"
          aria-hidden={!menuOpen}
          inert={!menuOpen}
          tabIndex={-1}
          onClick={() => closeMenu()}
        />
      )}
      <div
        ref={menuRef}
        id="study-chat-action-menu"
        className={`study-chat-action-menu t-dropdown${menuOpen ? " is-open" : menuClosing ? " is-closing" : ""}`}
        data-origin={menuOrigin}
        data-mobile-sheet="true"
        role="group"
        aria-label="Chat uploads and actions"
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="study-chat-action-handle" aria-hidden="true">
          <span />
        </div>
        <div
          className="study-chat-action-sources study-chat-action-sources-standard"
          aria-label="Add study material"
        >
          <ComposerPrimitive.AddAttachment
            type="button"
            className="study-chat-action-item"
            aria-label="Upload a file"
            disabled={busy}
            onClick={() => closeMenu()}
          >
            <Upload size={18} aria-hidden="true" />
            <strong>Upload a file</strong>
          </ComposerPrimitive.AddAttachment>
          <button
            type="button"
            className="study-chat-action-item"
            disabled={busy}
            onClick={() => {
              closeMenu();
              setLibraryRevision((value) => value + 1);
              setLibraryOpen(true);
            }}
          >
            <LibraryIcon size={18} aria-hidden="true" />
            <strong>Upload from library</strong>
          </button>
        </div>
        <div
          className="study-chat-action-sources study-chat-action-source-tiles"
          aria-label="Choose a file source"
        >
          <button
            type="button"
            className="study-chat-action-source-tile"
            disabled={busy}
            onClick={() => {
              closeMenu();
              photoInputRef.current?.click();
            }}
          >
            <ImageIcon size={25} aria-hidden="true" />
            <strong>Photos</strong>
          </button>
          <button
            type="button"
            className="study-chat-action-source-tile"
            disabled={busy}
            onClick={() => {
              closeMenu();
              cameraInputRef.current?.click();
            }}
          >
            <Camera size={25} aria-hidden="true" />
            <strong>Camera</strong>
          </button>
          <ComposerPrimitive.AddAttachment
            type="button"
            className="study-chat-action-source-tile"
            disabled={busy}
            onClick={() => closeMenu()}
          >
            <Folder size={25} aria-hidden="true" />
            <strong>Files</strong>
          </ComposerPrimitive.AddAttachment>
        </div>
        {!moreActionsOpen && (
          <button
            type="button"
            className="study-chat-action-item study-chat-action-mobile-library"
            disabled={busy}
            onClick={() => {
              closeMenu();
              setLibraryRevision((value) => value + 1);
              setLibraryOpen(true);
            }}
          >
            <LibraryIcon size={18} aria-hidden="true" />
            <strong>Upload from library</strong>
          </button>
        )}
        <div className="study-chat-action-divider" role="separator" />
        <div
          id="study-chat-more-actions"
          className="study-chat-action-list"
          aria-label="Create study materials"
        >
          {moreActionsOpen ? (
            <>
              <button
                type="button"
                className="study-chat-action-item study-chat-action-back"
                onClick={() => {
                  setMoreActionsOpen(false);
                  window.requestAnimationFrame(() =>
                    menuRef.current
                      ?.querySelector<HTMLButtonElement>(".study-chat-action-more")
                      ?.focus()
                  );
                }}
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <strong>Back to actions</strong>
              </button>
              {moreChatActions.map(({ name, detail, icon: Icon, actionMode }) => (
                <button
                  key={name}
                  type="button"
                  className="study-chat-action-item"
                  disabled={busy || actionMode === null}
                  title={actionMode === null ? "Coming later" : detail}
                  onClick={() => {
                    if (actionMode !== null) selectAction(actionMode);
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <strong>{name}</strong>
                  {actionMode === null && <small className="study-chat-action-soon">Soon</small>}
                </button>
              ))}
            </>
          ) : (
            <>
              {primaryChatActions.map(({ name, detail, icon: Icon, actionMode }) => (
                <button
                  key={name}
                  type="button"
                  className="study-chat-action-item"
                  disabled={busy || actionMode === null}
                  title={actionMode === null ? "Coming later" : detail}
                  onClick={() => {
                    if (actionMode !== null) selectAction(actionMode);
                  }}
                >
                  <Icon size={18} aria-hidden="true" />
                  <strong>{name}</strong>
                </button>
              ))}
              <button
                type="button"
                className="study-chat-action-item study-chat-action-more"
                aria-expanded={moreActionsOpen}
                aria-controls="study-chat-more-actions"
                onClick={() => {
                  setMoreActionsOpen(true);
                  window.requestAnimationFrame(() =>
                    menuRef.current
                      ?.querySelector<HTMLButtonElement>(".study-chat-action-back")
                      ?.focus()
                  );
                }}
              >
                <Ellipsis size={18} aria-hidden="true" />
                <strong>More study tools</strong>
                <ChevronRight className="study-chat-action-chevron" size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
  const composer = (
    <ComposerPrimitive.Root
      className="study-chat-composer p-study-composer"
      data-variant="adaptive"
      data-editing={editing ? "true" : undefined}
      compact={!editing && !selectedAction && !libraryDocument}
      onSubmit={(event) => {
        if (empty || busy || dictating) event.preventDefault();
      }}
    >
      {editing && (
        <div className="study-chat-composer-editing-header">
          <Pencil size={17} aria-hidden="true" />
          <span>Editing message</span>
          <ComposerPrimitive.Cancel
            type="button"
            className="study-chat-composer-editing-close"
            aria-label="Cancel editing"
            title="Cancel editing"
          >
            <X size={18} aria-hidden="true" />
          </ComposerPrimitive.Cancel>
        </div>
      )}
      <div className="study-chat-composer-attachments p-study-composer-attachments">
        {selectedAction && SelectedActionIcon && (
          <div className="study-chat-action-mode-chip">
            <SelectedActionIcon size={18} aria-hidden="true" />
            <strong>{selectedAction.modeLabel}</strong>
            <button
              type="button"
              aria-label={`Remove ${selectedAction.modeLabel} action`}
              title="Remove action"
              onClick={() => onActionModeChange(null)}
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
        )}
        {libraryDocument && (
          <div className="study-chat-library-context">
            <LibraryIcon size={17} aria-hidden="true" />
            <span>
              <small>From library</small>
              <strong title={libraryDocument.title}>{libraryDocument.title}</strong>
            </span>
            <button
              type="button"
              aria-label={`Remove ${libraryDocument.title} from chat context`}
              title="Remove library file"
              onClick={() => onLibraryDocumentSelect?.(null)}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        )}
        <ComposerPrimitive.Attachments>
          {() => <ChatAttachment removable />}
        </ComposerPrimitive.Attachments>
      </div>
      <ComposerPrimitive.Input
        className="p-study-composer-input"
        aria-label={editing ? "Edit question" : "Study question"}
        placeholder={selectedAction?.placeholder || "Message PansGPT…"}
        rows={1}
        maxLength={10000}
        autoFocus={editing}
        addAttachmentOnPaste={!busy}
      />
      <div className="p-study-composer-toolbar">
        {editing ? (
          <ComposerPrimitive.AddAttachment
            type="button"
            className="p-study-composer-control"
            aria-label="Attach study material"
            disabled={busy}
            title="Attach PDF, text, PNG or JPEG (up to 4 files, 10 MB each)"
          >
            <Plus size={25} aria-hidden="true" />
          </ComposerPrimitive.AddAttachment>
        ) : (
          <button
            ref={triggerRef}
            type="button"
            className="p-study-composer-control"
            aria-label="Open uploads and study actions"
            aria-expanded={menuOpen}
            aria-controls="study-chat-action-menu"
            title="Uploads and study actions"
            disabled={busy}
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
          >
            <Plus size={25} aria-hidden="true" />
          </button>
        )}
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
          {busy && !editing ? (
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
              aria-label={editing ? "Send edited message" : "Send message"}
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
      {!editing && actionMenu}
      {attachmentError && (
        <p className="study-chat-attachment-error" role="alert">
          {attachmentError}
        </p>
      )}
      {!editing && (
        <>
          <input
            ref={photoInputRef}
            className="study-chat-hidden-file-input"
            type="file"
            accept="image/png,image/jpeg"
            multiple
            tabIndex={-1}
            aria-hidden="true"
            onChange={addImageFiles}
          />
          <input
            ref={cameraInputRef}
            className="study-chat-hidden-file-input"
            type="file"
            accept="image/png,image/jpeg"
            capture="environment"
            tabIndex={-1}
            aria-hidden="true"
            onChange={addImageFiles}
          />
        </>
      )}
    </ComposerPrimitive.Root>
  );
  if (editing) return composer;

  return (
    <div ref={hostRef} className="study-chat-composer-host">
      {!composerSlot?.mobileEditing && composer}
      {!composerSlot?.mobileEditing && (
        <>
          <ChatLibraryPicker
            open={libraryOpen}
            revision={libraryRevision}
            onOpenChange={setLibraryOpen}
            onSelect={(document) => {
              onLibraryDocumentSelect?.(document);
              setLibraryOpen(false);
            }}
          />
        </>
      )}
      <div ref={composerSlot?.setTarget} className="study-chat-edit-portal-target" />
    </div>
  );
}

export function ChatEditComposer(): React.ReactElement {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const isMobile = useSyncExternalStore(subscribeEditViewport, getEditViewport, () => false);
  const text = useAuiState((state) => state.composer.text);
  const composerSlot = useContext(ChatComposerSlotContext);
  const portalTarget = composerSlot?.target ?? null;
  const setMobileEditing = composerSlot?.setMobileEditing;
  const originalText = useAuiState(
    (state) => getExternalStoreMessages<ChatMessageView>(state.message)[0]?.content ?? ""
  );
  const changed = text.trim().length > 0 && text !== originalText;

  useLayoutEffect(() => {
    const input = inputRef.current;
    const measure = measureRef.current;
    if (!input || !measure) return;
    fitEditInput(input, measure);
  }, [isMobile, text]);

  useEffect(() => {
    const input = inputRef.current;
    const measure = measureRef.current;
    const parent = input?.closest(".study-chat-edit")?.parentElement;
    if (!input || !measure || !parent || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => fitEditInput(input, measure));
    observer.observe(parent);
    return () => observer.disconnect();
  }, [isMobile]);

  useLayoutEffect(() => {
    if (!isMobile || !setMobileEditing) return;
    setMobileEditing(true);
    return () => setMobileEditing(false);
  }, [isMobile, setMobileEditing]);

  const editor = (
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

  if (!isMobile) return editor;

  return (
    <>
      <UserMessageEditing />
      {portalTarget && composerSlot?.mobileEditing
        ? createPortal(<ChatComposer editing />, portalTarget)
        : null}
    </>
  );
}

function subscribeEditViewport(onChange: () => void): () => void {
  const query = window.matchMedia("(max-width: 860px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getEditViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;
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
