"use client";

import { ChevronRight } from "lucide-react";
import { Button, UserInitialsAvatar } from "@pansgpt/ui/shell";
import type { UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";
import type { DraftSectionProps } from "../settings-types";
import { SettingsRow } from "../settings-row";
import { SettingsSelect } from "../settings-select";
import { SettingsSection } from "../settings-section";

export function ProfileSection({
  profile,
  preferences,
  draft,
  onDraftChange,
}: DraftSectionProps & {
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
}): React.ReactElement {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your account";
  return (
    <div className="settings-account-page">
      <div className="settings-account-avatar">
        <UserInitialsAvatar name={name} email={profile.email} size="lg" />
        <div className="settings-account-heading-copy">
          <h3>{name}</h3>
          <p>{profile.email}</p>
        </div>
      </div>
      <SettingsSection title="Your profile" hideTitleOnMobile className="settings-account-section">
        <div className="settings-account-card">
          <label className="settings-row settings-account-edit-row" data-settings-label="Name">
            <span className="settings-row-title">Name</span>
            <span className="settings-row-right">
              <input
                className="settings-account-value-input"
                aria-label="Name"
                value={draft.fullName}
                onChange={(event) => onDraftChange({ fullName: event.target.value })}
                autoComplete="name"
                maxLength={200}
              />
              <ChevronRight
                size={16}
                className="settings-row-chevron settings-copy-mobile"
                aria-hidden="true"
              />
            </span>
          </label>
          <SettingsRow title="Email">
            <span className="settings-account-value">{profile.email}</span>
          </SettingsRow>
          <SettingsRow title="University">
            <span className="settings-account-value">{preferences.university ?? "Not set"}</span>
          </SettingsRow>
          <div
            className="settings-row settings-account-edit-row"
            data-settings-label="Academic level"
          >
            <span className="settings-row-title">Academic level</span>
            <span className="settings-row-right">
              <SettingsSelect
                label="Academic level"
                value={draft.academicLevel}
                onValueChange={(academicLevel) => onDraftChange({ academicLevel })}
                options={[
                  { value: "", label: "Not set" },
                  ...["100", "200", "300", "400", "500", "600"].map((level) => ({
                    value: level,
                    label: `${level} Level`,
                  })),
                ]}
              />
            </span>
          </div>
        </div>
        <div className="settings-section-action-row settings-copy-desktop">
          <Button leadingIcon={null} trailingIcon={null} disabled>
            Save changes
          </Button>
        </div>
      </SettingsSection>
      <div className="settings-copy-desktop">
        <SettingsSection title="Account deletion" className="settings-danger-section">
          <SettingsRow
            title="Delete account"
            description="Review account deletion and its 30-day recovery period."
            destructive
          >
            <Button variant="secondary" destructive leadingIcon={null} trailingIcon={null} disabled>
              Delete account
            </Button>
          </SettingsRow>
        </SettingsSection>
      </div>
      <button
        type="button"
        className="settings-account-delete settings-copy-mobile"
        data-settings-label="Delete account"
        disabled
      >
        Delete account
      </button>
    </div>
  );
}
