"use client";
import { FileDown, ImageIcon } from "lucide-react";
import { storagePreview } from "../settings-preview-data";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsActionButton } from "../settings-row";
export function DataStorageSection(): React.ReactElement {
  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Storage on this device"
        description="See what is stored locally and make room when you need it."
        mobileDescription={null}
      >
        <div
          className="settings-storage-overview"
          data-settings-label="Storage overview"
          tabIndex={-1}
        >
          <div className="settings-storage-total">
            <div>
              <span>Space used</span>
              <strong>{storagePreview.totalSize}</strong>
            </div>
            <span className="settings-sample-badge">Sample</span>
          </div>
          <div
            className="settings-storage-meter"
            role="img"
            aria-label="Sample storage breakdown for downloaded documents and cached previews"
          >
            <span className="settings-storage-documents" />
            <span className="settings-storage-previews" />
          </div>
          <div className="settings-storage-legend">
            <span>
              <i data-kind="documents" />
              Downloaded documents <strong>{storagePreview.downloadedSize}</strong>
            </span>
            <span>
              <i data-kind="previews" />
              Cached previews <strong>{storagePreview.cachedSize}</strong>
            </span>
          </div>
        </div>
        <SettingsRow
          title="Downloaded documents"
          description="Files saved to read offline."
          mobileTitle="Downloads"
          mobileDescription="Files saved for offline reading."
        >
          <span className="settings-inline-action-group">
            <span className="settings-storage-count">{storagePreview.downloadedCount} files</span>
            <SettingsActionButton icon={<FileDown size={15} />} disabled>
              Manage
            </SettingsActionButton>
          </span>
        </SettingsRow>
        <SettingsRow
          title="Remove downloads"
          description="Remove local copies without deleting documents from your library."
          mobileDescription="Keeps files in your library."
        >
          <SettingsActionButton disabled>Remove downloads</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Cached files & previews"
          description="Clear temporary files without removing your downloads."
          mobileTitle="Clear cache"
          mobileDescription="Keeps your downloads."
        >
          <SettingsActionButton icon={<ImageIcon size={15} />} disabled>
            Clear cache
          </SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Study data">
        <SettingsRow
          title="Export study data"
          description="Keep a copy of your conversations and study notes."
          mobileDescription="Download your chats and notes."
        >
          <SettingsActionButton disabled>Export data</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Conversation history" className="settings-danger-section">
        <SettingsRow
          title="Delete conversation history"
          description="Review your conversations before deleting them."
          mobileTitle="Delete chats"
          mobileDescription="Review before deleting."
          destructive
        >
          <SettingsActionButton destructive disabled>
            Delete history
          </SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
