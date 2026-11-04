"use client";
import type { DraftSectionProps } from "../settings-types";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";
export function WellbeingSection({ draft, onDraftChange }: DraftSectionProps): React.ReactElement {
  return (
    <SettingsSection title="Study rhythm">
      <SettingsRow
        title="Break reminders"
        description="Make room for short breaks while studying."
        mobileDescription="Remind me to take short study breaks."
      >
        <SettingsToggle
          checked={draft.studyBreaks}
          onChange={(studyBreaks) => onDraftChange({ studyBreaks })}
          aria-label="Break reminders"
        />
      </SettingsRow>
      <SettingsRow
        title="Late-night reminders"
        description="A gentle reminder when you're studying late."
        mobileDescription="A reminder when I study late."
      >
        <SettingsToggle
          checked={draft.nightStudy}
          onChange={(nightStudy) => onDraftChange({ nightStudy })}
          aria-label="Late-night reminders"
        />
      </SettingsRow>
    </SettingsSection>
  );
}
