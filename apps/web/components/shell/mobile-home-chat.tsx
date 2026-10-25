"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal, flushSync } from "react-dom";
import { ArrowUp, ChevronRight, History, Search, Mic, Plus, SquarePen } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import { ChatContent, ChatHistory } from "@/components/chat/surface";
import { PresentationWorkspace } from "@/components/artifacts/PresentationWorkspace";
import { MobileSheetHistory } from "./mobile-sheet-history";
import { useChatDraft } from "./chat-draft";
import { useSheetSwipe } from "./use-sheet-swipe";
import "./mobile-home-chat.css";

/** The modal stays mounted across conversation changes; only its runtime changes. */
export function MobileHomeChat(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const { revision, startNewChat } = useChatDraft();
  const trigger = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [touchSurface, setTouchSurface] = useState<HTMLDivElement | null>(null);
  const bindSheet = useCallback((node: HTMLDivElement | null) => {
    sheet.current = node;
    setTouchSurface(node);
  }, []);
  const dismiss = useCallback(() => setOpen(false), []);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<HTMLDivElement | null>(null);
  const [menuTarget, setMenuTarget] = useState<HTMLDivElement | null>(null);
  const [historySearch, setHistorySearch] = useState(false);
  const historyInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ id: string; files: File[] } | null>(null);
  const consumeFiles = useCallback(
    (id: string) => setPendingFiles((current) => (current?.id === id ? null : current)),
    []
  );
  useSheetSwipe(touchSurface, historyOpen, setHistoryOpen, dismiss);
  function openChat(): void {
    setHistoryOpen(false);
    setStarted(true);
    setOpen(true);
  }
  function newChat(): void {
    setPendingFiles(null);
    setHistoryOpen(false);
    setSelectedId(null);
    startNewChat();
  }
  useEffect(() => {
    const removed = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.id === selectedId) {
        setSelectedId(null);
        setHistoryOpen(false);
      }
    };
    window.addEventListener("pansgpt-chat-removed", removed);
    return () => window.removeEventListener("pansgpt-chat-removed", removed);
  }, [selectedId]);
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
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [open]);
  const renderThread = (thread: ReactNode, controls?: ReactNode): ReactNode => (
    <>
      {chatTarget && createPortal(thread, chatTarget)}
      {menuTarget && controls && createPortal(controls, menuTarget)}
    </>
  );
  return (
    <>
      <form
        className="shell-mobile-composer p-study-composer"
        onSubmit={(event) => {
          event.preventDefault();
          openChat();
        }}
      >
        <div className="p-study-composer-row">
          <button
            className="p-study-composer-control"
            type="button"
            aria-label="Attach study material"
            onClick={() => {
              setHistoryOpen(false);
              openChat();
              fileInput.current?.click();
            }}
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
      </form>
      <input
        ref={fileInput}
        type="file"
        hidden
        multiple
        accept="application/pdf,text/plain,text/markdown,text/csv,image/png,image/jpeg"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length) setPendingFiles({ id: crypto.randomUUID(), files });
        }}
      />
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="mobile-home-chat-overlay" />
          <DialogPrimitive.Content
            ref={bindSheet}
            className="mobile-home-chat-sheet"
            onInteractOutside={(event) => {
              // Runtime controls use sibling React portals to preserve drafts on dismissal.
              // Their popup layers belong to this sheet even when rendered into document.body.
              const target = event.detail.originalEvent.target;
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
              ) : (
                <div className="mobile-home-chat-actions">
                  <button className="shell-icon-button" aria-label="New chat" onClick={newChat}>
                    <SquarePen size={25} aria-hidden="true" />
                  </button>
                  <div ref={setMenuTarget} />
                </div>
              )}
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
                      setSelectedId(id);
                      setHistoryOpen(false);
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
              pendingFiles={pendingFiles}
              onFilesConsumed={consumeFiles}
            />
          ) : (
            <ChatContent
              active={open}
              renderThread={renderThread}
              pendingFiles={pendingFiles}
              onFilesConsumed={consumeFiles}
            />
          )}
        </PresentationWorkspace>
      )}
    </>
  );
}
