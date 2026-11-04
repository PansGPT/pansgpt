"use client";

import Link from "next/link";
import { Bookmark, ArrowRight } from "lucide-react";
import { StudyArt } from "@/components/shell/study-art";
import type { LearnArticle } from "./learn-content";

export function LearnCard({
  article,
  isBookmarked = false,
  onBookmarkToggle,
  className = "",
}: {
  article: LearnArticle;
  isBookmarked?: boolean;
  onBookmarkToggle?: (slug: string, e: React.MouseEvent) => void;
  className?: string;
}): React.ReactElement {
  return (
    <Link
      href={`/app/learn/${article.slug}`}
      className={`learn-pastel-card ${className}`.trim()}
      data-theme={article.theme}
    >
      {/* Eyebrow */}
      <div className="learn-card-eyebrow">
        <span>{article.shortTag}</span>
      </div>

      {/* Split Row: Headline & Summary on Left, Thematic Art on Right */}
      <div className="learn-card-body-row">
        <div className="learn-card-copy">
          <h2 className="learn-card-headline">{article.title}</h2>
          <p className="learn-card-summary">{article.description}</p>
        </div>

        <div className="learn-card-art-col" data-art={article.artKind}>
          <StudyArt kind={article.artKind} variant="square" />
        </div>
      </div>

      {/* Card Footer */}
      <div className="learn-card-footer">
        <div className="learn-card-footer-left">
          {onBookmarkToggle ? (
            <button
              type="button"
              className="learn-card-bookmark-btn"
              data-bookmarked={isBookmarked ? "true" : "false"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onBookmarkToggle(article.slug, e);
              }}
              aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this guide"}
            >
              <Bookmark
                size={13}
                fill={isBookmarked ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </button>
          ) : (
            <span
              className="learn-card-bookmark-btn"
              data-bookmarked={isBookmarked ? "true" : "false"}
              aria-hidden="true"
            >
              <Bookmark
                size={13}
                fill={isBookmarked ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </span>
          )}
          <span className="learn-card-duration-text">{article.duration}</span>
        </div>

        <span className="learn-card-arrow-circle" aria-hidden="true">
          <ArrowRight size={11} />
        </span>
      </div>
    </Link>
  );
}
