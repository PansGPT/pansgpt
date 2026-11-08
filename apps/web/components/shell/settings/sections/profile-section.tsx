"use client";

import { useState } from "react";
import { Check, ChevronLeft, ChevronRight, Info, Pencil, X } from "lucide-react";
import { Button, DialogPrimitive, UserInitialsAvatar } from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";
import type { DraftSectionProps } from "../settings-types";
import { SettingsRow } from "../settings-row";
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

  // Mobile dedicated subpage state
  const [subpage, setSubpage] = useState<"none" | "edit-name" | "edit-level">("none");
  const [subpageFirst, setSubpageFirst] = useState(draft.firstName);
  const [subpageLast, setSubpageLast] = useState(draft.lastName);
  const [subpageLevel, setSubpageLevel] = useState(draft.academicLevel);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Desktop edit modal dialog state
  const [desktopModal, setDesktopModal] = useState<"none" | "edit-name" | "edit-level">("none");
  const [desktopFirstName, setDesktopFirstName] = useState(draft.firstName);
  const [desktopLastName, setDesktopLastName] = useState(draft.lastName);
  const [desktopLevel, setDesktopLevel] = useState(draft.academicLevel);
  const [desktopSaving, setDesktopSaving] = useState(false);
  const [desktopError, setDesktopError] = useState<string | null>(null);

  const currentDisplayName =
    [draft.firstName, draft.lastName].filter(Boolean).join(" ") ||
    [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
    "Your account";

  const currentLevelLabel =
    LEVEL_OPTIONS.find((item) => item.value === (draft.academicLevel || profile.current_level))
      ?.label ?? (draft.academicLevel ? `${draft.academicLevel} Level` : "Not set");

  // Mobile save handlers
  const isNameDirty =
    subpageFirst.trim() !== (profile.first_name ?? "") ||
    subpageLast.trim() !== (profile.last_name ?? "");

  const isLevelDirty = subpageLevel !== (profile.current_level ?? "");

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

  // Desktop save handlers
  const isDesktopNameDirty =
    desktopFirstName.trim() !== (profile.first_name ?? "") ||
    desktopLastName.trim() !== (profile.last_name ?? "");

  const handleDesktopSaveName = async (): Promise<void> => {
    if (!isDesktopNameDirty || !desktopFirstName.trim() || desktopSaving) return;
    setDesktopSaving(true);
    setDesktopError(null);
    try {
      await updateProfile({
        first_name: desktopFirstName.trim(),
        last_name: desktopLastName.trim() || null,
      });
      onDraftChange({
        firstName: desktopFirstName.trim(),
        lastName: desktopLastName.trim(),
        fullName: [desktopFirstName.trim(), desktopLastName.trim()].filter(Boolean).join(" "),
      });
      setDesktopModal("none");
    } catch (err) {
      setDesktopError(err instanceof Error ? err.message : "Failed to save name.");
    } finally {
      setDesktopSaving(false);
    }
  };

  const isDesktopLevelDirty = desktopLevel !== (profile.current_level ?? "");

  const handleDesktopSaveLevel = async (): Promise<void> => {
    if (!isDesktopLevelDirty || desktopSaving) return;
    setDesktopSaving(true);
    setDesktopError(null);
    try {
      await updateProfile({
        current_level: desktopLevel,
      });
      onDraftChange({ academicLevel: desktopLevel });
      setDesktopModal("none");
    } catch (err) {
      setDesktopError(err instanceof Error ? err.message : "Failed to update academic level.");
    } finally {
      setDesktopSaving(false);
    }
  };

  // Mobile subpage views
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
                  className="settings-subpage-option"
                  onClick={() => setSubpageLevel(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check size={18} className="settings-subpage-check" aria-hidden="true" />
                  )}
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
          <SettingsRow title="Name">
            <button
              type="button"
              className="settings-account-edit-trigger settings-copy-desktop"
              onClick={() => {
                setDesktopFirstName(draft.firstName);
                setDesktopLastName(draft.lastName);
                setDesktopError(null);
                setDesktopModal("edit-name");
              }}
              aria-label="Edit name"
            >
              <span className="settings-account-value">{currentDisplayName}</span>
              <Pencil size={14} className="settings-edit-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="settings-mobile-row-trigger settings-copy-mobile"
              onClick={() => {
                setSubpageFirst(draft.firstName);
                setSubpageLast(draft.lastName);
                setSaveError(null);
                setSubpage("edit-name");
              }}
            >
              <span className="settings-account-value">{currentDisplayName}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </SettingsRow>

          {/* Row 2: Email */}
          <SettingsRow title="Email">
            <span className="settings-account-value">{profile.email}</span>
          </SettingsRow>

          {/* Row 3: University */}
          <SettingsRow title="University">
            <span className="settings-account-value">{preferences.university ?? "Not set"}</span>
          </SettingsRow>

          {/* Row 4: Academic level */}
          <SettingsRow title="Academic level">
            <button
              type="button"
              className="settings-account-edit-trigger settings-copy-desktop"
              onClick={() => {
                setDesktopLevel(draft.academicLevel || profile.current_level || "100");
                setDesktopError(null);
                setDesktopModal("edit-level");
              }}
              aria-label="Edit academic level"
            >
              <span className="settings-account-value">{currentLevelLabel}</span>
              <Pencil size={14} className="settings-edit-icon" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="settings-mobile-row-trigger settings-copy-mobile"
              onClick={() => {
                setSubpageLevel(draft.academicLevel || profile.current_level || "100");
                setSaveError(null);
                setSubpage("edit-level");
              }}
            >
              <span className="settings-account-value">{currentLevelLabel}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </SettingsRow>
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

      {/* Desktop Edit Name Dialog */}
      <DialogPrimitive.Root
        open={desktopModal === "edit-name"}
        onOpenChange={(open) => {
          if (!open) {
            setDesktopModal("none");
            setDesktopError(null);
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="settings-confirm-overlay" />
          <DialogPrimitive.Content
            className="settings-edit-dialog"
            aria-describedby="edit-name-desc"
          >
            <div className="settings-edit-dialog-header">
              <DialogPrimitive.Title className="settings-edit-dialog-title">
                Edit name
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="settings-edit-dialog-close"
                aria-label="Close"
                onClick={() => {
                  setDesktopModal("none");
                  setDesktopError(null);
                }}
              >
                <X size={18} />
              </DialogPrimitive.Close>
            </div>

            <p id="edit-name-desc" className="sr-only">
              Update your first name and surname.
            </p>

            {desktopError && (
              <p className="settings-edit-dialog-error" role="alert">
                {desktopError}
              </p>
            )}

            <div className="settings-edit-dialog-body">
              <label className="settings-edit-field">
                <span className="settings-edit-field-label">First name</span>
                <input
                  className="settings-edit-input"
                  value={desktopFirstName}
                  onChange={(e) => setDesktopFirstName(e.target.value)}
                  placeholder="First name"
                  maxLength={100}
                  autoFocus
                />
              </label>
              <label className="settings-edit-field">
                <span className="settings-edit-field-label">Surname</span>
                <input
                  className="settings-edit-input"
                  value={desktopLastName}
                  onChange={(e) => setDesktopLastName(e.target.value)}
                  placeholder="Surname"
                  maxLength={100}
                />
              </label>
            </div>

            <div className="settings-edit-dialog-actions">
              <Button
                variant="secondary"
                leadingIcon={null}
                trailingIcon={null}
                disabled={desktopSaving}
                onClick={() => {
                  setDesktopModal("none");
                  setDesktopError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                leadingIcon={null}
                trailingIcon={null}
                disabled={!isDesktopNameDirty || !desktopFirstName.trim() || desktopSaving}
                onClick={handleDesktopSaveName}
              >
                {desktopSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Desktop Edit Academic Level Dialog */}
      <DialogPrimitive.Root
        open={desktopModal === "edit-level"}
        onOpenChange={(open) => {
          if (!open) {
            setDesktopModal("none");
            setDesktopError(null);
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="settings-confirm-overlay" />
          <DialogPrimitive.Content
            className="settings-edit-dialog"
            aria-describedby="edit-level-desc"
          >
            <div className="settings-edit-dialog-header">
              <DialogPrimitive.Title className="settings-edit-dialog-title">
                Academic level
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="settings-edit-dialog-close"
                aria-label="Close"
                onClick={() => {
                  setDesktopModal("none");
                  setDesktopError(null);
                }}
              >
                <X size={18} />
              </DialogPrimitive.Close>
            </div>

            <div id="edit-level-desc" className="settings-edit-info-card">
              <Info size={16} className="settings-edit-info-icon" aria-hidden="true" />
              <p className="settings-edit-info-text">
                Changing your academic level will adjust the documents you have access to for your
                year.
              </p>
            </div>

            {desktopError && (
              <p className="settings-edit-dialog-error" role="alert">
                {desktopError}
              </p>
            )}

            <div className="settings-edit-dialog-body">
              <div className="settings-edit-options-list">
                {LEVEL_OPTIONS.map((opt) => {
                  const isSelected = desktopLevel === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`settings-edit-option${isSelected ? " is-selected" : ""}`}
                      onClick={() => setDesktopLevel(opt.value)}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <Check size={18} className="settings-edit-check" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="settings-edit-dialog-actions">
              <Button
                variant="secondary"
                leadingIcon={null}
                trailingIcon={null}
                disabled={desktopSaving}
                onClick={() => {
                  setDesktopModal("none");
                  setDesktopError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                leadingIcon={null}
                trailingIcon={null}
                disabled={!isDesktopLevelDirty || desktopSaving}
                onClick={handleDesktopSaveLevel}
              >
                {desktopSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
