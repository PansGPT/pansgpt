"use client";

import { useState } from "react";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";

export function NotificationsSection(): React.ReactElement {
  const [completions, setCompletions] = useState(true);
  const [studyReminders, setStudyReminders] = useState(false);
  const [courseUpdates, setCourseUpdates] = useState(true);

  return (
    <div className="settings-section-container">
      <SettingsSection>
        <SettingsRow title="Replies" description="Get notified when PansGPT finishes a reply.">
          <SettingsToggle
            checked={completions}
            onChange={setCompletions}
            aria-label="Toggle replies notification"
          />
        </SettingsRow>

        <SettingsRow title="Research complete" description="Get notified when research completes">
          <SettingsToggle
            checked={studyReminders}
            onChange={setStudyReminders}
            aria-label="Toggle research complete notification"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection>
        <SettingsRow
          title="Product updates"
          description="Get notified about new features, tips, and occasional promotions"
        >
          <SettingsToggle
            checked={courseUpdates}
            onChange={setCourseUpdates}
            aria-label="Toggle product updates notification"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
