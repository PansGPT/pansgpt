"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  FolderClosed,
  FileText,
  LayoutGrid,
  Library,
  List,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  X,
  PanelLeft,
} from "lucide-react";
import { Button, Skeleton } from "@pansgpt/ui/shell";
import type { LibraryDocument, LibraryCourse } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { fileSize, materialDate, readingDateGroup } from "@/lib/library-catalog";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { DocumentDetails } from "./document-details";
import { useCatalog } from "./use-catalog";
import { DocumentThumbnail } from "@/components/shell/document-thumbnail";
import { DocumentCard } from "@/components/shell/document-card";
import { useDashboard } from "@/components/shell/dashboard-data";
import { useWorkspaceNavigation } from "@/components/shell/workspace-navigation";
import "./library.css";
import "./library-mobile.css";

type Location = { kind: "recent" | "courses" } | { kind: "course"; code: string };

export function WorkspaceLibrary({
  initialQuery = "",
}: {
  initialQuery?: string;
}): React.ReactElement {
  const { session, profile } = useAuth();
  return (
    <LibraryContent
      key={`${profile?.id}:${profile?.university_id}:${session?.user.id}`}
      initialQuery={initialQuery}
    />
  );
}

function LibraryContent({ initialQuery }: { initialQuery: string }): React.ReactElement {
  const { session, profile } = useAuth();
  const dashboard = useDashboard();
  const openNavigation = useWorkspaceNavigation();
  const [today] = useState(() => new Date());
  const [location, setLocation] = useState<Location>({ kind: "recent" });
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery.trim());
  const [academicSession, setAcademicSession] = useState("");
  const [semester, setSemester] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryDocument | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const selectionOpener = useRef<HTMLButtonElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [location, search, academicSession, semester, sort, offset]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setOffset(0);
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);
  const recent = location.kind === "recent" && !search;
  const params = new URLSearchParams({
    limit: "24",
    offset: String(offset),
    sort,
    collection: recent ? "recent" : "all",
  });
  if (search) params.set("q", search);
  if (location.kind === "course" && !search) params.set("course_code", location.code);
  if (academicSession) params.set("academic_session", academicSession);
  if (semester) params.set("semester", semester);
  const { data, loading, error } = useCatalog(params, revision);
  const courses = data?.courses ?? [];
  const course =
    location.kind === "course" ? courses.find((item) => item.code === location.code) : undefined;
  const folders = location.kind === "courses" && !search;
  const matchingCourses = courses.filter((item) =>
    `${item.code} ${item.title}`.toLowerCase().includes(search.toLowerCase())
  );
  const canUpload =
    profile && ["lecturer", "university_admin", "super_admin"].includes(profile.role);
  const title = search
    ? "Search results"
    : location.kind === "recent"
      ? "Recent Documents"
      : folders
        ? "Courses"
        : location.kind === "course"
          ? location.code
          : "Courses";
  function navigate(next: Location): void {
    setLocation(next);
    setOffset(0);
    setSelected(null);
    setQuery("");
    setSearch("");
  }
  function reload(): void {
    setRevision((value) => value + 1);
    setSelected(null);
  }
  function resetFilters(): void {
    setQuery("");
    setSearch("");
    setAcademicSession("");
    setSemester("");
    setOffset(0);
    setFiltersOpen(false);
  }
  const courseGrid = (items: LibraryCourse[]): React.ReactElement => (
    <ul className="library-course-grid" aria-label="Courses">
      {items.map((item) => (
        <li key={item.code}>
          <button type="button" onClick={() => navigate({ kind: "course", code: item.code })}>
            <span className="library-folder-icon">
              <FolderClosed size={24} strokeWidth={1.5} />
            </span>
            <span className="library-folder-copy">
              <strong>{item.code}</strong>
              <span>{item.title}</span>
              <small>
                {item.document_count} {item.document_count === 1 ? "material" : "materials"}
              </small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
  return (
    <section
      className="workspace-library library-workspace"
      aria-label="Your library"
      data-collection={location.kind}
      data-folders={folders}
    >
      <aside className="library-course-panel" aria-label="Library navigation">
        <div className="library-panel-title">
          <Library size={21} />
          <h2>My Library</h2>
        </div>
        <nav aria-label="Library collections">
          <button
            type="button"
            aria-current={recent ? "page" : undefined}
            onClick={() => navigate({ kind: "recent" })}
          >
            <Clock3 size={17} />
            Recent Documents
          </button>
        </nav>
        <div className="library-course-panel-heading">
          <h3>Courses</h3>
          <span>{data ? courses.length : ""}</span>
        </div>
        <div
          className="library-course-scroll"
          tabIndex={0}
          role="region"
          aria-label="Course navigation"
        >
          {loading ? (
            <p className="library-muted">Loading courses…</p>
          ) : error ? (
            <p className="library-muted">Courses unavailable</p>
          ) : courses.length ? (
            courses.map((item) => (
              <button
                type="button"
                key={item.code}
                aria-current={
                  location.kind === "course" && location.code === item.code && !search
                    ? "page"
                    : undefined
                }
                onClick={() => navigate({ kind: "course", code: item.code })}
                title={item.title}
              >
                <BookOpen size={16} />
                <span>{item.code}</span>
                <small>{item.document_count}</small>
              </button>
            ))
          ) : (
            <p className="library-muted">Your courses will appear here.</p>
          )}
        </div>
        <p className="library-panel-caption">
          Your university
          <span>Course materials, together.</span>
        </p>
      </aside>
      <div className="library-main">
        <header className="library-mobile-topbar">
          <button
            type="button"
            className="library-mobile-nav-trigger"
            aria-label="Open navigation"
            onClick={(event) => openNavigation(event.currentTarget)}
          >
            <PanelLeft size={20} />
          </button>
          <strong>Library</strong>
          <div className="library-mobile-top-actions">
            <button
              type="button"
              className="library-icon-button"
              aria-label="Refresh"
              onClick={reload}
              disabled={loading}
            >
              <RefreshCw size={18} />
            </button>
            {canUpload && (
              <button
                type="button"
                className="library-icon-button"
                aria-label="Upload material"
                onClick={() => setUploadOpen(true)}
              >
                <Upload size={18} />
              </button>
            )}
          </div>
        </header>
        <header className="library-header">
          <div>
            {location.kind === "course" && !search && (
              <button
                type="button"
                className="library-back"
                aria-label="Back to courses"
                onClick={() => navigate({ kind: "courses" })}
              >
                <ArrowLeft size={14} />
                Courses
              </button>
            )}
            <h1>{title}</h1>
            <p>
              {course && !search
                ? course.title
                : search
                  ? `Results for “${search}”`
                  : recent
                    ? "Pick up where you left off."
                    : "Your university’s course materials, in one place."}
            </p>
          </div>
          <div className="library-header-actions">
            <button
              type="button"
              className="library-icon-button"
              data-library-refresh
              aria-label="Refresh"
              onClick={reload}
              disabled={loading}
            >
              <RefreshCw size={17} />
            </button>
            {canUpload && (
              <Button
                className="library-upload-trigger"
                aria-label="Upload material"
                leadingIcon={<Upload size={15} />}
                trailingIcon={null}
                onClick={() => setUploadOpen(true)}
              >
                Upload material
              </Button>
            )}
            <div className="library-view-switch" role="group" aria-label="Document layout">
              <button
                type="button"
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <List size={18} />
              </button>
            </div>
            <button
              type="button"
              className="library-filter-toggle library-icon-button"
              aria-label="Academic filters"
              aria-expanded={filtersOpen}
              aria-controls="library-academic-filters"
              onClick={() => setFiltersOpen((value) => !value)}
            >
              <SlidersHorizontal size={18} />
              {(academicSession || semester) && <span className="library-filter-dot" />}
            </button>
          </div>
        </header>
        <div className="library-toolbar-v2">
          <label className="library-search">
            <Search size={17} aria-hidden="true" />
            <span className="p-sr-only">Search your library</span>
            <input
              type="search"
              aria-label="Search your library"
              placeholder="Search documents or courses…"
              value={query}
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear library search" onClick={() => setQuery("")}>
                <X size={15} />
              </button>
            )}
          </label>
          <div
            className="library-academic-filters"
            id="library-academic-filters"
            data-open={filtersOpen}
          >
            <label>
              <span className="p-sr-only">Academic session</span>
              <select
                aria-label="Academic session"
                value={academicSession}
                onChange={(event) => {
                  setAcademicSession(event.target.value);
                  setOffset(0);
                  setFiltersOpen(false);
                }}
              >
                <option value="">All sessions</option>
                {data?.academic_sessions.map((value) => (
                  <option key={value}>{value}</option>
                ))}
                {academicSession && !data?.academic_sessions.includes(academicSession) && (
                  <option>{academicSession}</option>
                )}
              </select>
            </label>
            <label>
              <span className="p-sr-only">Semester</span>
              <select
                aria-label="Semester"
                value={semester}
                onChange={(event) => {
                  setSemester(event.target.value);
                  setOffset(0);
                  setFiltersOpen(false);
                }}
              >
                <option value="">All semesters</option>
                <option value="first">First semester</option>
                <option value="second">Second semester</option>
              </select>
            </label>
          </div>
        </div>
        <nav className="library-mobile-tabs" aria-label="Library sections">
          <button
            type="button"
            aria-current={recent ? "page" : undefined}
            onClick={() => navigate({ kind: "recent" })}
          >
            Recent
          </button>
          <button
            type="button"
            aria-current={location.kind !== "recent" && !search ? "page" : undefined}
            onClick={() => navigate({ kind: "courses" })}
          >
            Courses
          </button>
        </nav>
        {(academicSession || semester) && (
          <div className="library-filter-chips" aria-label="Active academic filters">
            {academicSession && (
              <button
                type="button"
                aria-label="Clear academic session filter"
                onClick={() => {
                  setAcademicSession("");
                  setOffset(0);
                }}
              >
                {academicSession}
                <X size={12} />
              </button>
            )}
            {semester && (
              <button
                type="button"
                aria-label="Clear semester filter"
                onClick={() => {
                  setSemester("");
                  setOffset(0);
                }}
              >
                {semester === "first" ? "First semester" : "Second semester"}
                <X size={12} />
              </button>
            )}
          </div>
        )}
        <div className="library-results-heading">
          <span role="status">
            {loading
              ? "Loading materials…"
              : error
                ? "Library unavailable"
                : folders
                  ? `${courses.length} courses`
                  : `${data?.total ?? 0} ${(data?.total ?? 0) === 1 ? "material" : "materials"}`}
          </span>
          {!recent && !folders && (
            <label>
              <span className="p-sr-only">Sort materials</span>
              <select
                aria-label="Sort materials"
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value);
                  setOffset(0);
                }}
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          )}
        </div>
        <div className="library-results" ref={scroller}>
          {loading ? (
            <div className="library-loading" aria-label="Loading library" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <Skeleton key={index} className="library-card-skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="library-empty" role="alert">
              <BookOpen size={29} />
              <h2>We couldn&apos;t load your library</h2>
              <p>{error}</p>
              <Button variant="secondary" leadingIcon={null} trailingIcon={null} onClick={reload}>
                Retry library
              </Button>
            </div>
          ) : folders ? (
            courses.length ? (
              courseGrid(courses)
            ) : (
              <div className="library-empty">
                <FolderClosed size={30} />
                <h2>
                  {academicSession || semester
                    ? "No matching courses"
                    : "Your courses will appear here"}
                </h2>
                <p>
                  {academicSession || semester
                    ? "Try another academic period or clear your filters."
                    : "Materials will be available when your university shares them."}
                </p>
                {(academicSession || semester) && (
                  <Button
                    variant="secondary"
                    leadingIcon={null}
                    trailingIcon={null}
                    onClick={resetFilters}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )
          ) : (
            <>
              {!!search && offset === 0 && matchingCourses.length > 0 && (
                <section className="library-search-courses">
                  <h2>Courses</h2>
                  {courseGrid(matchingCourses)}
                </section>
              )}
              {data?.items.length ? (
                <>
                  {search && <h2 className="library-results-label">Documents</h2>}
                  {view === "list" && (
                    <div className="library-list-heading" aria-hidden="true">
                      <span>Document</span>
                      <span>Lecturer</span>
                      <span>{recent ? "Last opened" : "Added"}</span>
                      <span>Size</span>
                    </div>
                  )}
                  <ul
                    className={`library-materials library-materials-${view}`}
                    aria-label="Course documents"
                  >
                    {data.items.map((item, index) => (
                      <Fragment key={item.id}>
                        {recent &&
                          (index === 0 ||
                            readingDateGroup(
                              data.items[index - 1]?.last_opened_at ?? null,
                              today
                            ) !== readingDateGroup(item.last_opened_at, today)) && (
                            <li className="library-date-group" role="presentation">
                              <h2>{readingDateGroup(item.last_opened_at, today)}</h2>
                            </li>
                          )}
                        <li key={item.id}>
                          {view === "grid" ? (
                            <DocumentCard
                              documentId={item.id}
                              revision={item.updated_at}
                              title={item.title}
                              date={
                                recent && item.last_opened_at
                                  ? item.last_opened_at
                                  : item.created_at
                              }
                              label={`View details for ${item.title}`}
                              className="library-material"
                              selected={selected?.id === item.id}
                              onClick={(event) => {
                                selectionOpener.current = event.currentTarget;
                                setSelected(item);
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="library-material"
                              aria-label={`View details for ${item.title}`}
                              aria-pressed={selected?.id === item.id}
                              onClick={(event) => {
                                selectionOpener.current = event.currentTarget;
                                setSelected(item);
                              }}
                            >
                              <span className="dashboard-recent-cover library-material-preview">
                                <DocumentThumbnail
                                  documentId={item.id}
                                  revision={item.updated_at}
                                />
                              </span>
                              <span className="dashboard-recent-body library-material-body">
                                <FileText
                                  size={17}
                                  className="library-material-file-icon"
                                  aria-hidden="true"
                                />
                                <span className="library-material-copy">
                                  <strong>{item.title}</strong>
                                  <span className="library-course-label">{item.course_code}</span>
                                  <span className="library-material-meta">
                                    {item.page_count > 0 ? `${item.page_count} pages · ` : ""}
                                    {fileSize(item.file_size_bytes)}
                                  </span>
                                  {item.status !== "active" && (
                                    <span className="library-status">
                                      {item.status.replaceAll("_", " ")}
                                    </span>
                                  )}
                                </span>
                              </span>
                              <span className="library-material-lecturer">
                                {item.lecturer_name || "—"}
                              </span>
                              <span className="library-material-date">
                                {materialDate(
                                  recent && item.last_opened_at
                                    ? item.last_opened_at
                                    : item.created_at
                                )}
                              </span>
                              <span className="library-material-size">
                                {fileSize(item.file_size_bytes)}
                              </span>
                            </button>
                          )}
                        </li>
                      </Fragment>
                    ))}
                  </ul>
                  {data.total > data.limit && (
                    <nav className="library-pagination" aria-label="Document pages">
                      <button
                        type="button"
                        className="library-icon-button"
                        aria-label="Previous page"
                        disabled={!offset}
                        onClick={() => {
                          setOffset(Math.max(0, offset - data.limit));
                          scroller.current?.scrollTo({ top: 0 });
                        }}
                      >
                        <ArrowLeft size={16} />
                      </button>
                      <span>
                        {offset + 1}–{Math.min(offset + data.limit, data.total)} of {data.total}
                      </span>
                      <button
                        type="button"
                        className="library-icon-button"
                        aria-label="Next page"
                        disabled={offset + data.limit >= data.total}
                        onClick={() => {
                          setOffset(offset + data.limit);
                          scroller.current?.scrollTo({ top: 0 });
                        }}
                      >
                        <ArrowRight size={16} />
                      </button>
                    </nav>
                  )}
                </>
              ) : (
                <div className="library-empty">
                  <BookOpen size={30} />
                  <h2>
                    {search || academicSession || semester
                      ? "No matching materials"
                      : recent
                        ? "Your next chapter starts here"
                        : "Your library has room to grow"}
                  </h2>
                  <p>
                    {search || academicSession || semester
                      ? "Try another search or clear your academic filters."
                      : recent
                        ? "Documents you’ve studied will appear here. Explore your courses to find something to read."
                        : "Course materials will appear here when your university shares them."}
                  </p>
                  {search || academicSession || semester ? (
                    <Button
                      variant="secondary"
                      leadingIcon={null}
                      trailingIcon={null}
                      onClick={resetFilters}
                    >
                      Clear filters
                    </Button>
                  ) : recent ? (
                    <Button
                      variant="secondary"
                      leadingIcon={<FolderClosed size={15} />}
                      trailingIcon={null}
                      onClick={() => navigate({ kind: "courses" })}
                    >
                      Explore courses
                    </Button>
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <DocumentDetails
        document={selected}
        onClose={() => setSelected(null)}
        returnFocus={() => selectionOpener.current?.focus({ preventScroll: true })}
        onOpened={() => {
          setRevision((value) => value + 1);
          dashboard.reload();
        }}
      />
      {canUpload && uploadOpen && (
        <DocumentUploadModal
          isOpen
          onClose={() => setUploadOpen(false)}
          onUploadSuccess={reload}
          userRole={profile.role}
          token={session?.access_token}
        />
      )}
    </section>
  );
}
