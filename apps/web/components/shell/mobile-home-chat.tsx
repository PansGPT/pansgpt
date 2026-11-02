"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Camera,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Folder,
  History,
  Image as ImageIcon,
  Library as LibraryIcon,
  Search,
  Mic,
  Plus,
  SquarePen,
} from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import type { ChatActionMode, LibraryDocument } from "@pansgpt/types";
import { ChatContent, ChatHistory } from "@/components/chat/surface";
import { ChatLibraryPicker } from "@/components/chat/library-picker";
import { moreChatActions, primaryChatActions } from "@/components/chat/tools";
import { PresentationWorkspace } from "@/components/artifacts/PresentationWorkspace";
import { MobileSheetHistory } from "./mobile-sheet-history";
import { useChatDraft } from "./chat-draft";
import { useSheetSwipe } from "./use-sheet-swipe";
import "./mobile-home-chat.css";

/** The modal stays mounted across conversation changes; only its runtime changes. */
export function MobileHomeChat(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionParam =
    searchParams.get("session") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("session")
      : null);
  const chatParam =
    searchParams.get("chat") ||
    (typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("chat")
      : null);
  const shouldOpenInitial = Boolean(sessionParam || chatParam === "new");

  const [open, setOpen] = useState(shouldOpenInitial);
  const [started, setStarted] = useState(shouldOpenInitial);
  const { revision, startNewChat } = useChatDraft();
  const trigger = useRef<HTMLInputElement>(null);
  const quickComposer = useRef<HTMLFormElement>(null);
  const plusTrigger = useRef<HTMLButtonElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const actionMenuCloseTimer = useRef<number | null>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [touchSurface, setTouchSurface] = useState<HTMLDivElement | null>(null);
  const bindSheet = useCallback((node: HTMLDivElement | null) => {
    sheet.current = node;
    setTouchSurface(node);
  }, []);
  const dismiss = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.has("session") || params.has("chat")) {
        params.delete("session");
        params.delete("chat");
        const nextQuery = params.toString();
        const nextUrl = nextQuery
          ? `${window.location.pathname}?${nextQuery}`
          : window.location.pathname;
        window.history.replaceState(null, "", nextUrl);
        router.replace(nextUrl, { scroll: false });
      }
    }
  }, [router]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(sessionParam || null);
  const [chatTarget, setChatTarget] = useState<HTMLDivElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<HTMLDivElement | null>(null);
  const [historySearch, setHistorySearch] = useState(false);
  const historyInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ id: string; files: File[] } | null>(null);
  const [pendingLibraryDocument, setPendingLibraryDocument] = useState<{
    id: string;
    document: LibraryDocument;
  } | null>(null);
  const [pendingActionMode, setPendingActionMode] = useState<{
    id: string;
    mode: ChatActionMode;
  } | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuClosing, setActionMenuClosing] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryRevision, setLibraryRevision] = useState(0);
  const consumeFiles = useCallback(
    (id: string) => setPendingFiles((current) => (current?.id === id ? null : current)),
    []
  );
  const consumeLibraryDocument = useCallback(
    (id: string) => setPendingLibraryDocument((current) => (current?.id === id ? null : current)),
    []
  );
  const consumeActionMode = useCallback(
    (id: string) => setPendingActionMode((current) => (current?.id === id ? null : current)),
    []
  );
  const closeActionMenu = useCallback(
    (restoreFocus = false) => {
      if (!actionMenuOpen) return;
      setActionMenuOpen(false);
      setActionMenuClosing(true);
      setMoreActionsOpen(false);
      const duration =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue("--dropdown-close-dur")
        ) || 150;
      if (actionMenuCloseTimer.current !== null) window.clearTimeout(actionMenuCloseTimer.current);
      actionMenuCloseTimer.current = window.setTimeout(() => {
        setActionMenuClosing(false);
        actionMenuCloseTimer.current = null;
      }, duration);
      if (restoreFocus) window.requestAnimationFrame(() => plusTrigger.current?.focus());
    },
    [actionMenuOpen]
  );
  const openActionMenu = useCallback(() => {
    if (actionMenuCloseTimer.current !== null) window.clearTimeout(actionMenuCloseTimer.current);
    actionMenuCloseTimer.current = null;
    setMoreActionsOpen(false);
    setActionMenuClosing(false);
    setActionMenuOpen(true);
  }, []);
  useEffect(() => {
    if (!actionMenuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      const firstVisible = Array.from(
        actionMenuRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []
      ).find((button) => button.getClientRects().length > 0);
      firstVisible?.focus();
    });
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !quickComposer.current?.contains(event.target))
        closeActionMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeActionMenu(true);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [actionMenuOpen, closeActionMenu]);
  useEffect(() => {
    if (!actionMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [actionMenuOpen]);
  useEffect(
    () => () => {
      if (actionMenuCloseTimer.current !== null) window.clearTimeout(actionMenuCloseTimer.current);
    },
    []
  );
  useSheetSwipe(touchSurface, historyOpen, setHistoryOpen, dismiss);
  function openChat(): void {
    setHistoryOpen(false);
    setStarted(true);
    setOpen(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (!selectedId && !params.has("session")) {
        params.set("chat", "new");
        const nextQuery = params.toString();
        const nextUrl = nextQuery
          ? `${window.location.pathname}?${nextQuery}`
          : window.location.pathname;
        window.history.replaceState(null, "", nextUrl);
        router.replace(nextUrl, { scroll: false });
      }
    }
  }
  function newChat(): void {
    setPendingFiles(null);
    setPendingLibraryDocument(null);
    setPendingActionMode(null);
    setHistoryOpen(false);
    setSelectedId(null);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.delete("session");
      params.set("chat", "new");
      const nextQuery = params.toString();
      const nextUrl = nextQuery
        ? `${window.location.pathname}?${nextQuery}`
        : window.location.pathname;
      window.history.replaceState(null, "", nextUrl);
      router.replace(nextUrl, { scroll: false });
    }
    startNewChat();
  }
  function launchStudyAction(mode: ChatActionMode): void {
    closeActionMenu();
    newChat();
    setPendingActionMode({ id: crypto.randomUUID(), mode });
    setStarted(true);
    setOpen(true);
  }
  function queueSelectedFiles(input: HTMLInputElement): void {
    const files = Array.from(input.files ?? []);
    input.value = "";
    if (files.length) setPendingFiles({ id: crypto.randomUUID(), files });
  }
  const handleSessionCreated = useCallback(
    (newId: string) => {
      setSelectedId(newId);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        params.set("session", newId);
        params.delete("chat");
        const nextQuery = params.toString();
        const nextUrl = nextQuery
          ? `${window.location.pathname}?${nextQuery}`
          : window.location.pathname;
        window.history.replaceState(null, "", nextUrl);
        router.replace(nextUrl, { scroll: false });
      }
    },
    [router]
  );
  const [prevParam, setPrevParam] = useState<string | null>(sessionParam);
  const [prevChatParam, setPrevChatParam] = useState<string | null>(chatParam);

  if (sessionParam !== prevParam || chatParam !== prevChatParam) {
    setPrevParam(sessionParam);
    setPrevChatParam(chatParam);
    if (sessionParam) {
      setPendingFiles(null);
      setPendingLibraryDocument(null);
      setSelectedId(sessionParam);
      setHistoryOpen(false);
      setStarted(true);
      setOpen(true);
    } else if (chatParam === "new") {
      setPendingFiles(null);
      setPendingLibraryDocument(null);
      setSelectedId(null);
      setHistoryOpen(false);
      setStarted(true);
      setOpen(true);
    } else {
      setOpen(false);
      setSelectedId(null);
    }
  }
  useEffect(() => {
    const handleOpenChat = (event: Event) => {
      if (event instanceof CustomEvent) {
        const id = event.detail?.id as string | null | undefined;
        setPendingFiles(null);
        setPendingLibraryDocument(null);
        setSelectedId(id || null);
        setHistoryOpen(false);
        setStarted(true);
        setOpen(true);
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (id) {
            params.set("session", id);
            params.delete("chat");
          } else {
            params.delete("session");
            params.set("chat", "new");
          }
          const nextQuery = params.toString();
          const nextUrl = nextQuery
            ? `${window.location.pathname}?${nextQuery}`
            : window.location.pathname;
          window.history.replaceState(null, "", nextUrl);
          router.replace(nextUrl, { scroll: false });
        }
      }
    };
    window.addEventListener("pansgpt-open-chat", handleOpenChat);
    return () => window.removeEventListener("pansgpt-open-chat", handleOpenChat);
  }, [router]);
  useEffect(() => {
    const removed = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.id === selectedId) {
        setSelectedId(null);
        setHistoryOpen(false);
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          if (params.get("session") === selectedId) {
            params.delete("session");
            const nextQuery = params.toString();
            const nextUrl = nextQuery
              ? `${window.location.pathname}?${nextQuery}`
              : window.location.pathname;
            window.history.replaceState(null, "", nextUrl);
            router.replace(nextUrl, { scroll: false });
          }
        }
      }
    };
    window.addEventListener("pansgpt-chat-removed", removed);
    return () => window.removeEventListener("pansgpt-chat-removed", removed);
  }, [selectedId, router]);
  useEffect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    const update = () => {
      sheet.current?.style.setProperty(
        "--chat-viewport-height",
        `${viewport?.height ?? window.innerHeight}px`
      );
      sheet.current?.style.setProperty("--chat-viewport-top", `${viewport?.offsetTop ?? 0}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    const desktop = window.matchMedia("(min-width: 861px)");
    const closeOnDesktop = () => {
      if (desktop.matches) {
        setOpen(false);
        const params = new URLSearchParams(window.location.search);
        const session = params.get("session");
        if (session) {
          router.replace(`/app/chat?session=${encodeURIComponent(session)}`);
        } else if (params.get("chat") === "new") {
          router.replace("/app/chat");
        }
      }
    };
    if (desktop.matches) {
      closeOnDesktop();
    }
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open, router]);
  const renderThread = (thread: ReactNode, controls?: ReactNode): ReactNode => (
    <>
      {chatTarget && createPortal(thread, chatTarget)}
      {menuTarget && controls && createPortal(controls, menuTarget)}
    </>
  );
  return (
    <>
      <form
        ref={quickComposer}
        className="shell-mobile-composer p-study-composer"
        onSubmit={(event) => {
          event.preventDefault();
          openChat();
        }}
      >
        <div className="p-study-composer-row">
          <button
            ref={plusTrigger}
            className="p-study-composer-control"
            type="button"
            aria-label="Open uploads and study actions"
            aria-expanded={actionMenuOpen}
            aria-controls="mobile-home-action-menu"
            onClick={() => (actionMenuOpen ? closeActionMenu() : openActionMenu())}
          >
            <Plus size={25} aria-hidden="true" />
          </button>
          <input
            ref={trigger}
            className="p-study-composer-input"
            aria-label="Message PansGPT"
            placeholder={"Message PansGPT\u2026"}
            readOnly
            aria-haspopup="dialog"
            title="Open the chat sheet"
            onClick={openChat}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openChat();
              }
            }}
          />
          <button
            type="button"
            className="p-study-composer-control"
            aria-label="Open chat for voice input"
            onClick={openChat}
          >
            <Mic size={19} aria-hidden="true" />
          </button>
          <button
            className="p-study-composer-control p-study-composer-submit"
            type="submit"
            aria-label="Send message"
            disabled
          >
            <ArrowUp size={19} aria-hidden="true" />
          </button>
        </div>
        {(actionMenuOpen || actionMenuClosing) && (
          <button
            type="button"
            className={`study-chat-action-backdrop${actionMenuOpen ? " is-open" : " is-closing"}`}
            aria-label="Close uploads and study actions"
            aria-hidden={!actionMenuOpen}
            inert={!actionMenuOpen}
            tabIndex={-1}
            onClick={() => closeActionMenu()}
          />
        )}
        <div
          ref={actionMenuRef}
          id="mobile-home-action-menu"
          className={`study-chat-action-menu t-dropdown${actionMenuOpen ? " is-open" : actionMenuClosing ? " is-closing" : ""}`}
          data-origin="bottom-left"
          data-mobile-sheet="true"
          role="group"
          aria-label="Chat uploads and actions"
          aria-hidden={!actionMenuOpen}
          inert={!actionMenuOpen}
        >
          <div className="study-chat-action-handle" aria-hidden="true">
            <span />
          </div>
          <div
            className="study-chat-action-sources study-chat-action-source-tiles"
            aria-label="Choose a file source"
          >
            <button
              className="study-chat-action-source-tile"
              type="button"
              onClick={() => {
                closeActionMenu();
                setHistoryOpen(false);
                openChat();
                photoInput.current?.click();
              }}
            >
              <ImageIcon size={25} aria-hidden="true" />
              <strong>Photos</strong>
            </button>
            <button
              className="study-chat-action-source-tile"
              type="button"
              onClick={() => {
                closeActionMenu();
                setHistoryOpen(false);
                openChat();
                cameraInput.current?.click();
              }}
            >
              <Camera size={25} aria-hidden="true" />
              <strong>Camera</strong>
            </button>
            <button
              className="study-chat-action-source-tile"
              type="button"
              onClick={() => {
                closeActionMenu();
                setHistoryOpen(false);
                openChat();
                fileInput.current?.click();
              }}
            >
              <Folder size={25} aria-hidden="true" />
              <strong>Files</strong>
            </button>
          </div>
          {!moreActionsOpen && (
            <button
              type="button"
              className="study-chat-action-item study-chat-action-mobile-library"
              onClick={() => {
                closeActionMenu();
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
            id="mobile-home-more-actions"
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
                      actionMenuRef.current
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
                    disabled={actionMode === null}
                    title={actionMode === null ? "Coming later" : detail}
                    onClick={() => {
                      if (actionMode !== null) launchStudyAction(actionMode);
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
                    disabled={actionMode === null}
                    title={actionMode === null ? "Coming later" : detail}
                    onClick={() => {
                      if (actionMode !== null) launchStudyAction(actionMode);
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
                  aria-controls="mobile-home-more-actions"
                  onClick={() => {
                    setMoreActionsOpen(true);
                    window.requestAnimationFrame(() =>
                      actionMenuRef.current
                        ?.querySelector<HTMLButtonElement>(".study-chat-action-back")
                        ?.focus()
                    );
                  }}
                >
                  <Ellipsis size={18} aria-hidden="true" />
                  <strong>More study tools</strong>
                  <ChevronRight
                    className="study-chat-action-chevron"
                    size={16}
                    aria-hidden="true"
                  />
                </button>
              </>
            )}
          </div>
        </div>
      </form>
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept="application/pdf,text/plain,text/markdown,text/csv,image/png,image/jpeg"
        onChange={(event) => queueSelectedFiles(event.currentTarget)}
      />
      <input
        ref={photoInput}
        type="file"
        hidden
        multiple
        accept="image/png,image/jpeg"
        onChange={(event) => queueSelectedFiles(event.currentTarget)}
      />
      <input
        ref={cameraInput}
        type="file"
        hidden
        accept="image/png,image/jpeg"
        capture="environment"
        onChange={(event) => queueSelectedFiles(event.currentTarget)}
      />
      <ChatLibraryPicker
        open={libraryOpen}
        revision={libraryRevision}
        onOpenChange={setLibraryOpen}
        onSelect={(document) => {
          setPendingLibraryDocument({ id: crypto.randomUUID(), document });
          setLibraryOpen(false);
          setHistoryOpen(false);
          openChat();
        }}
      />
      <DialogPrimitive.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) dismiss();
          else setOpen(true);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="mobile-home-chat-overlay" />
          <DialogPrimitive.Content
            ref={bindSheet}
            className="mobile-home-chat-sheet"
            onInteractOutside={(event) => {
              const original = event.detail.originalEvent;
              if (original && "type" in original && original.type === "focusin") {
                event.preventDefault();
                return;
              }
              const target = original?.target;
              if (target instanceof Element && target.closest("[data-chat-overlay]"))
                event.preventDefault();
            }}
            onEscapeKeyDown={(event) => {
              if (document.querySelector('[data-chat-overlay][data-state="open"]'))
                event.preventDefault();
            }}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              sheet.current?.focus({ preventScroll: true });
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              trigger.current?.focus({ preventScroll: true });
            }}
          >
            <DialogPrimitive.Title className="p-sr-only">PansGPT chat</DialogPrimitive.Title>
            <DialogPrimitive.Description className="p-sr-only">
              Ask a question or attach study material. Closing stops your response and keeps your
              draft while you stay on Home.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className="mobile-home-chat-handle" aria-label="Close chat">
              <span />
            </DialogPrimitive.Close>
            <header className="mobile-home-chat-header">
              <button
                className="shell-icon-button mobile-home-chat-history-toggle"
                aria-label={historyOpen ? "Back to conversation" : "Show chat history"}
                aria-expanded={historyOpen}
                aria-controls="home-sheet-history"
                onClick={() => setHistoryOpen((value) => !value)}
              >
                {historyOpen ? (
                  <ChevronRight size={25} aria-hidden="true" />
                ) : (
                  <History size={25} aria-hidden="true" />
                )}
              </button>
              {historyOpen ? (
                <button
                  className="shell-icon-button mobile-home-chat-history-toggle"
                  aria-label="Search conversations"
                  onClick={() => {
                    flushSync(() => setHistorySearch(true));
                    historyInput.current?.focus();
                  }}
                >
                  <Search size={24} aria-hidden="true" />
                </button>
              ) : selectedId || pendingFiles ? (
                <div className="mobile-home-chat-actions">
                  <button className="shell-icon-button" aria-label="New chat" onClick={newChat}>
                    <SquarePen size={25} aria-hidden="true" />
                  </button>
                  <div ref={setMenuTarget} />
                </div>
              ) : null}
            </header>
            <div className="mobile-home-chat-views" data-history={historyOpen}>
              <div className="mobile-home-chat-track">
                <section
                  id="home-sheet-history"
                  className="mobile-home-chat-history"
                  aria-label="Chat history"
                  inert={!historyOpen}
                >
                  <MobileSheetHistory
                    active={open && historyOpen}
                    searchVisible={historySearch}
                    inputRef={historyInput}
                    onChoose={(id) => {
                      setPendingFiles(null);
                      setPendingLibraryDocument(null);
                      setSelectedId(id);
                      setHistoryOpen(false);
                      if (typeof window !== "undefined") {
                        const params = new URLSearchParams(window.location.search);
                        params.set("session", id);
                        params.delete("chat");
                        const nextQuery = params.toString();
                        const nextUrl = nextQuery
                          ? `${window.location.pathname}?${nextQuery}`
                          : window.location.pathname;
                        window.history.replaceState(null, "", nextUrl);
                        router.replace(nextUrl, { scroll: false });
                      }
                      sheet.current?.focus({ preventScroll: true });
                    }}
                  />
                </section>
                <div ref={setChatTarget} className="mobile-home-chat-pane" inert={historyOpen} />
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      {started && (
        <PresentationWorkspace key={`${revision}:${selectedId || "new"}`} active={open}>
          {selectedId ? (
            <ChatHistory
              id={selectedId}
              active={open}
              renderThread={renderThread}
              onSessionCreated={handleSessionCreated}
              pendingFiles={pendingFiles}
              onFilesConsumed={consumeFiles}
              pendingLibraryDocument={pendingLibraryDocument}
              onLibraryDocumentConsumed={consumeLibraryDocument}
              pendingActionMode={pendingActionMode}
              onActionModeConsumed={consumeActionMode}
            />
          ) : (
            <ChatContent
              active={open}
              renderThread={renderThread}
              onSessionCreated={handleSessionCreated}
              pendingFiles={pendingFiles}
              onFilesConsumed={consumeFiles}
              pendingLibraryDocument={pendingLibraryDocument}
              onLibraryDocumentConsumed={consumeLibraryDocument}
              pendingActionMode={pendingActionMode}
              onActionModeConsumed={consumeActionMode}
            />
          )}
        </PresentationWorkspace>
      )}
    </>
  );
}
