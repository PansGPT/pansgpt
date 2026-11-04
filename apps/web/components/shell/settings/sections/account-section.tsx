"use client";

import { Coins } from "lucide-react";
import type { usePreferences } from "@/components/shell/use-preferences";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsActionButton } from "../settings-row";

export function CreditsSection({
  preferences,
}: {
  preferences: ReturnType<typeof usePreferences>;
}): React.ReactElement {
  return (
    <div className="settings-section-container">
      <div className="settings-credits-summary">
        <span className="settings-credits-symbol" aria-hidden="true">
          <Coins size={22} />
        </span>
        <div>
          <p>Available credits</p>
          <strong>
            {preferences.credits === null ? "Unavailable" : preferences.credits.toLocaleString()}
          </strong>
        </div>
      </div>
      <SettingsSection
        title="Activity"
        description="Keep track of your study credits."
        mobileDescription={null}
      >
        <SettingsRow
          title="Credit usage"
          description="Review the credits used by your study activity."
          mobileDescription="See how you've used your credits."
        >
          <SettingsActionButton disabled>View usage</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Purchase history"
          description="Review your previous credit purchases."
          mobileDescription="View your credit purchases."
        >
          <SettingsActionButton disabled>View purchases</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
