"use client";
import type { DraftSectionProps } from "../settings-types";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";
export function NotificationsSection({
  draft,
  onDraftChange,
}: DraftSectionProps): React.ReactElement {
  return (
    <SettingsSection title="Notifications" hideTitleOnMobile>
      <SettingsRow
        title="Finished replies"
        description="When PansGPT finishes answering your question."
        mobileDescription="Notify me when a reply is ready."
      >
        <SettingsToggle
          checked={draft.replies}
          onChange={(replies) => onDraftChange({ replies })}
          aria-label="Finished replies"
        />
      </SettingsRow>
      <SettingsRow
        title="Generated files"
        description="When a presentation or study file is ready."
        mobileDescription="Notify me when a study file is ready."
      >
        <SettingsToggle
          checked={draft.generatedFiles}
          onChange={(generatedFiles) => onDraftChange({ generatedFiles })}
          aria-label="Generated files"
        />
      </SettingsRow>
      <SettingsRow
        title="Course updates"
        description="New materials and updates from your courses."
        mobileDescription="New materials from your courses."
      >
        <SettingsToggle
          checked={draft.courseUpdates}
          onChange={(courseUpdates) => onDraftChange({ courseUpdates })}
          aria-label="Course updates"
        />
      </SettingsRow>
      <SettingsRow
        title="Study reminders"
        description="A nudge to return to your study plan."
        mobileDescription="Reminders for your study plan."
      >
        <SettingsToggle
          checked={draft.studyReminders}
          onChange={(studyReminders) => onDraftChange({ studyReminders })}
          aria-label="Study reminders"
        />
      </SettingsRow>
    </SettingsSection>
  );
}
