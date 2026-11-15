"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { z } from "zod";
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  MessageSquare,
  HelpCircle,
  Minus,
  Plus,
  Sparkles,
  Scissors,
  MessageSquarePlus,
  Copy,
  X,
} from "lucide-react";
import type { CitationItem, ReaderResponse, ReaderSelection, ReaderRect } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { useDashboard } from "@/components/shell/dashboard-data";
import {
  readerSchema,
  selectionActions,
  selectionPrompt,
  type SelectionAction,
} from "@/lib/reader";
import { libraryError, pdfLinkSchema } from "@/lib/library-catalog";
import {
  canRetryPdfThroughApi,
  loadAuthorizedPdf,
  loadPdf,
  loadPdfBytes,
  type PdfSource,
} from "./pdf-engine";
import { PdfViewport, type ReaderJump } from "./pdf-viewport";
import { StudyChat, type ReaderDraft } from "./study-chat";
import { useReadingProgress } from "./use-reading-progress";
import { registerReaderSnip, type ReaderSnip } from "@/lib/reader-snips";
import { ReaderGoToPage } from "./reader-dialogs";
import { hasSeenReaderGuide, rememberReaderGuide, ReaderTutorial } from "./reader-tutorial";
import {
  readPdfCopy,
  storePdfCopy,
  discardPdfCopy,
  downloadPdfCopy,
  MAX_CACHED_PDF_BYTES,
} from "@/lib/reader-pdf-cache";
import "./reader.css";
import "./reader-controls-motion.css";

function ReaderError({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}): React.ReactElement {
  return (
    <div className="reader-empty" role="alert">
      <BookOpen size={28} />
      <h1>We couldn’t open this document.</h1>
      <p>{message}</p>
      <button type="button" onClick={retry}>
        Try again
      </button>
      <Link href="/app/library">Back to library</Link>
    </div>
  );
}

