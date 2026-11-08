"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { Button, UserInitialsAvatar } from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";
import type { DraftSectionProps } from "../settings-types";
import { SettingsRow } from "../settings-row";
import { SettingsSelect } from "../settings-select";
import { SettingsSection } from "../settings-section";

const LEVEL_OPTIONS = [
  { value: "100", label: "100 Level" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level" },
  { value: "600", label: "600 Level" },
];

export function ProfileSection({
  profile,
  preferences,
  draft,
  onDraftChange,
}: DraftSectionProps & {
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
}): React.ReactElement {
  const { updateProfile } = useAuth();
  const [subpage, setSubpage] = useState<"none" | "edit-name" | "edit-level">("none");
  const [subpageFirst, setSubpageFirst] = useState(draft.firstName);
  const [subpageLast, setSubpageLast] = useState(draft.lastName);
  const [subpageLevel, setSubpageLevel] = useState(draft.academicLevel);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const currentDisplayName =
    [draft.firstName, draft.lastName].filter(Boolean).join(" ") ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Your account";

  const currentLevelLabel =
    LEVEL_OPTIONS.find((item) => item.value === (draft.academicLevel || profile.current_level))
      ?.label ?? (draft.academicLevel ? `${draft.academicLevel} Level` : "Not set");

  const isDesktopDirty =
    draft.firstName !== (profile.first_name ?? "") ||
    draft.lastName !== (profile.last_name ?? "") ||
    draft.academicLevel !== (profile.current_level ?? "");

  const isNameDirty =
    subpageFirst.trim() !== (profile.first_name ?? "") ||
    subpageLast.trim() !== (profile.last_name ?? "");

  const isLevelDirty = subpageLevel !== (profile.current_level ?? "");

  const handleDesktopSave = async (): Promise<void> => {
    if (!isDesktopDirty || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        first_name: draft.firstName.trim() || undefined,
        last_name: draft.lastName.trim() || null,
        current_level: draft.academicLevel || undefined,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async (): Promise<void> => {
    if (!isNameDirty || !subpageFirst.trim() || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        first_name: subpageFirst.trim(),
        last_name: subpageLast.trim() || null,
      });
      onDraftChange({
        firstName: subpageFirst.trim(),
        lastName: subpageLast.trim(),
        fullName: [subpageFirst.trim(), subpageLast.trim()].filter(Boolean).join(" "),
      });
      setSubpage("none");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save name.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLevel = async (): Promise<void> => {
    if (!isLevelDirty || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await updateProfile({
        current_level: subpageLevel,
      });
      onDraftChange({ academicLevel: subpageLevel });
      setSubpage("none");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to update academic level.");
    } finally {
      setSaving(false);
    }
  };

  if (subpage === "edit-name") {
    return (
      <div className="settings-mobile-subpage">
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            onClick={() => {
              setSaveError(null);
              setSubpage("none");
            }}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="settings-subpage-title">Edit name</h2>
          <button
            type="button"
            className="settings-subpage-save-btn"
            disabled={!isNameDirty || !subpageFirst.trim() || saving}
            onClick={handleSaveName}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="settings-subpage-body">
          {saveError && <p className="settings-subpage-error">{saveError}</p>}
          <div className="settings-subpage-input-card">
            <label className="settings-subpage-input-label" htmlFor="edit-first-name">
              First name
            </label>
            <input
              id="edit-first-name"
              className="settings-subpage-input"
              value={subpageFirst}
              onChange={(e) => setSubpageFirst(e.target.value)}
              autoFocus
              maxLength={100}
              placeholder="First name"
            />
          </div>
          <div className="settings-subpage-input-card">
            <label className="settings-subpage-input-label" htmlFor="edit-last-name">
              Surname
            </label>
            <input
              id="edit-last-name"
              className="settings-subpage-input"
              value={subpageLast}
              onChange={(e) => setSubpageLast(e.target.value)}
              maxLength={100}
              placeholder="Surname"
            />
          </div>
        </div>
      </div>
    );
  }

  if (subpage === "edit-level") {
    return (
      <div className="settings-mobile-subpage">
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            onClick={() => {
              setSaveError(null);
              setSubpage("none");
            }}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="settings-subpage-title">Academic level</h2>
          <button
            type="button"
            className="settings-subpage-save-btn"
            disabled={!isLevelDirty || saving}
            onClick={handleSaveLevel}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
        <div className="settings-subpage-body">
          {saveError && <p className="settings-subpage-error">{saveError}</p>}
          <div className="settings-subpage-info-card">
            <Info size={16} className="settings-subpage-info-icon" aria-hidden="true" />
            <p className="settings-subpage-info-text">
              Changing your academic level will adjust the documents you have access to for your
              year.
            </p>
          </div>
          <div className="settings-subpage-card">
            {LEVEL_OPTIONS.map((opt) => {
              const isSelected = subpageLevel === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`settings-subpage-option ${isSelected ? "is-selected" : ""}`}
                  onClick={() => setSubpageLevel(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={18} className="settings-subpage-check" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-account-page">
      <div className="settings-account-avatar">
        <UserInitialsAvatar name={currentDisplayName} email={profile.email} size="lg" />
        <div className="settings-account-heading-copy">
          <h3>{currentDisplayName}</h3>
          <p>{profile.email}</p>
        </div>
      </div>
      <SettingsSection title="Your profile" hideTitleOnMobile className="settings-account-section">
        <div className="settings-account-card">
          {/* Row 1: Name */}
          <div
            className="settings-row settings-account-edit-row settings-copy-desktop"
            data-settings-label="Name"
          >
            <span className="settings-row-title">Name</span>
            <span className="settings-row-right settings-name-inputs-desktop">
              <input
                className="settings-account-value-input"
                aria-label="First name"
                placeholder="First name"
                value={draft.firstName}
                onChange={(event) => {
                  const firstName = event.target.value;
                  onDraftChange({
                    firstName,
                    fullName: [firstName, draft.lastName].filter(Boolean).join(" "),
                  });
                }}
                autoComplete="given-name"
                maxLength={100}
              />
              <input
                className="settings-account-value-input"
                aria-label="Last name"
                placeholder="Surname"
                value={draft.lastName}
                onChange={(event) => {
                  const lastName = event.target.value;
                  onDraftChange({
                    lastName,
                    fullName: [draft.firstName, lastName].filter(Boolean).join(" "),
                  });
                }}
                autoComplete="family-name"
                maxLength={100}
              />
            </span>
          </div>
          <button
            type="button"
            className="settings-row settings-account-row-btn settings-copy-mobile"
            onClick={() => {
              setSubpageFirst(draft.firstName);
              setSubpageLast(draft.lastName);
              setSubpage("edit-name");
            }}
            data-settings-label="Name"
          >
            <span className="settings-row-title">Name</span>
            <span className="settings-account-value-with-chevron">
              <span>{currentDisplayName}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>

          {/* Row 2: Email */}
          <SettingsRow title="Email">
            <span className="settings-account-value">{profile.email}</span>
          </SettingsRow>

          {/* Row 3: University */}
          <SettingsRow title="University">
            <span className="settings-account-value">{preferences.university ?? "Not set"}</span>
          </SettingsRow>

          {/* Row 4: Academic level */}
          <div
            className="settings-row settings-account-edit-row settings-copy-desktop"
            data-settings-label="Academic level"
          >
            <span className="settings-row-title">Academic level</span>
            <span className="settings-row-right">
              <SettingsSelect
                label="Academic level"
                value={draft.academicLevel}
                onValueChange={(academicLevel) => onDraftChange({ academicLevel })}
                options={[{ value: "", label: "Not set" }, ...LEVEL_OPTIONS]}
              />
            </span>
          </div>
          <button
            type="button"
            className="settings-row settings-account-row-btn settings-copy-mobile"
            onClick={() => {
              setSubpageLevel(draft.academicLevel || profile.current_level || "100");
              setSubpage("edit-level");
            }}
            data-settings-label="Academic level"
          >
            <span className="settings-row-title">Academic level</span>
            <span className="settings-account-value-with-chevron">
              <span>{currentLevelLabel}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </span>
          </button>
        </div>

        {saveError && <p className="settings-save-error settings-copy-desktop">{saveError}</p>}

        <div className="settings-section-action-row settings-copy-desktop">
          <Button
            leadingIcon={null}
            trailingIcon={null}
            disabled={!isDesktopDirty || saving}
            onClick={handleDesktopSave}
          >
            {saving ? "Saving..." : "Save changes"}
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
