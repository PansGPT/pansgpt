"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileText, Search } from "lucide-react";
import type { LibraryDocument } from "@pansgpt/types";
import { useCatalog } from "@/components/library/use-catalog";
import { ConversationDialog } from "@/components/chat/dialog";

export function ChatLibraryPicker({
  open,
  revision,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  revision: number;
  onOpenChange: (open: boolean) => void;
  onSelect: (document: LibraryDocument) => void;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);
  const params = useMemo(() => {
    const next = new URLSearchParams({
      limit: "60",
      offset: "0",
      sort: "newest",
      collection: "all",
    });
    if (search) next.set("q", search);
    return next;
  }, [search]);
  const { data, error, loading } = useCatalog(params, revision, open);

  return (
    <ConversationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Upload from library"
      description="Choose a library file to use as context in your chat."
      className="study-chat-library-dialog"
    >
      <label className="study-chat-library-search">
        <Search size={17} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search your library"
          aria-label="Search library files"
        />
      </label>
      <div className="study-chat-library-results" aria-live="polite">
        {loading ? (
          <p className="study-chat-library-state" role="status">
            Loading library files…
          </p>
        ) : error ? (
          <p className="study-chat-library-state" role="alert">
            {error}
          </p>
        ) : data?.items.length ? (
          data.items.map((document) => (
            <button
              key={document.id}
              type="button"
              className="study-chat-library-item"
              onClick={() => onSelect(document)}
            >
              <span className="study-chat-library-item-icon" aria-hidden="true">
                <FileText size={18} />
              </span>
              <span className="study-chat-library-item-copy">
                <strong>{document.title}</strong>
                <small>
                  {document.course_code} · {document.page_count} pages
                </small>
              </span>
              <BookOpen size={17} aria-hidden="true" />
            </button>
          ))
        ) : (
          <p className="study-chat-library-state">
            {search
              ? "No library files match that search."
              : "There are no files in your library yet."}
          </p>
        )}
      </div>
      {data && data.total > data.items.length && (
        <p className="study-chat-library-hint">
          Showing the first {data.items.length} files. Search to find another file.
        </p>
      )}
    </ConversationDialog>
  );
}