function ReaderDocument({ data }: { data: ReaderResponse }): React.ReactElement {
  const { document: material } = data;
  const { session, profile } = useAuth();
  const token = session?.access_token;
  const { reload } = useDashboard();
  const base = `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${material.id}`;
  const [source, setSource] = useState<PdfSource | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfAttempt, setPdfAttempt] = useState(0);
  const [page, setPage] = useState(material.last_page_read || 1);
  const [pageInput, setPageInput] = useState(String(page));
  const [zoom, setZoom] = useState(1);
  const [theme, setTheme] = useState("paper");
  const [chatOpen, setChatOpen] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const readingScroll = useRef({ top: 0, travel: 0 });
  const [firstGuide] = useState(() => !hasSeenReaderGuide(profile!.id));
  const [helpOpen, setHelpOpen] = useState(firstGuide);
  useEffect(() => {
    if (firstGuide) rememberReaderGuide(profile!.id);
  }, [firstGuide, profile]);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [studyTab, setStudyTab] = useState<"chat" | "history">("chat");
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [selection, setSelection] = useState<ReaderSelection | null>(null);
  const [selectionPosition, setSelectionPosition] = useState({ x: 160, y: 60 });
  const [snipping, setSnipping] = useState(false);
  const [snip, setSnip] = useState<ReaderSnip | null>(null);
  const [moreActions, setMoreActions] = useState(false);
  const [draft, setDraft] = useState<ReaderDraft | null>(null);
  const draftSequence = useRef(0);
  const [jump, setJump] = useState<ReaderJump | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const chatToggle = useRef<HTMLButtonElement>(null);
  const mobileChatToggle = useRef<HTMLButtonElement>(null);
  const chatReturnFocus = useRef<HTMLElement | null>(null);
  useEffect(
    () => () => {
      if (snip) URL.revokeObjectURL(snip.preview);
    },
    [snip]
  );
  const selectedPassage = useCallback((value: ReaderSelection | null) => {
    setSelection(value);
    if (value) setControlsHidden(false);
    if (!value) return;
    const range = window.getSelection()?.rangeCount ? window.getSelection()!.getRangeAt(0) : null;
    const area = root.current?.querySelector(".reader-canvas-area")?.getBoundingClientRect();
    if (!range || !area) return;
    const box = range.getBoundingClientRect();
    setSelectionPosition({
      x: Math.max(125, Math.min(area.width - 125, box.left + box.width / 2 - area.left)),
      y: Math.max(48, Math.min(area.height - 220, box.top - area.top - 8)),
    });
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 860px)");
    const reveal = () => setControlsHidden(false);
    media.addEventListener("change", reveal);
    return () => media.removeEventListener("change", reveal);
  }, []);
  const onReadingScroll = useCallback(
    (top: number) => {
      const previous = readingScroll.current;
      const delta = top - previous.top;
      previous.top = top;
      if (
        !window.matchMedia("(max-width: 860px)").matches ||
        snipping ||
        selection ||
        helpOpen ||
        pageDialogOpen ||
        chatOpen ||
        window.getSelection()?.isCollapsed === false
      )
        return;
      if (top < 16) {
        previous.travel = 0;
        setControlsHidden(false);
        return;
      }
      previous.travel =
        Math.sign(delta) === Math.sign(previous.travel) ? previous.travel + delta : delta;
      if (previous.travel > 28) {
        setControlsHidden(true);
        if (document.activeElement?.closest(".reader-header, .reader-toolbar"))
          root.current
            ?.querySelector<HTMLElement>(".reader-scroll")
            ?.focus({ preventScroll: true });
      } else if (previous.travel < -18) setControlsHidden(false);
    },
    [snipping, selection, helpOpen, pageDialogOpen, chatOpen]
  );
  const tapPage = useCallback(() => {
    if (
      window.matchMedia("(max-width: 860px)").matches &&
      !snipping &&
      window.getSelection()?.isCollapsed !== false
    )
      setControlsHidden((value) => !value);
  }, [snipping]);
  const lifecycle = useRef<AbortController | null>(null);
  const [initialPage, setInitialPage] = useState(page);
  const {
    status: progressStatus,
    updatePage,
    retry: retryProgress,
  } = useReadingProgress(material.id, token, initialPage, !!source);
  const onPage = useCallback(
    (value: number) => {
      setPage(value);
      setPageInput(String(value));
      updatePage(value);
    },
    [updatePage]
  );
  useEffect(() => {
    lifecycle.current = new AbortController();
    return () => lifecycle.current?.abort();
  }, []);
  useEffect(() => {
    if (!token) return;
    let disposed = false;
    let task: Awaited<ReturnType<typeof loadPdf>> | undefined;
    const controller = new AbortController();
    void (async () => {
      try {
        const owner = profile?.university_id
          ? { userId: profile.id, universityId: profile.university_id }
          : null;
        const cached = owner ? await readPdfCopy(owner, material.id, material.updated_at) : null;
        let pdf: PdfSource["pdf"] | undefined;
        let downloaded: Blob | null = null;
        if (cached && !disposed) {
          task = await loadPdfBytes(new Uint8Array(await cached.arrayBuffer()));
          if (disposed) {
            void task.destroy();
            return;
          }
          try {
            pdf = await task.promise;
          } catch {
            await task.destroy();
            if (owner) await discardPdfCopy(owner, material.id);
          }
        }
        if (!pdf) {
          const response = await fetch(`${base}/pdf-url`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
          });
          if (!response.ok)
            throw await libraryError(response, "The PDF file could not be loaded. Please retry.");
          const link = pdfLinkSchema.parse(await response.json());
          if (link.document_id !== material.id)
            throw new Error("The document link could not be verified.");
          if (disposed) return;
          let bytes: Uint8Array | null = null;
          if ((material.file_size_bytes ?? 0) <= MAX_CACHED_PDF_BYTES) {
            const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]);
            try {
              bytes = await downloadPdfCopy(link.presigned_url, signal);
            } catch (error) {
              if (signal.aborted) throw error;
              bytes = await downloadPdfCopy(`${base}/pdf`, signal, token);
            }
          }
          if (disposed) return;
          if (bytes) {
            downloaded = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
            task = await loadPdfBytes(bytes);
            if (disposed) {
              void task.destroy();
              return;
            }
            pdf = await task.promise;
          } else {
            task = await loadPdf(link.presigned_url);
            if (disposed) {
              void task.destroy();
              return;
            }
            try {
              pdf = await task.promise;
            } catch (error) {
              if (disposed || !canRetryPdfThroughApi(error)) throw error;
              await task.destroy();
              task = await loadAuthorizedPdf(material.id, token);
              if (disposed) {
                void task.destroy();
                return;
              }
              pdf = await task.promise;
            }
          }
        }
        if (disposed) return;
        const first = await pdf.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (disposed) return;
        if (downloaded && owner)
          await storePdfCopy(
            owner,
            material.id,
            material.updated_at,
            downloaded,
            controller.signal
          );
        if (disposed) return;
        onPage(Math.min(pdf.numPages, initialPage));
        setSource({
          pdf,
          firstWidth: viewport.width,
          ratios: new Map([[1, viewport.height / viewport.width]]),
        });
      } catch (cause: unknown) {
        if (!disposed)
          setPdfError(
            cause instanceof Error && cause.name === "PasswordException"
              ? "This PDF is password protected. Ask for an unlocked study copy."
              : cause instanceof Error && cause.name === "Error"
                ? cause.message
                : "The PDF couldn’t load. Check your connection and retry to refresh its private link."
          );
      }
    })();
    return () => {
      disposed = true;
      controller.abort();
      if (task) void task.destroy();
    };
  }, [
    base,
    material.id,
    material.updated_at,
    material.file_size_bytes,
    profile?.id,
    profile?.university_id,
    token,
    pdfAttempt,
    initialPage,
    onPage,
  ]);
  function navigate(value: number, rects?: ReaderRect[]): void {
    setControlsHidden(false);
    const next = Math.max(1, Math.min(source?.pdf.numPages || material.page_count || 1, value));
    setJump({ id: Date.now(), page: next, rects });
    if (window.matchMedia("(max-width: 860px)").matches) setChatOpen(false);
  }
  function stage(action: SelectionAction): void {
    if (!selection) return;
    setDraft({
      id: ++draftSequence.current,
      text: selectionPrompt(selection, action),
      submit: true,
    });
    chatReturnFocus.current = defaultChatTrigger();
    setChatOpen(true);
    setStudyTab("chat");
    setMoreActions(false);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }
  function stageSnip(ask: boolean): void {
    if (!snip) return;
    registerReaderSnip(snip.file, {
      document_id: material.id,
      page_number: snip.page,
      rect: snip.rect,
    });
    setDraft({
      id: ++draftSequence.current,
      text: ask ? "Can you explain this snippet for me?" : "",
      submit: ask,
      file: snip.file,
    });
    chatReturnFocus.current = defaultChatTrigger();
    setChatOpen(true);
    setStudyTab("chat");
    setSnip(null);
  }
  const citation = useCallback(
    (item: CitationItem) => {
      if (item.document_id !== material.id || !item.page_start) return;
      const box = item.bounding_box;
      // Ingestion coordinates are already page-normalized; page-only citations remain page-only.
      const rawRects = box?.rects?.length ? box.rects : box?.bbox ? [box.bbox] : [];
      const rects = rawRects.flatMap(([x, y, right, bottom]) => {
        const candidate = { x, y, width: right - x, height: bottom - y };
        return x >= 0 &&
          y >= 0 &&
          right <= 1 &&
          bottom <= 1 &&
          candidate.width > 0 &&
          candidate.height > 0
          ? [candidate]
          : [];
      });
      setJump({ id: Date.now(), page: box?.page || item.page_start, rects });
      if (window.matchMedia("(max-width: 860px)").matches) setChatOpen(false);
    },
    [material.id]
  );
  function refreshPdf(): void {
    setSnipping(false);
    setSnip(null);
    setSource(null);
    setPdfError(null);
    setInitialPage(page);
    setJump(null);
    setPdfAttempt((value) => value + 1);
  }
  function closeChat(): void {
    setChatOpen(false);
    (chatReturnFocus.current || defaultChatTrigger())?.focus();
  }
  function defaultChatTrigger(): HTMLButtonElement | null {
    return window.matchMedia("(max-width: 860px)").matches
      ? mobileChatToggle.current
      : chatToggle.current;
  }
  const readingControls = (
    <div className="reader-tool-end">
      <button
        type="button"
        aria-label="Zoom out"
        disabled={zoom <= 0.5}
        onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        className="reader-zoom"
        aria-label="Fit PDF to width"
        title="Fit to width"
        onClick={() => setZoom(1)}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        type="button"
        aria-label="Zoom in"
        disabled={zoom >= 3}
        onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
      >
        <Plus size={16} />
      </button>
      <select
        aria-label="Reading theme"
        value={theme}
        onChange={(event) => setTheme(event.target.value)}
      >
        <option value="paper">Paper</option>
        <option value="sepia">Sepia</option>
        <option value="night">Night</option>
      </select>
      <span className="reader-toolbar-divider" />
      <button
        type="button"
        aria-label="Open reader help"
        title="Study mode guide"
        onClick={() => setHelpOpen(true)}
      >
        <HelpCircle size={18} />
      </button>
      <button
        type="button"
        aria-label="Toggle full screen"
        title="Full screen"
        onClick={() => {
          void (
            document.fullscreenElement
              ? document.exitFullscreen()
              : root.current?.requestFullscreen()
          )?.catch(() => setNotice("Full screen is unavailable in this browser."));
        }}
      >
        <Maximize2 size={18} />
      </button>
    </div>
  );
  return (
    <div
      className="reader-workspace"
      ref={root}
      data-theme={theme}
      data-ready={!!source && !pdfError}
      data-guide-first={firstGuide && helpOpen}
      data-chat-open={chatOpen && !!source && !pdfError}
      onKeyDown={(event) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          (event.target instanceof Element && event.target.closest('[role="dialog"]'))
        )
          return;
        if (snipping || snip) {
          setSnipping(false);
          setSnip(null);
          root.current
            ?.querySelector<HTMLButtonElement>('[aria-label="Snip document area"]')
            ?.focus();
        } else if (moreActions) {
          setMoreActions(false);
        } else if (selection) {
          setSelection(null);
          window.getSelection()?.removeAllRanges();
        } else if (chatOpen) closeChat();
        else return;
        event.preventDefault();
      }}
      style={{ "--reader-chat-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <header
        className="reader-header t-panel-slide"
        data-open={!controlsHidden}
        inert={controlsHidden}
      >
        <Link href="/app/library" className="reader-back" aria-label="Back to library">
          <ArrowLeft size={18} />
        </Link>
        <div className="reader-heading">
          <h1>{material.topic || material.title}</h1>
          <p>
            {[
              material.lecturer_name,
              material.course_code,
              material.academic_session,
              material.semester
                ? `${material.semester === "first" ? "First" : "Second"} semester`
                : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
        <button
          type="button"
          className="reader-icon reader-mobile-help-toggle"
          aria-label="Open reader help"
          title="Study mode guide"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle size={20} />
        </button>
        <button
          type="button"
          className="reader-icon reader-desktop-chat-toggle"
          aria-label="Open study chat"
          aria-expanded={chatOpen}
          aria-controls="reader-chat-panel"
          ref={chatToggle}
          title="AI Assistant"
          onClick={(event) => {
            chatReturnFocus.current = event.currentTarget;
            setChatOpen((value) => !value);
          }}
        >
          <MessageSquare size={20} />
        </button>
      </header>
      <div className="reader-body">
        <section
          className="reader-document-panel"
          id="reader-document-panel"
          aria-label="Document reader"
        >
          <div
            className="reader-toolbar t-panel-slide"
            data-open={!controlsHidden}
            inert={controlsHidden}
          >
            <div className="reader-tool-start">
              <button
                type="button"
                aria-label="Snip document area"
                aria-pressed={snipping}
                title="Snip"
                disabled={!source}
                onClick={() => {
                  setSnipping((value) => !value);
                  setSnip(null);
                  setSelection(null);
                  window.getSelection()?.removeAllRanges();
                }}
              >
                <Scissors size={19} />
                <span>{snipping ? "Cancel" : "Snip"}</span>
              </button>
            </div>
            <div className="reader-page-controls">
              <button
                type="button"
                aria-label="Previous page"
                disabled={!source || page <= 1}
                onClick={() => navigate(page - 1)}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className="reader-mobile-page-counter"
                aria-label="Go to page"
                title="Go to page"
                disabled={!source}
                onClick={() => setPageDialogOpen(true)}
              >
                <span>
                  {page}/{source?.pdf.numPages || material.page_count || 1}
                </span>
              </button>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const next = Number(pageInput);
                  if (Number.isInteger(next) && next >= 1) navigate(next);
                  else setPageInput(String(page));
                }}
              >
                <input
                  aria-label="Page number"
                  inputMode="numeric"
                  value={pageInput}
                  onChange={(event) => setPageInput(event.target.value)}
                  disabled={!source}
                />
                <span>/ {source?.pdf.numPages || material.page_count || "—"}</span>
              </form>
              <button
                type="button"
                aria-label="Next page"
                disabled={!source || page >= source.pdf.numPages}
                onClick={() => navigate(page + 1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <button
              className="reader-mobile-chat-toggle"
              type="button"
              aria-label="Open study chat"
              aria-expanded={chatOpen}
              aria-haspopup="dialog"
              ref={mobileChatToggle}
              title="Chat about this document"
              onClick={(event) => {
                chatReturnFocus.current = event.currentTarget;
                setChatOpen(true);
              }}
            >
              <MessageSquare size={19} />
            </button>
            {readingControls}
            <div className="reader-progress-track" aria-hidden="true">
              <span
                style={{
                  width: `${(page / (source?.pdf.numPages || material.page_count || 1)) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="reader-canvas-area">
            {pdfError ? (
              <ReaderError message={pdfError} retry={refreshPdf} />
            ) : source ? (
              <PdfViewport
                source={source}
                initialPage={initialPage}
                zoom={zoom}
                jump={jump}
                onPage={onPage}
                onReadingScroll={onReadingScroll}
                onTapPage={tapPage}
                onSelection={selectedPassage}
                snipping={snipping}
                onSnip={(value) => {
                  setSnip(value);
                  setSnipping(false);
                }}
                onSnipError={() => setNotice("This area couldn’t be snipped. Try again.")}
                onReload={refreshPdf}
              />
            ) : (
              <div className="reader-empty" role="status">
                <Loader2 size={22} />
                <p>Opening your document…</p>
              </div>
            )}
            {snipping && (
              <div className="reader-snip-banner" role="status">
                <Scissors size={16} />
                <span>Drag to select an area on a page</span>
                <button type="button" onClick={() => setSnipping(false)}>
                  Cancel
                </button>
              </div>
            )}
            {snip && (
              <div
                className="reader-snip-preview"
                role="group"
                aria-label="Selected snippet actions"
              >
                <header>
                  <span>Selected area</span>
                  <button type="button" aria-label="Discard snip" onClick={() => setSnip(null)}>
                    <X size={15} />
                  </button>
                </header>
                {/* Local crop of the actual PDF canvas; no remote image URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={snip.preview} alt="Selected area" />
                <div>
                  <button type="button" onClick={() => stageSnip(true)}>
                    <Sparkles size={15} />
                    Ask AI
                  </button>
                  <button
                    type="button"
                    aria-label="Add to chat input"
                    title="Add to chat input"
                    onClick={() => stageSnip(false)}
                  >
                    <MessageSquarePlus size={17} />
                  </button>
                </div>
              </div>
            )}
            {selection && !snipping && !snip && (
              <div
                className="reader-selection"
                role="toolbar"
                aria-label="Selected passage actions"
                style={{ left: selectionPosition.x, top: selectionPosition.y }}
                onPointerDown={(event) => event.preventDefault()}
              >
                <div>
                  <button type="button" className="reader-ask" onClick={() => stage("explain")}>
                    <Sparkles size={14} /> Explain
                  </button>
                  <button
                    type="button"
                    aria-label="More study actions"
                    aria-expanded={moreActions}
                    aria-controls="reader-more-actions"
                    onClick={() => setMoreActions((value) => !value)}
                  >
                    More…
                  </button>
                  {moreActions && (
                    <div
                      className="reader-more-actions"
                      id="reader-more-actions"
                      role="group"
                      aria-label="More study actions"
                    >
                      {selectionActions
                        .filter((item) => item.id !== "ask" && item.id !== "explain")
                        .map((item) => (
                          <button key={item.id} type="button" onClick={() => stage(item.id)}>
                            {item.label}
                          </button>
                        ))}
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label="Copy selected text"
                    title="Copy"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(selection.text);
                        setNotice("Passage copied.");
                      } catch {
                        setNotice("Copy is unavailable. Use your browser’s Copy action.");
                      }
                    }}
                  >
                    <Copy size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
          {(progressStatus === "error" || notice) && (
            <footer className="reader-status">
              {progressStatus === "error" && (
                <button type="button" onClick={retryProgress}>
                  Position not saved · Retry
                </button>
              )}
              {notice && <span role="status">{notice}</span>}
            </footer>
          )}
        </section>
        <div
          className="reader-divider"
          role="separator"
          tabIndex={0}
          aria-label="Resize study chat"
          aria-orientation="vertical"
          aria-valuemin={320}
          aria-valuemax={640}
          aria-valuenow={sidebarWidth}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              setSidebarWidth((value) =>
                Math.max(320, Math.min(640, value + (event.key === "ArrowLeft" ? 24 : -24)))
              );
            }
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId) && root.current)
              setSidebarWidth(
                Math.max(
                  320,
                  Math.min(640, root.current.getBoundingClientRect().right - event.clientX)
                )
              );
          }}
          onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
        >
          <span />
        </div>
        <aside
          className="reader-chat-panel"
          id="reader-chat-panel"
          aria-label="Document study chat"
        >
          <StudyChat
            active={chatOpen && !!source && !pdfError}
            document={material}
            sessionId={null}
            draft={draft}
            onCitation={citation}
            onChanged={reload}
            onBackToReader={closeChat}
            tab={studyTab}
            onTabChange={setStudyTab}
            onClearDraft={() => setDraft(null)}
            returnFocus={chatReturnFocus}
          />
        </aside>
      </div>
      <ReaderGoToPage
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        page={page}
        total={source?.pdf.numPages || material.page_count || 1}
        onPage={navigate}
      />
      <ReaderTutorial open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

function ReaderLoad({ documentId }: { documentId: string }): React.ReactElement {
  const { session, profile } = useAuth();
  const [data, setData] = useState<ReaderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const token = session?.access_token;
  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        setError(null);
        if (!z.uuid().safeParse(documentId).success)
          throw new Error("This document address is invalid.");
        if (!token) return;
        const response = await fetch(
          `${env.NEXT_PUBLIC_API_URL}/api/v1/library/catalog/${documentId}/reader`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
          }
        );
        if (!response.ok) {
          if ([403, 404].includes(response.status) && profile?.university_id)
            await discardPdfCopy(
              { userId: profile.id, universityId: profile.university_id },
              documentId
            );
          throw await libraryError(response, "Your document couldn’t be loaded. Please try again.");
        }
        const result = readerSchema.parse(await response.json());
        if (result.document.id !== documentId) throw new Error("Document identity mismatch");
        if (!controller.signal.aborted) setData(result);
      } catch (cause: unknown) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error && cause.name === "Error"
              ? cause.message
              : "Your document couldn’t be loaded. Please retry."
          );
      }
    })();
    return () => controller.abort();
  }, [documentId, token, attempt, profile?.id, profile?.university_id]);
  if (error) return <ReaderError message={error} retry={() => setAttempt((value) => value + 1)} />;
  if (!data)
    return (
      <div className="reader-empty" role="status">
        <Loader2 size={24} />
        <p>Opening your study workspace…</p>
      </div>
    );
  return <ReaderDocument data={data} />;
}

export function ReaderWorkspace({ documentId }: { documentId: string }): React.ReactElement {
  const { profile, loading } = useAuth();
  return (
    <div className="reader-route">
      {loading || !profile ? (
        <div className="reader-empty" role="status">
          <Loader2 size={24} />
          <p>Opening your document...</p>
        </div>
      ) : (
        <ReaderLoad
          key={`${profile.id}:${profile.university_id}:${documentId}`}
          documentId={documentId}
        />
      )}
    </div>
  );
}
