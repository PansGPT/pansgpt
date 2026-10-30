"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { UserInitialsAvatar } from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";
import { SETTINGS_GROUPS } from "./settings-nav";
import type { SettingsSectionId } from "./settings-types";

export function SettingsMenu({
  profile,
  preferences,
  onSelectSection,
  onClose,
}: {
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
  onSelectSection: (id: SettingsSectionId) => void;
  onClose: () => void;
}): React.ReactElement {
  const router = useRouter();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your Account";

  async function handleSignOut(): Promise<void> {
    setSigningOut(true);
    setError(null);
    try {
      await signOut();
      onClose();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Please try again.");
      setSigningOut(false);
    }
  }

  return (
    <div className="settings-menu">
      {/* Profile summary card */}
      <button
        type="button"
        aria-label="Edit profile"
        className="settings-menu-profile-card"
        onClick={() => onSelectSection("account")}
      >
        <UserInitialsAvatar name={name} email={profile.email} size="md" />
        <div className="settings-menu-profile-meta">
          <strong className="settings-menu-profile-name">{name}</strong>
          <span className="settings-menu-profile-email">{profile.email}</span>
        </div>
        <ChevronRight size={18} className="settings-menu-chevron" aria-hidden="true" />
      </button>

      {/* Grouped menu options */}
      <div className="settings-menu-groups">
        {SETTINGS_GROUPS.map((group, groupIndex) => (
          <div key={groupIndex} className="settings-menu-group">
            {group.label && <span className="settings-menu-group-title">{group.label}</span>}
            <div className="settings-menu-group-card">
              {group.items
                .filter((item) => item.id !== "account")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="settings-menu-row"
                    onClick={() => onSelectSection(item.id)}
                  >
                    <span className="settings-menu-row-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="settings-menu-row-label">{item.label}</span>
                    {item.id === "billing" && (
                      <span className="settings-menu-row-credits">
                        {preferences.credits === null
                          ? "Unavailable"
                          : `${preferences.credits.toLocaleString()} credits`}
                      </span>
                    )}
                    <ChevronRight size={16} className="settings-menu-chevron" aria-hidden="true" />
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger / Sign Out */}
      <div className="settings-menu-footer">
        {error && (
          <p className="settings-error-notice" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={signingOut}
          onClick={() => void handleSignOut()}
          className="settings-menu-signout"
        >
          <LogOut size={16} aria-hidden="true" />
          <span>{signingOut ? "Signing out…" : "Log Out"}</span>
        </button>
      </div>
    </div>
  );
}
