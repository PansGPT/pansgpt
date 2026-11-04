/** Explicit synthetic activity for the Learn UI preview; never persisted as user activity. */
export function getLearnDemoActivity(): {
  bookmarkedSlugs: readonly string[];
  recentArticleSlug: string;
  readingProgressPercent: number;
} {
  return {
    bookmarkedSlugs: ["clinical-case", "pharmacy-beyond-counter"],
    recentArticleSlug: "clinical-case",
    readingProgressPercent: 45,
  };
}
