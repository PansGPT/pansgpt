"use client";

import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

export function DataStorageSection({
  onRequestDeleteHistory,
}: {
  onRequestDeleteHistory: () => void;
}): React.ReactElement {
  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Storage & Offline Data"
        description="Review local offline cache allocation and manage persistent study data."
      >
        <div className="settings-storage-flat">
          <div className="settings-storage-header">
            <span>Offline monograph and chat cache</span>
            <strong>3.4 MB / 100 MB</strong>
          </div>
          <div
            className="settings-storage-bar"
            role="progressbar"
            aria-valuenow={3}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="settings-storage-fill" style={{ width: "3.4%" }} />
          </div>
        </div>

        <SettingsRow
          title="Export study data"
          description="Download an archive of your chat history, bookmarked dosages, and study notes in JSON/Markdown."
        >
          <button type="button" className="settings-button-manage" disabled>
            Export data
          </button>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection
        title="Danger zone"
        description="Permanent actions that delete data associated with your study account."
      >
        <SettingsRow
          title="Delete all conversation history"
          description="Permanently remove all conversations, branches, and generated study aids from your account."
          destructive
        >
          <button type="button" onClick={onRequestDeleteHistory} className="settings-button-danger">
            Delete conversations
          </button>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
