"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { profileFailureMessage, type ProfileFailure } from "@/lib/profile-verification";

export function ProfileError({
  error,
  onRetry,
  onSignOut,
}: {
  error: ProfileFailure;
  onRetry: () => Promise<unknown>;
  onSignOut: () => Promise<void>;
}): React.ReactElement {
  const [retrying, setRetrying] = useState(false);
  const failure = profileFailureMessage(error);
  return (
    <div className="shell-verification" role="alert">
      <h1>{failure.title}</h1>
      {failure.description && <p>{failure.description}</p>}
      {error.retryable && (
        <button
          type="button"
          className="shell-verification-retry"
          aria-label="Retry"
          title="Retry"
          disabled={retrying}
          aria-busy={retrying}
          onClick={() => {
            if (retrying) return;
            setRetrying(true);
            void onRetry()
              .catch(() => undefined)
              .finally(() => setRetrying(false));
          }}
        >
          <RotateCcw size={20} aria-hidden="true" />
        </button>
      )}
      {!error.retryable && (
        <button
          type="button"
          className="shell-verification-sign-in"
          onClick={() => void onSignOut()}
        >
          {error.code === "session_expired" ? "Sign in again" : "Sign out"}
        </button>
      )}
    </div>
  );
}
