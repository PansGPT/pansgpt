"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Search,
  X,
  Briefcase,
  GraduationCap,
  Target,
  TrendingUp,
  Bookmark,
  Star,
  ArrowUpDown,
  LayoutGrid,
  List,
  ArrowRight,
  PlayCircle,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MobileProfileButton } from "@/components/shell/mobile-profile-button";
import { StudyArt } from "@/components/shell/study-art";
import { learnArticles, type LearnArticle } from "@/components/learn/learn-content";
import { LearnCard } from "@/components/learn/learn-card";
import "@/components/learn/learn.css";

type FilterTab = "all" | "academics" | "clinical" | "career" | "saved" | "featured";

export default function LearnPage(): React.ReactElement {
  const router = useRouter();
  const { profile } = useAuth();
  const userInitial =
    Array.from(profile?.first_name || profile?.email || "P")[0]?.toUpperCase() || "P";
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<"recent" | "duration">("recent");
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(
    new Set(["clinical-case", "pharmacy-beyond-counter"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showRecentDock, setShowRecentDock] = useState(true);

  const toggleBookmark = (slug: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarkedSlugs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const toggleSort = () => {
    setSortMode((prev) => (prev === "recent" ? "duration" : "recent"));
  };

  const filteredArticles = useMemo(() => {
    let list = [...learnArticles];

    // Filter by tab
    if (activeTab === "clinical") {
      list = list.filter((a) => a.category === "Clinical Skills");
    } else if (activeTab === "academics") {
      list = list.filter((a) => a.category === "Study Techniques");
    } else if (activeTab === "career") {
      list = list.filter(
        (a) =>
          a.category === "Career Insight" ||
          a.category === "Career Mindset" ||
          a.category === "Job Search"
      );
    } else if (activeTab === "saved") {
      list = list.filter((a) => bookmarkedSlugs.has(a.slug));
    } else if (activeTab === "featured") {
      list = list.filter((a) => a.slug === "clinical-case" || a.slug === "active-recall");
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortMode === "duration") {
      list.sort((a, b) => a.minutes - b.minutes);
    }

    return list;
  }, [activeTab, searchQuery, sortMode, bookmarkedSlugs]);

  const recentArticle = learnArticles[0]; // "How to approach a clinical case"

  return (
    <div className="learn-mobile-view">
      {/* ─── Top Header (Library Mobile Style) ─── */}
      <header className="learn-mobile-topbar">
        <Link
          href="/app"
          className="learn-mobile-home-button shell-touch-feedback"
          aria-label="Back to Home"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </Link>

        <strong className="learn-mobile-topbar-title">Learn</strong>

        <div className="learn-mobile-top-actions">
          <button
            type="button"
            className="learn-icon-button"
            onClick={() => setShowSearch((prev) => !prev)}
            aria-label="Toggle search"
            aria-expanded={showSearch}
          >
            <Search size={18} aria-hidden="true" />
          </button>
          <div className="shell-home-account learn-profile-wrap">
            {profile ? (
              <MobileProfileButton
                profile={profile}
                credits={null}
                creditsTotal={null}
                onOpen={() => {
                  window.dispatchEvent(
                    new CustomEvent("pansgpt:open-settings", { detail: { section: "account" } })
                  );
                }}
              />
            ) : (
              <button
                type="button"
                className="shell-account shell-account-menu shell-account-compact shell-credit-profile"
                aria-label="Account profile"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("pansgpt:open-settings", { detail: { section: "account" } })
                  );
                }}
              >
                <svg viewBox="0 0 36 36" className="shell-credit-ring" aria-hidden="true">
                  <circle className="shell-credit-profile-track" cx="18" cy="18" r="16" />
                </svg>
                <span className="shell-account-initial" aria-hidden="true">
                  {userInitial}
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="learn-body-content">
        {/* ─── Search input (expandable) ─── */}
        {showSearch && (
          <div className="learn-mobile-search-bar">
            <Search size={16} className="learn-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clinical guides, techniques, career..."
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="learn-search-clear"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        {/* ─── Horizontal Filter Carousel ─── */}
        <nav className="learn-filter-carousel" aria-label="Categories">
          {/* All Tab */}
          <button
            type="button"
            className="learn-filter-pill-btn"
            data-active={activeTab === "all" ? "true" : "false"}
            onClick={() => setActiveTab("all")}
            aria-pressed={activeTab === "all"}
          >
            <Briefcase size={13} aria-hidden="true" />
            <span>All</span>
          </button>

          {/* Academics / Study Techniques */}
          <button
            type="button"
            className="learn-filter-icon-btn"
            data-active={activeTab === "academics" ? "true" : "false"}
            onClick={() => setActiveTab("academics")}
            aria-label="Study Techniques"
            aria-pressed={activeTab === "academics"}
          >
            <GraduationCap size={14} aria-hidden="true" />
          </button>

          {/* Clinical Skills */}
          <button
            type="button"
            className="learn-filter-icon-btn"
            data-active={activeTab === "clinical" ? "true" : "false"}
            onClick={() => setActiveTab("clinical")}
            aria-label="Clinical Skills"
            aria-pressed={activeTab === "clinical"}
          >
            <Target size={14} aria-hidden="true" />
          </button>

          {/* Career & Mindset */}
          <button
            type="button"
            className="learn-filter-icon-btn"
            data-active={activeTab === "career" ? "true" : "false"}
            onClick={() => setActiveTab("career")}
            aria-label="Career & Mindset"
            aria-pressed={activeTab === "career"}
          >
            <TrendingUp size={14} aria-hidden="true" />
          </button>

          {/* Saved / Bookmarks */}
          <button
            type="button"
            className="learn-filter-icon-btn"
            data-active={activeTab === "saved" ? "true" : "false"}
            onClick={() => setActiveTab("saved")}
            aria-label="Saved articles"
            aria-pressed={activeTab === "saved"}
          >
            <Bookmark size={13} aria-hidden="true" />
          </button>

          {/* Starred / Featured */}
          <button
            type="button"
            className="learn-filter-icon-btn"
            data-active={activeTab === "featured" ? "true" : "false"}
            onClick={() => setActiveTab("featured")}
            aria-label="Featured guides"
            aria-pressed={activeTab === "featured"}
          >
            <Star size={13} aria-hidden="true" />
          </button>
        </nav>

        {/* ─── Subheader / Controls Row ─── */}
        <div className="learn-controls-row">
          <button
            type="button"
            className="learn-sort-btn"
            onClick={toggleSort}
            aria-label={`Sorted by ${sortMode === "recent" ? "Recent" : "Duration"}`}
          >
            <ArrowUpDown size={11} aria-hidden="true" />
            <span>{sortMode === "recent" ? "RECENT" : "DURATION"}</span>
          </button>

          <button
            type="button"
            className="learn-view-toggle-btn"
            onClick={() => setViewMode((prev) => (prev === "grid" ? "list" : "grid"))}
            aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
          >
            {viewMode === "grid" ? (
              <LayoutGrid size={15} aria-hidden="true" />
            ) : (
              <List size={15} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* ─── Main Content Grid / List ─── */}
        {filteredArticles.length === 0 ? (
          <div className="learn-empty-state">
            <BookOpen size={36} aria-hidden="true" />
            <p>No guides found in this category.</p>
            <button type="button" onClick={() => setActiveTab("all")}>
              View all guides
            </button>
          </div>
        ) : (
          <div
            className={`learn-cards-container ${viewMode === "list" ? "is-list-view" : "is-grid-view"}`}
          >
            {filteredArticles.map((article) => (
              <LearnCard
                key={article.slug}
                article={article}
                isBookmarked={bookmarkedSlugs.has(article.slug)}
                onBookmarkToggle={toggleBookmark}
              />
            ))}
          </div>
        )}

        {/* ─── Floating Bottom Dock: "Recently Read" ─── */}
        {showRecentDock && recentArticle && (
          <aside className="learn-bottom-dock" aria-label="Recently read guide">
            <Link href={`/app/learn/${recentArticle.slug}`} className="learn-dock-content">
              {/* Mini Book Cover Thumbnail */}
              <div className="learn-dock-thumb">
                <span className="learn-dock-thumb-spine" />
                <span className="learn-dock-thumb-title">PansGPT</span>
              </div>

              {/* Title & Progress */}
              <div className="learn-dock-info">
                <span className="learn-dock-eyebrow">Recently read</span>
                <span className="learn-dock-title">{recentArticle.title}</span>
                <div
                  className="learn-dock-progress-bar"
                  role="progressbar"
                  aria-valuenow={45}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Reading progress"
                >
                  <div className="learn-dock-progress-fill" style={{ width: "45%" }} />
                </div>
              </div>

              {/* Right Chevron */}
              <div className="learn-dock-action">
                <ChevronRight size={18} aria-hidden="true" />
              </div>
            </Link>
          </aside>
        )}
      </div>
    </div>
  );
}
