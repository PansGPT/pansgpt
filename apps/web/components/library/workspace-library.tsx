"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Clock3,
  FolderClosed,
  FileText,
  LayoutGrid,
  Library,
  List,
  RefreshCw,
  Search,
  Filter,
  Upload,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Skeleton } from "@pansgpt/ui/shell";
import type { LibraryDocument, LibraryCourse } from "@pansgpt/types";
import { useAuth } from "@/lib/auth-context";
import { MobileProfileButton } from "@/components/shell/mobile-profile-button";
import { usePreferences } from "@/components/shell/use-preferences";
import { fileSize, materialDate, readingDateGroup } from "@/lib/library-catalog";
import { DocumentUploadModal } from "@/components/DocumentUploadModal";
import { DocumentDetails } from "./document-details";
import { useCatalog } from "./use-catalog";
import { DocumentCard } from "@/components/shell/document-card";
import { DocumentThumbnail } from "@/components/shell/document-thumbnail";
import { useDashboard } from "@/components/shell/dashboard-data";
import {
  libraryLocationUrl,
  readLibraryLocation,
  type LibraryLocation,
} from "@/lib/library-location";
import { usePullRefresh, PULL_REFRESH_THRESHOLD } from "./use-pull-refresh";
import { ReadingProgress } from "./reading-progress";
import "./library.css";
import "./library-mobile.css";

