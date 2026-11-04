"use client";
import { useId } from "react";
import { Button } from "@pansgpt/ui/shell";
import type { usePreferences } from "@/components/shell/use-preferences";
import type { DraftSectionProps } from "../settings-types";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";
import { SettingsSelect } from "../settings-select";
export function AppearanceSection({
  preferences,
  draft,
  onDraftChange,
}: DraftSectionProps & { preferences: ReturnType<typeof usePreferences> }): React.ReactElement {
  const themeId = useId();
  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Theme"
        description="Choose the look that feels comfortable to study in."
        mobileDescription={null}
      >
        <fieldset className="settings-theme-options">
          <legend className="p-sr-only">Theme</legend>
          {(["light", "dark", "sepia"] as const).map((theme) => (
            <label className="settings-theme-option" key={theme} data-choice={theme}>
              <input
                type="radio"
                name={themeId}
                value={theme}
                checked={preferences.theme === theme}
                disabled={!preferences.ready}
                onChange={() => preferences.save(theme)}
                aria-label={`${theme[0]?.toUpperCase()}${theme.slice(1)} theme`}
              />
              <span className="settings-theme-preview" aria-hidden="true">
                <span>Aa</span>
                <i />
                <i />
              </span>
              <span className="settings-theme-name">
                {theme[0]?.toUpperCase()}
                {theme.slice(1)}
              </span>
            </label>
          ))}
        </fieldset>
        <p className="settings-preference-status" role="status">
          {preferences.status === "saving"
            ? "Saving theme..."
            : preferences.status === "local"
              ? "Theme saved on this device. Account sync is unavailable."
              : preferences.status === "loading"
                ? "Loading your theme..."
                : "Your theme is saved."}
        </p>
        {preferences.status === "local" && (
          <Button
            variant="secondary"
            leadingIcon={null}
            trailingIcon={null}
            onClick={() => preferences.save(preferences.theme)}
          >
            Retry theme sync
          </Button>
        )}
      </SettingsSection>
      <SettingsSection title="Text & motion">
        <SettingsRow title="Interface font">
          <SettingsSelect
            label="Interface font"
            value={draft.interfaceFont}
            onValueChange={(interfaceFont) => onDraftChange({ interfaceFont })}
            options={[
              { value: "default", label: "Default" },
              { value: "system", label: "System" },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Response font">
          <SettingsSelect
            label="Response font"
            value={draft.responseFont}
            onValueChange={(responseFont) => onDraftChange({ responseFont })}
            options={[
              { value: "sans", label: "Sans serif" },
              { value: "serif", label: "Serif" },
              { value: "mono", label: "Monospace" },
            ]}
          />
        </SettingsRow>
        <SettingsRow title="Motion">
          <SettingsSelect
            label="Motion preference"
            value={draft.motion}
            onValueChange={(motion) => onDraftChange({ motion })}
            options={[
              { value: "system", label: "Follow system" },
              { value: "reduced", label: "Reduced" },
              { value: "full", label: "Full" },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
