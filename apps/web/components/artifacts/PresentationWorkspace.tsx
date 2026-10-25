"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Maximize2,
  Presentation,
  RotateCcw,
  X,
} from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import type { ArtifactItem, PresentationPreviewResponse, PresentationSlide } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { env } from "@/env";
import { loadPresentationPreview, presentationMetadataSchema } from "@/lib/presentation-preview";
import { safeChatLink } from "@/lib/chat-message";
import { ArtifactDownloadButton } from "./ArtifactDownloadButton";
import "./PresentationWorkspace.css";

const desktopQuery = "(min-width: 1200px)";
function subscribe(notify: () => void): () => void {
  const query = window.matchMedia(desktopQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}
interface WorkspaceActions {
  open: (artifact: ArtifactItem, automatic?: boolean, opener?: HTMLButtonElement) => void;
  received: (artifact: ArtifactItem) => void;
}
const Context = createContext<WorkspaceActions | null>(null);
export const usePresentationWorkspace = (): WorkspaceActions | null => useContext(Context);

export function PresentationSlideView({
  slide,
  width,
  height,
  thumbnail = false,
}: {
  slide: PresentationSlide;
  width: number;
  height: number;
  thumbnail?: boolean;
}): React.ReactElement {
  return (
    <svg
      className="study-slide-canvas"
      viewBox={`0 0 ${width} ${height}`}
      role={thumbnail ? undefined : "img"}
      aria-hidden={thumbnail || undefined}
      aria-label={thumbnail ? undefined : `Slide ${slide.number}: ${slide.title}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width={width} height={height} fill={slide.background} />
      {slide.elements.map((element, index) =>
        element.kind === "text" ? (
          <text
            key={index}
            x={element.x}
            y={element.y}
            fontFamily="Arial, sans-serif"
            fontSize={element.font_size}
            fontWeight={element.bold ? 700 : 400}
            fontStyle={element.italic ? "italic" : "normal"}
            fill={element.color}
            textAnchor={element.align}
            xmlSpace="preserve"
          >
            {element.text}
          </text>
        ) : element.kind === "ellipse" ? (
          <ellipse
            key={index}
            cx={element.x + element.width / 2}
            cy={element.y + element.height / 2}
            rx={element.width / 2}
            ry={element.height / 2}
            fill={element.fill ?? "none"}
            stroke={element.stroke ?? "none"}
            strokeWidth={element.stroke_width}
          />
        ) : (
          <rect
            key={index}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={element.radius}
            fill={element.fill ?? "none"}
            stroke={element.stroke ?? "none"}
            strokeWidth={element.stroke_width}
          />
        )
      )}
    </svg>
  );
}

export function PresentationWorkspace({ children }: { children: ReactNode }): React.ReactElement {
  const { session, profile } = useAuth();
  const desktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(desktopQuery).matches,
    () => false
  );
  const [artifact, setArtifact] = useState<ArtifactItem | null>(null);
  const [selection, setSelection] = useState(0);
  const [zoom, setZoom] = useState("fit");
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: PresentationPreviewResponse;
    error?: string;
  } | null>(null);
  const panel = useRef<HTMLElement>(null);
  const thumbs = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const manual = useRef(false);
  const opened = useRef(new Set<string>());
  const key = `${profile?.id}:${profile?.university_id}:${artifact?.storage_key || artifact?.download_url}:${retry}`;
  const open = useCallback((next: ArtifactItem, automatic = false, trigger?: HTMLButtonElement) => {
    const id = next.storage_key || next.download_url;
    if (next.file_extension?.toLowerCase() !== "pptx" || !id) return;
    if (automatic && (!window.matchMedia(desktopQuery).matches || opened.current.has(id))) return;
    opened.current.add(id);
    manual.current = !automatic;
    opener.current = trigger ?? null;
    setArtifact(next);
    setSelection(0);
    setZoom("fit");
  }, []);
  const actions = useMemo(
    () => ({ open, received: (next: ArtifactItem) => open(next, true) }),
    [open]
  );
  const close = useCallback(() => {
    setArtifact(null);
    setResult(null);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLTextAreaElement>('[aria-label="Study question"]')
          ?.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    if (!artifact) return;
    const controller = new AbortController();
    void loadPresentationPreview(
      artifact,
      env.NEXT_PUBLIC_API_URL,
      session?.access_token,
      controller.signal
    )
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            error: failure instanceof Error ? failure.message : "The preview could not be loaded.",
          });
      });
    return () => controller.abort();
  }, [artifact, key, session?.access_token]);
  useEffect(() => {
    if (artifact && desktop && manual.current) panel.current?.focus({ preventScroll: true });
  }, [artifact, desktop]);
  const data = result?.key === key ? result.data : undefined;
  const error = result?.key === key ? result.error : undefined;
  const index = Math.min(selection, (data?.slides_count ?? 1) - 1);
  useEffect(() => {
    thumbs.current
      ?.querySelector<HTMLElement>(`[data-slide="${index}"]`)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index]);
  const slide = data?.slides[index];
  function navigate(next: number): void {
    const value = Math.max(0, Math.min(next, (data?.slides_count ?? 1) - 1));
    setSelection(value);
    if (thumbs.current?.contains(document.activeElement))
      requestAnimationFrame(() =>
        thumbs.current
          ?.querySelector<HTMLButtonElement>(`[data-slide="${value}"]`)
          ?.focus({ preventScroll: true })
      );
  }
  const metadata = presentationMetadataSchema.safeParse(artifact?.content);
  const sources = metadata.success ? (metadata.data.sources ?? []) : [];
  const contents = artifact && (
    <section
      className="study-presentation-panel"
      ref={panel}
      tabIndex={-1}
      onKeyDown={(event) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLSelectElement ||
          event.target instanceof HTMLTextAreaElement
        )
          return;
        if (event.key === "Escape" && desktop && !document.fullscreenElement) {
          event.stopPropagation();
          close();
        }
        if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key) && data) {
          event.preventDefault();
          navigate(
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? data.slides_count - 1
                : index + (event.key === "ArrowRight" ? 1 : -1)
          );
        }
      }}
    >
      <header className="study-presentation-header">
        <Presentation size={18} aria-hidden="true" />
        <div>
          <h2>{data?.title || artifact.title}</h2>
          <span>
            {data ? `${data.slides_count} slides · PowerPoint` : "PowerPoint presentation"}
          </span>
        </div>
        <ArtifactDownloadButton
          key={artifact.storage_key || artifact.download_url}
          artifact={artifact}
          label="Download presentation"
        />
        <button
          type="button"
          className="study-presentation-icon"
          aria-label="Close presentation preview"
          onClick={close}
        >
          <X size={18} />
        </button>
      </header>
      {data && (
        <div className="study-presentation-controls" role="group" aria-label="Slide controls">
          <button
            className="study-presentation-icon"
            aria-label="Previous slide"
            disabled={index === 0}
            onClick={() => navigate(index - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span role="status" aria-live="polite">
            Slide {index + 1} of {data.slides_count}
          </span>
          <button
            className="study-presentation-icon"
            aria-label="Next slide"
            disabled={index === data.slides_count - 1}
            onClick={() => navigate(index + 1)}
          >
            <ChevronRight size={17} />
          </button>
          <label className="study-presentation-zoom">
            <span className="p-sr-only">Slide zoom</span>
            <select
              aria-label="Slide zoom"
              value={zoom}
              onChange={(event) => setZoom(event.target.value)}
            >
              <option value="fit">Fit</option>
              <option value="50">50%</option>
              <option value="75">75%</option>
              <option value="100">100%</option>
              <option value="125">125%</option>
              <option value="150">150%</option>
            </select>
          </label>
          {typeof document !== "undefined" && document.fullscreenEnabled && (
            <button
              className="study-presentation-icon"
              aria-label="Expand presentation"
              onClick={() => {
                if (panel.current?.requestFullscreen)
                  void panel.current.requestFullscreen().catch(() => undefined);
              }}
            >
              <Maximize2 size={16} />
            </button>
          )}
        </div>
      )}
      <div
        className="study-presentation-stage"
        data-fit={zoom === "fit"}
        aria-busy={!data && !error}
      >
        {error ? (
          <div className="study-presentation-state" role="alert">
            <p>{error}</p>
            <button onClick={() => setRetry((value) => value + 1)}>
              <RotateCcw size={15} /> Retry preview
            </button>
            <small>Download remains available above.</small>
          </div>
        ) : !data || !slide ? (
          <div className="study-presentation-state" role="status">
            <Loader2 size={24} className="study-artifact-spinner" />
            <p>Loading presentation…</p>
          </div>
        ) : (
          <div
            className="study-presentation-sheet"
            style={
              zoom === "fit"
                ? undefined
                : {
                    width: (data.width * Number(zoom)) / 100,
                    aspectRatio: `${data.width}/${data.height}`,
                  }
            }
          >
            <PresentationSlideView slide={slide} width={data.width} height={data.height} />
          </div>
        )}
      </div>
      {!!data?.warnings.length && (
        <p className="study-presentation-warning" role="status">
          {data.warnings.join(" ")}
        </p>
      )}
      {data && (
        <>
          <nav className="study-presentation-thumbnails" aria-label="Slides" ref={thumbs}>
            {data.slides.map((item, position) => (
              <button
                type="button"
                data-slide={position}
                key={item.number}
                tabIndex={position === index ? 0 : -1}
                aria-label={`Slide ${item.number}: ${item.title}`}
                aria-current={position === index ? "page" : undefined}
                onClick={() => navigate(position)}
              >
                <PresentationSlideView
                  slide={item}
                  width={data.width}
                  height={data.height}
                  thumbnail
                />
                <span>{item.number}</span>
              </button>
            ))}
          </nav>
          <footer className="study-presentation-details">
            <details>
              <summary>Speaker notes</summary>
              <p>{slide?.notes || "No speaker notes on this slide."}</p>
            </details>
            <details>
              <summary>Sources {sources.length ? `(${sources.length})` : ""}</summary>
              {sources.length ? (
                <ul>
                  {sources.map((source, number) => (
                    <li key={number}>
                      {safeChatLink(source.url ?? undefined) ? (
                        <a
                          href={safeChatLink(source.url ?? undefined)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {source.title}
                        </a>
                      ) : (
                        source.title
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No external sources were attached to this deck.</p>
              )}
            </details>
          </footer>
        </>
      )}
    </section>
  );
  return (
    <Context.Provider value={actions}>
      <div className="study-presentation-workspace" data-open={!!artifact && desktop}>
        <div className="study-presentation-conversation">{children}</div>
        {!!artifact && desktop && (
          <aside className="study-presentation-sidebar" aria-label="Presentation preview">
            {contents}
          </aside>
        )}
        <DialogPrimitive.Root
          open={!!artifact && !desktop}
          onOpenChange={(next) => {
            if (!next) close();
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="study-presentation-overlay" />
            <DialogPrimitive.Content
              className="study-presentation-dialog"
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <DialogPrimitive.Title className="p-sr-only">
                Presentation preview
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="p-sr-only">
                Read slides and speaker notes, navigate the presentation or download the PowerPoint.
              </DialogPrimitive.Description>
              {!desktop && contents}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    </Context.Provider>
  );
}
