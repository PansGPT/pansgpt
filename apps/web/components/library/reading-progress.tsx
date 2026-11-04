import { BookOpen } from "lucide-react";

export function ReadingProgress({
  lastPage,
  totalPages,
  compact = false,
}: {
  lastPage: number | null;
  totalPages: number;
  compact?: boolean;
}): React.ReactElement | null {
  if (lastPage === null) return null;
  if (totalPages <= 0)
    return compact ? null : (
      <p className="library-reading-state">
        <BookOpen size={15} /> Saved position: page {lastPage}
      </p>
    );
  const page = Math.min(lastPage, totalPages);
  const percent = Math.round((page / totalPages) * 100);
  if (compact)
    return (
      <span
        className="library-reading-ring"
        role="img"
        aria-label={`Saved position: page ${page} of ${totalPages}`}
      >
        <svg viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r="15" />
          <circle cx="18" cy="18" r="15" pathLength="100" strokeDasharray={`${percent} 100`} />
        </svg>
        <span aria-hidden="true">{percent}</span>
      </span>
    );
  return (
    <section className="library-reading-progress" aria-label="Reading progress">
      <h4>Reading progress</h4>
      <div>
        <span>{percent}% through</span>
        <span>
          {page} / {totalPages} pages
        </span>
      </div>
      <progress
        max={totalPages}
        value={page}
        aria-label={`Saved position: page ${page} of ${totalPages}`}
      />
    </section>
  );
}
