"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
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
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MobileProfileButton } from "@/components/shell/mobile-profile-button";
import { getArticleBySlug, learnArticles } from "@/components/learn/learn-content";
import { getLearnDemoActivity } from "@/components/learn/learn-demo";
import { usePreferences } from "@/components/shell/use-preferences";
import { StudyArt } from "@/components/shell/study-art";
import { LearnCard } from "@/components/learn/learn-card";
import "@/components/learn/learn.css";

type FilterTab = "all" | "academics" | "clinical" | "career" | "saved" | "featured";

const demoActivity = getLearnDemoActivity();

const filterTabs: Array<{
  id: FilterTab;
  label: string;
  icon: typeof Briefcase;
  iconSize: number;
}> = [
  { id: "all", label: "All", icon: Briefcase, iconSize: 13 },
  { id: "academics", label: "Academics", icon: GraduationCap, iconSize: 14 },
  { id: "clinical", label: "Clinical", icon: Target, iconSize: 14 },
  { id: "career", label: "Career", icon: TrendingUp, iconSize: 14 },
  { id: "saved", label: "Saved", icon: Bookmark, iconSize: 13 },
  { id: "featured", label: "Featured", icon: Star, iconSize: 13 },
];

export default function LearnPage(): React.ReactElement {
  const { profile } = useAuth();
  const preferences = usePreferences(profile?.id ?? "", profile?.university_id ?? null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortMode, setSortMode] = useState<"recent" | "duration">("recent");
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<Set<string>>(
    new Set(demoActivity.bookmarkedSlugs)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

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

  const recentArticle = getArticleBySlug(demoActivity.recentArticleSlug);

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

        <h1 className="learn-mobile-topbar-title">Learn</h1>

        <div className="learn-desktop-search">
          <Search size={15} className="learn-search-icon" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clinical guides, techniques, career..."
            aria-label="Search guides"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="learn-desktop-search-clear"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

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

      <div className="learn-body-content">
        <p className="learn-preview-notice">Sample bookmarks and reading progress</p>
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
          {filterTabs.map(({ id, label, icon: Icon, iconSize }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                className={isActive ? "learn-filter-pill-btn" : "learn-filter-icon-btn"}
                data-active={isActive ? "true" : "false"}
                onClick={() => setActiveTab(id)}
                aria-label={label}
                aria-pressed={isActive}
              >
                <Icon size={iconSize} aria-hidden="true" />
                {isActive && <span>{label}</span>}
              </button>
            );
          })}
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
                variant={viewMode}
                isBookmarked={bookmarkedSlugs.has(article.slug)}
                onBookmarkToggle={toggleBookmark}
              />
            ))}
          </div>
        )}

        {/* ─── Floating Bottom Dock: "Recently Read" ─── */}
        {recentArticle && (
          <aside className="learn-bottom-dock" aria-label="Sample recently read guide">
            <Link href={`/app/learn/${recentArticle.slug}`} className="learn-dock-content">
              {/* Mini Card Thumbnail */}
              <div
                className="learn-dock-thumb"
                data-theme={recentArticle.theme}
                data-art={recentArticle.artKind}
              >
                <StudyArt kind={recentArticle.artKind} variant="square" />
              </div>

              {/* Title & Progress */}
              <div className="learn-dock-info">
                <span className="learn-dock-eyebrow">Sample reading activity</span>
                <span className="learn-dock-title">{recentArticle.title}</span>
                <div
                  className="learn-dock-progress-bar"
                  role="progressbar"
                  aria-valuenow={demoActivity.readingProgressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Sample reading progress"
                >
                  <div
                    className="learn-dock-progress-fill"
                    style={{ width: `${demoActivity.readingProgressPercent}%` }}
                  />
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
