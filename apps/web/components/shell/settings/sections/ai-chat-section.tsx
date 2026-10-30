"use client";
import type { DraftSectionProps } from "../settings-types";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";
import { SettingsSelect } from "../settings-select";
export function AiChatSection({ draft, onDraftChange }: DraftSectionProps): React.ReactElement {
  return (
    <SettingsSection title="Chat preferences">
      <SettingsRow
        className="settings-response-detail-row"
        title="Response detail"
        description="How much explanation you prefer in an answer."
        mobileDescription="Choose how much explanation you get."
      >
        <SettingsSelect
          label="Response detail"
          value={draft.responseStyle}
          onValueChange={(responseStyle) => onDraftChange({ responseStyle })}
          options={[
            { value: "concise", label: "Concise" },
            { value: "balanced", label: "Balanced" },
            { value: "detailed", label: "Detailed" },
          ]}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
