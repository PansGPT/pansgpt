"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

const NIGERIAN_PHARMACY_UNIVERSITIES = [
  "University of Jos (UniJos)",
  "University of Lagos (UNILAG)",
  "Ahmadu Bello University (ABU)",
  "University of Ibadan (UI)",
  "University of Nigeria, Nsukka (UNN)",
  "Obafemi Awolowo University (OAU)",
  "University of Benin (UNIBEN)",
  "Olabisi Onabanjo University (OOU)",
  "Delta State University (DELSU)",
  "Nnamdi Azikiwe University (UNIZIK)",
  "Bayero University Kano (BUK)",
  "Usmanu Danfodiyo University (UDUS)",
  "University of Port Harcourt (UNIPORT)",
  "University of Maiduguri (UNIMAID)",
  "Other / Pilot Faculty",
];

function getSessionDevice(): string {
  if (typeof window === "undefined") return "Web Browser";
  const ua = window.navigator.userAgent;
  let browser = "Web Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/")) browser = "Safari";

  let os = "Desktop";
  if (ua.includes("Windows") || ua.includes("Win32") || ua.includes("Win64")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return `${browser} (${os})`;
}

export function ProfileSection({
  profile,
  preferences,
  onClose,
}: {
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
  onClose?: () => void;
}): React.ReactElement {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Elijah Sani";

  const [fullName, setFullName] = useState(name);
  const [university, setUniversity] = useState(
    preferences.university || "University of Jos (UniJos)"
  );
  const [deviceName] = useState(getSessionDevice);

  const initial = (fullName.trim()[0] || profile.email[0] || "E").toUpperCase();

  async function handleLogout(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      onClose?.();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="settings-section-container">
      {/* Large avatar circle matching Image 1 on mobile */}
      <div className="settings-account-avatar-header">
        <div className="settings-account-avatar-circle">{initial}</div>
      </div>

      {/* Account Info Inset Card (matching Image 1) */}
      <SettingsSection>
        <SettingsRow title="Name">
          <input
            type="text"
            className="settings-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            aria-label="Name"
          />
        </SettingsRow>

        <SettingsRow title="University">
          <select
            className="settings-select"
            value={university}
            onChange={(e) => setUniversity(e.target.value)}
            aria-label="University"
          >
            {NIGERIAN_PHARMACY_UNIVERSITIES.map((uni) => (
              <option key={uni} value={uni}>
                {uni}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow title="Email">
          <span className="settings-account-value">{profile.email}</span>
        </SettingsRow>

        <SettingsRow title="User ID">
          <span className="settings-account-value">
            {profile.id.replace(/-/g, "").slice(0, 18)}
          </span>
        </SettingsRow>
      </SettingsSection>

      {/* Where you're logged in */}
      <SettingsSection title="Where you're logged in">
        <div className="settings-devices-table" role="table" aria-label="Active sessions">
          <div className="settings-devices-row" role="row">
            <div role="cell" className="settings-device-name">
              {deviceName}
              <span className="settings-current-badge">Current</span>
            </div>
            <div role="cell" className="settings-device-cell">
              Local session · Active now
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Standalone Action Cards matching Image 1 */}
      <div className="settings-account-action-card">
        <button
          type="button"
          className="settings-account-action-btn"
          disabled={busy}
          onClick={() => void handleLogout()}
        >
          {busy ? "Signing out…" : "Log out"}
        </button>
      </div>

      <div className="settings-account-action-card">
        <button
          type="button"
          className="settings-account-action-btn is-destructive"
          onClick={() => {
            if (
              confirm(
                "Are you sure you want to delete your study account? All progress, flashcards, and notes will be permanently erased."
              )
            ) {
              void handleLogout();
            }
          }}
        >
          Delete Account
        </button>
      </div>

      {error && (
        <p className="settings-error-notice" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