function GreenPushpin({ className = "" }: { className?: string }): React.ReactElement {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 800 800"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ color: "#22c55e" }}
    >
      <path d="M 622 0 L 643 2 L 660 8 L 681 19 L 718 46 L 745 72 L 770 103 L 786 129 L 797 156 L 799 178 L 794 190 L 538 474 L 550 491 L 560 510 L 566 527 L 570 547 L 570 580 L 566 599 L 554 628 L 541 647 L 527 661 L 509 669 L 492 669 L 479 664 L 472 659 L 340 527 L 40 794 L 29 799 L 17 798 L 11 795 L 4 788 L 1 782 L 0 770 L 8 755 L 271 459 L 138 325 L 132 314 L 129 302 L 132 281 L 138 271 L 152 257 L 168 246 L 201 232 L 223 228 L 248 228 L 270 232 L 296 242 L 313 252 L 324 261 L 607 6 L 617 1 L 621 1 Z" />
    </svg>
  );
}

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
  const preferences = usePreferences(profile?.id ?? "", profile?.university_id ?? null);
  const dashboard = useDashboard();
  const router = useRouter();
  const [today] = useState(() => new Date());
  const searchParams = useSearchParams();
  const location = readLibraryLocation(searchParams);
  const locationKey = location.kind === "course" ? location.code : location.kind;
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery.trim());
  const [academicSession, setAcademicSession] = useState("");
  const [semester, setSemester] = useState("");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState<LibraryDocument | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const selectionOpener = useRef<HTMLButtonElement | null>(null);
  const scroller = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [locationKey, search, academicSession, semester, sort, offset]);
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
  const { data, loading, refreshing, error } = useCatalog(params, revision);
  const reload = useCallback(() => {
    if (!loading && !refreshing) setRevision((value) => value + 1);
  }, [loading, refreshing, setRevision]);
  const pullDistance = usePullRefresh(scroller, !loading && !refreshing, reload);
  const courses = data?.courses ?? [];
  const course =
    location.kind === "course" ? courses.find((item) => item.code === location.code) : undefined;
  const folders = location.kind === "courses" && !search;
  const matchingCourses = courses.filter((item) =>
    `${item.code} ${item.title}`.toLowerCase().includes(search.toLowerCase())
  );
  const canUpload =
    profile && ["lecturer", "university_admin", "super_admin"].includes(profile.role);
  const activeReading =
    data?.items.find((item) => item.last_page_read !== null && item.last_page_read > 0) ??
    (dashboard.recent[0]
      ? {
          id: dashboard.recent[0].documents.id,
          title: dashboard.recent[0].documents.title,
          course_code: dashboard.recent[0].documents.course_code,
          updated_at: dashboard.recent[0].documents.updated_at,
          last_page_read: 24,
          page_count: 412,
        }
      : data?.items[0]
        ? {
            id: data.items[0].id,
            title: data.items[0].title,
            course_code: data.items[0].course_code,
            updated_at: data.items[0].updated_at,
            last_page_read: data.items[0].last_page_read ?? 24,
            page_count: data.items[0].page_count ?? 412,
          }
        : null);
  const title = search
    ? "Search results"
    : location.kind === "recent"
      ? "Recent Documents"
      : folders
        ? "Courses"
        : location.kind === "course"
          ? location.code
          : "Courses";
  function navigate(next: LibraryLocation): void {
    router.push(libraryLocationUrl(new URLSearchParams(searchParams.toString()), next), {
      scroll: false,
    });
    setOffset(0);
    setSelected(null);
    setQuery("");
    setSearch("");
  }
  function resetFilters(): void {
    setQuery("");
    setSearch("");
    setAcademicSession("");
    setSemester("");
    setOffset(0);
    setFiltersOpen(false);
  }
  function browseControls(): React.ReactElement {
    return (
      <>
        <div
          className="library-view-switch"
          data-view={view}
          role="group"
          aria-label="Document layout"
        >
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
          <Filter size={18} />
          {(academicSession || semester) && <span className="library-filter-dot" />}
        </button>
      </>
    );
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
      data-search={Boolean(search)}
      data-search-open={searchOpen}
      data-filters-open={filtersOpen}
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
      </aside>
      <div className="library-main">
        <header className="library-mobile-topbar">
          <button
            type="button"
            className="library-mobile-home-button shell-touch-feedback"
            aria-label="Back to Home"
            onClick={() => router.push("/app")}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <strong className="library-mobile-topbar-title">Library</strong>
          <div className="library-mobile-top-actions">
            <button
              type="button"
              className="library-icon-button"
              aria-label="Search your library"
              aria-expanded={searchOpen}
              onClick={() => {
                setSearchOpen((v) => !v);
                setTimeout(() => {
                  const input = document.querySelector<HTMLInputElement>(".library-search input");
                  input?.focus();
                }, 50);
              }}
            >
              <Search size={20} />
            </button>
            {canUpload && (
              <button
                type="button"
                className="library-icon-button library-upload-mobile-btn"
                aria-label="Upload material"
                onClick={() => setUploadOpen(true)}
              >
                <Upload size={18} />
              </button>
            )}
            {profile && (
              <div className="shell-home-account">
                <MobileProfileButton
                  profile={profile}
                  credits={preferences.credits}
                  creditsTotal={preferences.creditsTotal}
                  onOpen={() => {
                    window.dispatchEvent(
                      new CustomEvent("pansgpt:open-settings", { detail: { section: "account" } })
                    );
                  }}
                />
              </div>
            )}
          </div>
        </header>
        <div className="library-course-pills-row" role="region" aria-label="Course filter">
          <nav aria-label="Library sections">
            <button
              type="button"
              className="library-course-pill"
              data-active={location.kind !== "course" && location.kind !== "courses"}
              onClick={() => navigate({ kind: "all" })}
            >
              All
            </button>
            <button
              type="button"
              className="library-course-pill"
              data-active={location.kind === "courses"}
              onClick={() => navigate({ kind: "courses" })}
            >
              Courses
            </button>
            {courses.map((item) => (
              <button
                type="button"
                key={item.code}
                className="library-course-pill"
                data-active={location.kind === "course" && location.code === item.code}
                onClick={() =>
                  navigate(
                    location.kind === "course" && location.code === item.code
                      ? { kind: "all" }
                      : { kind: "course", code: item.code }
                  )
                }
              >
                {item.code}
              </button>
            ))}
          </nav>
        </div>
        <div className="library-mobile-subbar" aria-label="Library controls">
          <div className="library-mobile-sort-label">
            <ArrowUpDown size={15} aria-hidden="true" />
            {location.kind === "course" ? (
              <>
                <span className="library-mobile-course-code">{location.code}</span>
                {course?.title && (
                  <span className="library-mobile-course-title">{course.title}</span>
                )}
              </>
            ) : (
              <span>{location.kind === "courses" ? "Courses" : "All"}</span>
            )}
          </div>
          <div className="library-mobile-browse-actions">{browseControls()}</div>
        </div>
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
        <div className="library-content-panel">
          <div className="library-section-bar">
            {location.kind === "course" && !search && (
              <div className="library-mobile-course-heading">
                <button
                  type="button"
                  aria-label="Back to courses"
                  className="shell-touch-feedback"
                  onClick={() => navigate({ kind: "courses" })}
                >
                  <ChevronLeft size={22} />
                </button>
                <h1 title={course?.title}>
                  <span className="library-mobile-course-code">{location.code}</span>
                  {course?.title && (
                    <>
                      <span className="library-course-heading-dot" aria-hidden="true">
                        &middot;
                      </span>
                      <span className="library-mobile-course-title">{course.title}</span>
                    </>
                  )}
                </h1>
              </div>
            )}

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
            {search && <span className="library-mobile-search-title">Search results</span>}
            <div className="library-mobile-browse-actions">{browseControls()}</div>
          </div>
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
                disabled={loading || refreshing}
                aria-busy={refreshing}
              >
                <RefreshCw size={17} className="library-refresh-icon" data-spinning={refreshing} />
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
              <div className="library-desktop-browse-actions">{browseControls()}</div>
            </div>
          </header>
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
          <div className="library-results" ref={scroller} aria-busy={loading || refreshing}>
            <div
              className="library-pull-refresh"
              data-active={pullDistance > 0 || refreshing}
              style={{ height: pullDistance || (refreshing ? 48 : 0) }}
            >
              <RefreshCw size={18} className="library-refresh-icon" data-spinning={refreshing} />
              <span role="status">
                {refreshing
                  ? "Refreshing library..."
                  : pullDistance >= PULL_REFRESH_THRESHOLD
                    ? "Release to refresh"
                    : pullDistance > 0
                      ? "Pull to refresh"
                      : ""}
              </span>
            </div>
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
                        <span>Name</span>
                        <span>Lecturer</span>
                        <span>Last opened</span>
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
                                detail={
                                  item.course_code ? (
                                    <span className="library-card-course-badge">
                                      {(index < 2 || item.last_opened_at !== null) && (
                                        <GreenPushpin className="library-card-pin" />
                                      )}
                                      <span>{item.course_code}</span>
                                    </span>
                                  ) : undefined
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
                                <span className="library-material-body">
                                  <span className="library-list-file-icon">
                                    <FileText size={20} aria-hidden="true" />
                                  </span>
                                  <span className="library-material-copy">
                                    <strong>{item.topic || item.title}</strong>
                                    <span className="library-list-subtitle">
                                      <span className="library-course-label">
                                        {item.course_code}
                                      </span>
                                      {item.last_page_read !== null && (
                                        <span className="library-list-position">
                                          Page {item.last_page_read}
                                          {item.page_count ? ` / ${item.page_count}` : ""}
                                        </span>
                                      )}
                                    </span>
                                    <span className="library-mobile-file-meta">
                                      <span>{materialDate(item.created_at)}</span>
                                      <span>{fileSize(item.file_size_bytes)}</span>
                                      {item.lecturer_name && <span>From {item.lecturer_name}</span>}
                                    </span>
                                    {item.status !== "active" && (
                                      <span className="library-status">
                                        {item.status.replaceAll("_", " ")}
                                      </span>
                                    )}
                                  </span>
                                </span>
                                <ReadingProgress
                                  compact
                                  lastPage={item.last_page_read}
                                  totalPages={item.page_count}
                                />
                                <span className="library-material-lecturer">
                                  {item.lecturer_name || "—"}
                                </span>
                                <span className="library-material-date">
                                  {item.last_opened_at
                                    ? materialDate(item.last_opened_at)
                                    : "Not opened"}
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
                  <div
                    className={`library-empty${recent && !academicSession && !semester ? " library-recent-empty" : ""}`}
                  >
                    {(!recent || academicSession || semester) && <BookOpen size={30} />}
                    <h2>
                      {search || academicSession || semester
                        ? "No matching materials"
                        : recent
                          ? "No recent documents"
                          : "Your library has room to grow"}
                    </h2>
                    <p>
                      {search || academicSession || semester
                        ? "Try another search or clear your academic filters."
                        : recent
                          ? "Documents you open will appear here."
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
                        leadingIcon={null}
                        trailingIcon={null}
                        onClick={() => navigate({ kind: "courses" })}
                      >
                        Browse courses
                      </Button>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        {activeReading && (
          <aside
            className="library-now-reading-dock"
            aria-label="Now reading"
            role="button"
            tabIndex={0}
            onClick={() => {
              const doc = data?.items.find((i) => i.id === activeReading.id);
              if (doc) setSelected(doc);
              else router.push(`/app/reader/${activeReading.id}`);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const doc = data?.items.find((i) => i.id === activeReading.id);
                if (doc) setSelected(doc);
                else router.push(`/app/reader/${activeReading.id}`);
              }
            }}
          >
            <div className="library-now-reading-cover">
              <DocumentThumbnail
                documentId={activeReading.id}
                revision={activeReading.updated_at}
              />
            </div>
            <div className="library-now-reading-info">
              <strong className="library-now-reading-title">
                {activeReading.course_code ? `${activeReading.course_code} ` : ""}
                {activeReading.title}
              </strong>
              <span className="library-now-reading-progress">
                Page {activeReading.last_page_read || 1} of {activeReading.page_count || 100}
              </span>
            </div>
          </aside>
        )}
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
