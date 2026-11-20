"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import type { LibraryDocument } from "@pansgpt/types";
import { DialogPrimitive, SelectPrimitive } from "@pansgpt/ui/shell";
import { useCatalog } from "@/components/library/use-catalog";
import { ConversationDialog } from "@/components/chat/dialog";
import "./library-picker.css";
import "@/components/library/library.css";
import "@/components/library/library-mobile.css";
import "@/components/shell/settings/settings-modal.css";

export interface ChatLibraryPickerProps {
  open: boolean;
  revision: number;
  onOpenChange: (open: boolean) => void;
  onSelect: (document: LibraryDocument) => void;
  onSelectMultiple?: (documents: LibraryDocument[]) => void;
  onUploadFromComputer?: () => void;
}

function subscribeViewport(notify: () => void): () => void {
  const query = window.matchMedia("(max-width: 860px)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

const mobileViewport = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 860px)").matches;

interface DocumentGroup {
  title: string;
  items: LibraryDocument[];
}

function formatDocDate(timestamp: string | null | undefined): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function groupDocumentsByRecency(documents: LibraryDocument[]): DocumentGroup[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * dayMs;
  const thirtyDaysAgo = now - 30 * dayMs;

  const thisWeek: LibraryDocument[] = [];
  const lastMonth: LibraryDocument[] = [];
  const older: LibraryDocument[] = [];

  for (const doc of documents) {
    const raw = doc.last_opened_at || doc.created_at;
    const time = raw ? new Date(raw).getTime() : 0;
    if (time >= sevenDaysAgo) {
      thisWeek.push(doc);
    } else if (time >= thirtyDaysAgo) {
      lastMonth.push(doc);
    } else {
      older.push(doc);
    }
  }

  const groups: DocumentGroup[] = [];
  if (thisWeek.length > 0) groups.push({ title: "Earlier this week", items: thisWeek });
  if (lastMonth.length > 0) groups.push({ title: "Last month", items: lastMonth });
  if (older.length > 0) groups.push({ title: "Older", items: older });

  if (groups.length === 0 && documents.length > 0) {
    groups.push({ title: "Documents", items: documents });
  }

  return groups;
}

export function ChatLibraryPicker({
  open,
  revision,
  onOpenChange,
  onSelect,
  onSelectMultiple,
  onUploadFromComputer,
}: ChatLibraryPickerProps): React.ReactElement {
  const isMobile = useSyncExternalStore(subscribeViewport, mobileViewport, () => false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [retryCount, setRetryCount] = useState(0);
  const [sheetContainer, setSheetContainer] = useState<HTMLDivElement | null>(null);
  const fallbackFileInputRef = useRef<HTMLInputElement>(null);

  // Reset local state when dialog opens (render-phase state adjustment per React guidelines)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQuery("");
      setSelectedCourse(null);
      setSelectedIds(new Set());
      setFocusedIndex(-1);
      setMobileSearchOpen(false);
    }
  }

  // Catalog query parameters: fetch documents for the university/course once.
  // Instant search happens client-side without firing network requests or flickering spinners.
  const params = useMemo(() => {
    const next = new URLSearchParams({
      limit: "60",
      offset: "0",
      sort: "newest",
      collection: "all",
    });
    if (selectedCourse) next.set("course_code", selectedCourse);
    return next;
  }, [selectedCourse]);

  const { data, error, loading } = useCatalog(params, revision + retryCount, open);

  // Distinct courses derived from response + demo test courses for scrolling verification
  const courses = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of data?.courses ?? []) {
      if (c.code) map.set(c.code, c.title || c.code);
    }
    for (const doc of data?.items ?? []) {
      if (doc.course_code && !map.has(doc.course_code)) {
        map.set(doc.course_code, doc.course_title || doc.course_code);
      }
    }

    return Array.from(map.entries()).map(([code, title]) => ({ code, title }));
  }, [data?.courses, data?.items]);

  const courseOptions = useMemo(() => {
    return [
      { value: "all", label: "All courses" },
      ...courses.map((course) => ({
        value: course.code,
        label:
          course.code + (course.title && course.title !== course.code ? ` · ${course.title}` : ""),
      })),
    ];
  }, [courses]);

  // Instant Client-Side Filtering (Zero latency, live as the student types!)
  const filteredItems = useMemo(() => {
    const items = data?.items ?? [];
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return items;

    return items.filter((item) => {
      const title = item.title.toLowerCase();
      const course = item.course_code.toLowerCase();
      const courseTitle = (item.course_title || "").toLowerCase();
      const topic = (item.topic || "").toLowerCase();
      const lecturer = (item.lecturer_name || "").toLowerCase();
      return (
        title.includes(cleanQuery) ||
        course.includes(cleanQuery) ||
        courseTitle.includes(cleanQuery) ||
        topic.includes(cleanQuery) ||
        lecturer.includes(cleanQuery)
      );
    });
  }, [data?.items, query]);

  // Grouped documents
  const groupedDocuments = useMemo(() => groupDocumentsByRecency(filteredItems), [filteredItems]);

  const flatSelectableItems = useMemo(() => {
    return filteredItems;
  }, [filteredItems]);

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else {
          if (!onSelectMultiple) next.clear();
          next.add(id);
        }
        return next;
      });
    },
    [onSelectMultiple]
  );

  const handleConfirm = useCallback(() => {
    if (selectedIds.size === 0) return;
    const items = data?.items ?? [];
    const selected = items.filter((item) => selectedIds.has(item.id));
    if (selected.length > 0) {
      onSelect(selected[0]!);
      onSelectMultiple?.(selected);
      onOpenChange(false);
    }
  }, [selectedIds, data?.items, onSelect, onSelectMultiple, onOpenChange]);

  const handleDirectSelect = useCallback(
    (doc: LibraryDocument) => {
      onSelect(doc);
      onSelectMultiple?.([doc]);
      onOpenChange(false);
    },
    [onSelect, onSelectMultiple, onOpenChange]
  );

  const handleUploadFromComputer = useCallback(() => {
    onOpenChange(false);
    if (onUploadFromComputer) {
      onUploadFromComputer();
    } else {
      fallbackFileInputRef.current?.click();
    }
  }, [onUploadFromComputer, onOpenChange]);

  // Global shortcuts inside modal
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        handleConfirm();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev < flatSelectableItems.length - 1 ? prev + 1 : prev));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (event.key === "Enter" && !event.ctrlKey && !event.metaKey) {
        if (focusedIndex >= 0 && focusedIndex < flatSelectableItems.length) {
          event.preventDefault();
          const targetDoc = flatSelectableItems[focusedIndex];
          if (targetDoc) toggleSelection(targetDoc.id);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, focusedIndex, flatSelectableItems, handleConfirm, toggleSelection]);

  return (
    <>
      {isMobile ? (
        /* ==========================================================================
           MOBILE ONLY: Bottom sheet matching inspiration UI
           ========================================================================== */
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="p-dialog-overlay" data-chat-overlay />
            <DialogPrimitive.Content
              ref={setSheetContainer}
              data-chat-overlay
              className="study-chat-library-mobile-sheet"
              aria-label="Add from library"
            >
              <DialogPrimitive.Title className="p-sr-only">Add from library</DialogPrimitive.Title>
              <DialogPrimitive.Description className="p-sr-only">
                Choose a library file to use as context in your chat.
              </DialogPrimitive.Description>

              {/* Mobile Sheet Drag Handle matching chat bottom sheet */}
              <DialogPrimitive.Close
                className="study-chat-library-mobile-handle"
                aria-label="Close library"
              >
                <span />
              </DialogPrimitive.Close>

              {/* Mobile Header: Normal (Close | Title | Search) vs Searching (Search Bar | X) */}
              {!mobileSearchOpen ? (
                <header className="study-chat-library-mobile-header">
                  <DialogPrimitive.Close
                    className="study-chat-library-mobile-circle-btn"
                    aria-label="Close"
                  >
                    <X size={24} aria-hidden="true" />
                  </DialogPrimitive.Close>

                  <h2 className="study-chat-library-mobile-title">Add from library</h2>

                  <button
                    type="button"
                    className="study-chat-library-mobile-circle-btn"
                    onClick={() => setMobileSearchOpen(true)}
                    aria-label="Search library files"
                    title="Search library files"
                  >
                    <Search size={22} aria-hidden="true" />
                  </button>
                </header>
              ) : (
                <header className="study-chat-library-mobile-header is-searching">
                  <div className="study-chat-library-mobile-header-search">
                    <Search
                      size={18}
                      className="study-chat-library-mobile-header-search-icon"
                      aria-hidden="true"
                    />
                    <input
                      type="text"
                      inputMode="search"
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.currentTarget.value)}
                      placeholder="Search files or courses..."
                      aria-label="Search library files"
                      className="study-chat-library-mobile-header-search-input"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery("")}
                        className="study-chat-library-mobile-header-search-clear"
                        aria-label="Clear query"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className="study-chat-library-mobile-circle-btn"
                    onClick={() => {
                      setQuery("");
                      setMobileSearchOpen(false);
                    }}
                    aria-label="Close search"
                    title="Close search"
                  >
                    <X size={24} aria-hidden="true" />
                  </button>
                </header>
              )}

              {/* Mobile Scrollable Container */}
              <div className="study-chat-library-mobile-scroll" aria-live="polite">
                {/* 1. Upload files button (flat minimal row matching reference UI) */}
                <button
                  type="button"
                  className="study-chat-library-mobile-upload-btn"
                  onClick={handleUploadFromComputer}
                >
                  <Upload
                    size={18}
                    className="study-chat-library-mobile-upload-icon"
                    aria-hidden="true"
                  />
                  <span>Upload from your device instead</span>
                </button>

                {/* Subtle horizontal dividing line under the button matching reference UI */}
                <div className="study-chat-library-mobile-divider" aria-hidden="true" />

                {/* 2. Course Dropdown selector replicated from Appearance Settings */}
                <div className="study-chat-library-mobile-course-row">
                  <SelectPrimitive.Root
                    value={`option-${selectedCourse ?? "all"}`}
                    onValueChange={(next) => {
                      const val = next.replace(/^option-/, "");
                      setSelectedCourse(val === "all" ? null : val);
                    }}
                  >
                    <SelectPrimitive.Trigger
                      className="settings-select-trigger study-chat-library-course-trigger"
                      aria-label="Filter by course"
                    >
                      <SelectPrimitive.Value />
                      <SelectPrimitive.Icon className="settings-select-chevron study-chat-library-course-chevron">
                        <ChevronDown size={14} />
                      </SelectPrimitive.Icon>
                    </SelectPrimitive.Trigger>

                    <SelectPrimitive.Portal container={sheetContainer ?? undefined}>
                      <SelectPrimitive.Content
                        className="settings-select-menu study-chat-library-select-menu"
                        position="popper"
                        align="start"
                        sideOffset={6}
                        collisionPadding={12}
                      >
                        <SelectPrimitive.ScrollUpButton className="settings-select-scroll">
                          <ChevronUp size={14} />
                        </SelectPrimitive.ScrollUpButton>
                        <SelectPrimitive.Viewport className="settings-select-viewport study-chat-library-select-viewport">
                          {courseOptions.map((option) => (
                            <SelectPrimitive.Item
                              key={option.value}
                              value={`option-${option.value}`}
                              className="settings-select-option study-chat-library-select-option"
                            >
                              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                              <span className="settings-select-check study-chat-library-select-check">
                                <SelectPrimitive.ItemIndicator>
                                  <Check size={14} />
                                </SelectPrimitive.ItemIndicator>
                              </span>
                            </SelectPrimitive.Item>
                          ))}
                        </SelectPrimitive.Viewport>
                        <SelectPrimitive.ScrollDownButton className="settings-select-scroll">
                          <ChevronDown size={14} />
                        </SelectPrimitive.ScrollDownButton>
                      </SelectPrimitive.Content>
                    </SelectPrimitive.Portal>
                  </SelectPrimitive.Root>
                </div>

                {/* 3. Section Heading: "Recent" or "Results (count)" below All courses */}
                <div className="study-chat-library-mobile-section-heading">
                  {query
                    ? `Results (${filteredItems.length})`
                    : selectedCourse
                      ? `${selectedCourse}`
                      : "Recent"}
                </div>

                {/* Body Content: List View Only */}
                {loading ? (
                  <div className="study-chat-library-empty-state" role="status">
                    <Loader2
                      size={28}
                      className="p-spin study-chat-library-state-icon"
                      aria-hidden="true"
                    />
                    <h3>Loading library files…</h3>
                    <p>Fetching your university catalog</p>
                  </div>
                ) : error ? (
                  <div className="study-chat-library-empty-state" role="alert">
                    <AlertCircle
                      size={32}
                      className="study-chat-library-state-icon is-error"
                      aria-hidden="true"
                    />
                    <h3>Unable to load library</h3>
                    <p>{error || "Please check your connection or try again in a moment."}</p>
                    <div className="study-chat-library-empty-actions">
                      <button
                        type="button"
                        className="study-chat-library-retry-btn"
                        onClick={() => setRetryCount((c) => c + 1)}
                      >
                        <RotateCcw size={14} aria-hidden="true" />
                        <span>Try again</span>
                      </button>
                      <button
                        type="button"
                        className="study-chat-library-retry-btn is-alt"
                        onClick={handleUploadFromComputer}
                      >
                        <Upload size={14} aria-hidden="true" />
                        <span>Upload files instead</span>
                      </button>
                    </div>
                  </div>
                ) : filteredItems.length > 0 ? (
                  <div className="study-chat-library-mobile-list" role="list">
                    {filteredItems.map((doc) => {
                      const isSelected = selectedIds.has(doc.id);
                      return (
                        <div
                          key={doc.id}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className={`study-chat-library-mobile-row ${isSelected ? "is-selected" : ""}`}
                          onClick={() => toggleSelection(doc.id)}
                          onKeyDown={(e) => {
                            if (e.key === " " || e.key === "Enter") {
                              e.preventDefault();
                              toggleSelection(doc.id);
                            }
                          }}
                        >
                          <div
                            className={`study-chat-library-mobile-radio ${isSelected ? "is-selected" : ""}`}
                            aria-hidden="true"
                          >
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </div>

                          <div className="study-chat-library-mobile-file-icon" aria-hidden="true">
                            <FileText size={18} />
                          </div>

                          <div className="study-chat-library-mobile-info">
                            <span className="study-chat-library-mobile-row-title">{doc.title}</span>
                            <span className="study-chat-library-mobile-row-meta">
                              {doc.course_code && (
                                <span className="study-chat-library-mobile-course-badge">
                                  {doc.course_code}
                                </span>
                              )}
                              {doc.created_at && (
                                <span className="study-chat-library-mobile-date">
                                  {doc.course_code ? "· " : ""}
                                  {formatDocDate(doc.last_opened_at || doc.created_at)}
                                </span>
                              )}
                              {doc.page_count ? (
                                <span className="study-chat-library-mobile-pages">
                                  · {doc.page_count}p
                                </span>
                              ) : null}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="study-chat-library-empty-state">
                    <FileText
                      size={32}
                      className="study-chat-library-state-icon"
                      aria-hidden="true"
                    />
                    <h3>No documents found</h3>
                    <p>
                      {query || selectedCourse
                        ? `No library documents match "${query || selectedCourse}".`
                        : "There are no files in your library yet."}
                    </p>
                    <div className="study-chat-library-empty-actions">
                      <button
                        type="button"
                        className="study-chat-library-retry-btn is-alt"
                        onClick={handleUploadFromComputer}
                      >
                        <Upload size={14} aria-hidden="true" />
                        <span>Upload files</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Bottom Action Bar */}
              {selectedIds.size > 0 && (
                <div className="study-chat-library-mobile-floating-bar">
                  <button
                    type="button"
                    className="study-chat-library-mobile-floating-btn"
                    onClick={handleConfirm}
                  >
                    <span>Add to chat</span>
                    <span className="study-chat-library-mobile-floating-count">
                      {selectedIds.size}
                    </span>
                  </button>
                </div>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      ) : (
        /* ==========================================================================
           DESKTOP SPOTLIGHT MODAL (100% UNTOUCHED)
           ========================================================================== */
        <ConversationDialog
          open={open}
          onOpenChange={onOpenChange}
          title="Upload from library"
          description="Choose a library file to use as context in your chat."
          className="study-chat-library-spotlight"
          minimalHeader
        >
          <div className="study-chat-library-header">
            {/* Top Search Bar (type="text" eliminates the duplicate native browser clear 'x') */}
            <div className="study-chat-library-search-row">
              <Search size={16} className="study-chat-library-search-icon" aria-hidden="true" />
              <input
                type="text"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                placeholder="Search library or course..."
                aria-label="Search library files"
                className="study-chat-library-search-input"
                autoFocus
              />
            </div>

            {/* Course Code Filter Chips with horizontal wheel scrolling & right fade indicator */}
            {courses.length > 0 && (
              <div className="study-chat-library-chips-wrapper">
                <div
                  className="study-chat-library-chips"
                  role="tablist"
                  aria-label="Filter by course code"
                  onWheel={(e) => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selectedCourse === null}
                    className={`study-chat-library-chip ${selectedCourse === null ? "is-active" : ""}`}
                    onClick={() => setSelectedCourse(null)}
                  >
                    All
                  </button>
                  {courses.map((course) => (
                    <button
                      key={course.code}
                      type="button"
                      role="tab"
                      aria-selected={selectedCourse === course.code}
                      className={`study-chat-library-chip ${selectedCourse === course.code ? "is-active" : ""}`}
                      onClick={() =>
                        setSelectedCourse(selectedCourse === course.code ? null : course.code)
                      }
                    >
                      {course.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Scrollable Content Body */}
          <div className="study-chat-library-body" aria-live="polite">
            {loading ? (
              <div className="study-chat-library-empty-state" role="status">
                <Loader2
                  size={28}
                  className="p-spin study-chat-library-state-icon"
                  aria-hidden="true"
                />
                <h3>Loading library files…</h3>
                <p>Fetching your university catalog</p>
              </div>
            ) : error ? (
              <div className="study-chat-library-empty-state" role="alert">
                <AlertCircle
                  size={32}
                  className="study-chat-library-state-icon is-error"
                  aria-hidden="true"
                />
                <h3>Unable to load library</h3>
                <p>{error || "Please check your connection or try again in a moment."}</p>
                <div className="study-chat-library-empty-actions">
                  <button
                    type="button"
                    className="study-chat-library-retry-btn"
                    onClick={() => setRetryCount((c) => c + 1)}
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>Try again</span>
                  </button>
                  <button
                    type="button"
                    className="study-chat-library-retry-btn is-alt"
                    onClick={handleUploadFromComputer}
                  >
                    <Upload size={14} aria-hidden="true" />
                    <span>Upload from computer</span>
                  </button>
                </div>
              </div>
            ) : groupedDocuments.length > 0 ? (
              groupedDocuments.map((group) => (
                <div key={group.title} className="study-chat-library-section">
                  <div className="study-chat-library-section-title">{group.title}</div>
                  <div className="study-chat-library-list">
                    {group.items.map((doc) => {
                      const isSelected = selectedIds.has(doc.id);
                      const itemGlobalIndex = flatSelectableItems.findIndex((d) => d.id === doc.id);
                      const isFocused = focusedIndex === itemGlobalIndex;
                      return (
                        <div
                          key={doc.id}
                          role="checkbox"
                          aria-checked={isSelected}
                          tabIndex={0}
                          className={`study-chat-library-item-row ${isSelected ? "is-selected" : ""} ${isFocused ? "is-focused" : ""}`}
                          onClick={() => toggleSelection(doc.id)}
                          onDoubleClick={() => handleDirectSelect(doc)}
                        >
                          <div className="study-chat-library-checkbox" aria-hidden="true">
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="study-chat-library-item-content">
                            <span className="study-chat-library-item-title" title={doc.title}>
                              {doc.title}
                            </span>
                            {doc.created_at && (
                              <span className="study-chat-library-item-date">
                                · {formatDocDate(doc.last_opened_at || doc.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="study-chat-library-item-meta">
                            <span className="study-chat-library-badge-course">
                              {doc.course_code || "Document"}
                            </span>
                            <FileText
                              size={15}
                              className="study-chat-library-file-icon"
                              aria-hidden="true"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="study-chat-library-empty-state">
                <FileText size={32} className="study-chat-library-state-icon" aria-hidden="true" />
                <h3>No documents found</h3>
                <p>
                  {query || selectedCourse
                    ? `No library documents match "${query || selectedCourse}".`
                    : "There are no files in your library yet."}
                </p>
                <div className="study-chat-library-empty-actions">
                  <button
                    type="button"
                    className="study-chat-library-retry-btn is-alt"
                    onClick={handleUploadFromComputer}
                  >
                    <Upload size={14} aria-hidden="true" />
                    <span>Upload from computer</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="study-chat-library-footer">
            <div className="study-chat-library-footer-hints">
              <span className="study-chat-library-hint-item">
                <kbd className="study-chat-library-kbd">↑</kbd>
                <kbd className="study-chat-library-kbd">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="study-chat-library-hint-item">
                <kbd className="study-chat-library-kbd">↵</kbd>
                <span>Select</span>
              </span>
            </div>
            <div className="study-chat-library-footer-actions">
              <button
                type="button"
                className="study-chat-library-upload-alt-btn"
                onClick={handleUploadFromComputer}
              >
                <Upload size={14} aria-hidden="true" />
                <span>Upload from computer instead</span>
              </button>
              {selectedIds.size > 0 && (
                <span className="study-chat-library-count">{selectedIds.size} selected</span>
              )}
              <button
                type="button"
                disabled={selectedIds.size === 0}
                className="study-chat-library-submit-btn"
                onClick={handleConfirm}
              >
                <span>Add to chat</span>
                <kbd className="study-chat-library-submit-kbd">Ctrl ↵</kbd>
              </button>
            </div>
          </div>
        </ConversationDialog>
      )}

      {/* Hidden fallback file input if caller doesn't provide onUploadFromComputer */}
      <input
        ref={fallbackFileInputRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,image/png,image/jpeg"
      />
    </>
  );
}
