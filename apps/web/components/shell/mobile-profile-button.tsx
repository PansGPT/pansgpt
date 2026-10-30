"use client";

import { useId } from "react";
import type { UserProfile } from "@/lib/auth-context";

export function MobileProfileButton({
  profile,
  credits,
  creditsTotal,
  onOpen,
}: {
  profile: UserProfile;
  credits: number | null;
  creditsTotal: number | null;
  onOpen: (opener: HTMLButtonElement) => void;
}): React.ReactElement {
  const descriptionId = useId();
  const known = credits !== null && Number.isFinite(credits) && credits >= 0;
  const fraction =
    known && creditsTotal !== null && Number.isFinite(creditsTotal) && creditsTotal > 0
      ? Math.min(1, credits / creditsTotal)
      : null;
  const description = known
    ? `${credits.toLocaleString()} credits remaining`
    : "Credit balance unavailable";
  return (
    <button
      type="button"
      className="shell-account shell-account-menu shell-account-compact shell-credit-profile"
      aria-label="Open settings"
      aria-describedby={descriptionId}
      title={description}
      data-credit-state={known ? "ready" : "unavailable"}
      onClick={(event) => onOpen(event.currentTarget)}
    >
      <svg viewBox="0 0 36 36" className="shell-credit-ring" aria-hidden="true">
        <circle className="shell-credit-profile-track" cx="18" cy="18" r="16" />
        {fraction !== null && (
          <circle
            className="shell-credit-profile-progress"
            cx="18"
            cy="18"
            r="16"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - fraction * 100}
            transform="rotate(-90 18 18)"
          />
        )}
      </svg>
      <span className="shell-account-initial" aria-hidden="true">
        {Array.from(profile.first_name || profile.email || "PansGPT")[0]?.toUpperCase()}
      </span>
      <span id={descriptionId} className="p-sr-only">
        {description}
      </span>
    </button>
  );
}
