"use client";

import { useState } from "react";
import { useMobileSettings } from "../settings-detail-view";
import { useAuth } from "@/lib/auth-context";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsActionButton } from "../settings-row";
import {
  ArchivedChatsDialog,
  DeletedChatsDialog,
  FeedbackHistoryDialog,
  PrivacyInfoDialog,
  UploadedFilesDialog,
  type PrivacyInfoType,
} from "../privacy-dialogs";

export function PrivacySection({ onNavigate }: { onNavigate?: () => void }): React.ReactElement {
  const { session, profile } = useAuth();
  return (
    <PrivacyContent
      key={`${session?.user.id}:${profile?.id}:${profile?.university_id}`}
      onNavigate={onNavigate}
    />
  );
}
function PrivacyContent({ onNavigate }: { onNavigate?: () => void }): React.ReactElement {
  const mobile = useMobileSettings();
  const { session } = useAuth();
  const token = session?.access_token;

  const [infoType, setInfoType] = useState<PrivacyInfoType | null>(null);
  const [uploadsOpen, setUploadsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const detail = infoType ? (
    <PrivacyInfoDialog
      type={infoType}
      open
      onOpenChange={(open) => {
        if (!open) setInfoType(null);
      }}
    />
  ) : uploadsOpen ? (
    <UploadedFilesDialog open onOpenChange={setUploadsOpen} token={token} />
  ) : feedbackOpen ? (
    <FeedbackHistoryDialog open onOpenChange={setFeedbackOpen} token={token} />
  ) : archivedOpen ? (
    <ArchivedChatsDialog
      open
      onOpenChange={setArchivedOpen}
      token={token}
      onNavigate={onNavigate}
    />
  ) : deletedOpen ? (
    <DeletedChatsDialog open onOpenChange={setDeletedOpen} token={token} />
  ) : null;
  if (mobile && detail) return detail;

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Privacy"
        hideTitleOnMobile
        description="Understand how your information is used and manage what you share."
        mobileDescription={null}
      >
        <SettingsRow
          title="How we protect your data"
          mobileTitle="Data protection"
          mobileDescription="Learn how your information is protected."
          chevron
          onClick={() => setInfoType("protection")}
        />
        <SettingsRow
          title="How we use your data"
          mobileTitle="Data use"
          mobileDescription="See how PansGPT uses your information."
          chevron
          onClick={() => setInfoType("use")}
        />
        <SettingsRow
          title="Privacy policy"
          mobileDescription="Read how we collect, use and store data."
          chevron
          onClick={() => setInfoType("policy")}
        />
      </SettingsSection>

      <SettingsSection title="Your data">
        <SettingsRow
          title="Export account data"
          description="Account data export is coming soon."
          mobileTitle="Export my data"
          mobileDescription="Account export is coming soon."
        >
          {/* General account-export/DSAR engine is a separate security-sensitive
              increment. Kept honestly disabled until contract is implemented. */}
          <SettingsActionButton disabled>Export data</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Shared chats"
          description="Public conversation sharing is coming soon."
          mobileDescription="Public sharing is coming soon."
        >
          {/* Public chat sharing infrastructure is not built. Kept honestly disabled. */}
          <SettingsActionButton disabled>Manage</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Uploaded files"
          description="Review files you have added to PansGPT."
          mobileDescription="Review files you've uploaded."
        >
          <SettingsActionButton onClick={() => setUploadsOpen(true)}>Manage</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Your feedback"
          description="Review the feedback you have sent."
          mobileTitle="My feedback"
          mobileDescription="View feedback you've sent."
        >
          <SettingsActionButton onClick={() => setFeedbackOpen(true)}>Manage</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Conversations">
        <SettingsRow
          title="Archived chats"
          description="Conversations you've put away for later."
          mobileDescription="Find chats you've put away."
        >
          <SettingsActionButton onClick={() => setArchivedOpen(true)}>
            View archived
          </SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Deleted chats"
          description="Restore conversations within 30 days of deletion."
          mobileDescription="Restore within 30 days."
        >
          <SettingsActionButton onClick={() => setDeletedOpen(true)}>
            View deleted
          </SettingsActionButton>
        </SettingsRow>
      </SettingsSection>

      {detail}
    </div>
  );
}
