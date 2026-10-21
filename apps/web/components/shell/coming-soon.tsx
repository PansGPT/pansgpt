import Link from "next/link";
import type { LucideIcon } from "lucide-react";
export function ComingSoon({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
}): React.ReactElement {
  return (
    <section className="shell-empty">
      <span className="shell-empty-icon">
        <Icon size={30} aria-hidden="true" />
      </span>
      <span className="shell-eyebrow">Coming soon</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="shell-primary-link" href="/app/library">
        Explore your library
      </Link>
    </section>
  );
}
