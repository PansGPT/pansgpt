"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";

export function PrivacySection({
  onOpenManageFiles,
}: {
  onOpenManageFiles?: () => void;
}): React.ReactElement {
  const [improveModels, setImproveModels] = useState(true);

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Privacy"
        description="PansGPT believes in transparent data practices. Learn how your information is protected when using PansGPT products, and visit our Privacy Center and Privacy Policy for more details."
      >
        <button
          type="button"
          className="settings-link-row"
          onClick={() => window.open("/privacy#protection", "_blank")}
        >
          <span>How we protect your data</span>
          <ChevronRight size={17} className="settings-link-chevron" aria-hidden="true" />
        </button>

        <button
          type="button"
          className="settings-link-row"
          onClick={() => window.open("/privacy#usage", "_blank")}
        >
          <span>How we use your data</span>
          <ChevronRight size={17} className="settings-link-chevron" aria-hidden="true" />
        </button>
      </SettingsSection>

      <SettingsSection title="Preferences">
        <SettingsRow
          title="Help improve our AI models"
          description="Allow the use of anonymized clinical chats and study sessions to train and improve PansGPT AI models. Learn more."
        >
          <SettingsToggle
            checked={improveModels}
            onChange={setImproveModels}
            aria-label="Allow improving AI models"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Your data">
        <SettingsRow title="Export data">
          <button type="button" className="settings-button-manage">
            Export data
          </button>
        </SettingsRow>

        <SettingsRow title="Shared chats">
          <button type="button" className="settings-button-manage">
            Manage
          </button>
        </SettingsRow>

        <SettingsRow title="Uploaded files">
          <button type="button" className="settings-button-manage" onClick={onOpenManageFiles}>
            Manage
          </button>
        </SettingsRow>

        <SettingsRow title="Your feedback">
          <button type="button" className="settings-button-manage">
            Manage
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
