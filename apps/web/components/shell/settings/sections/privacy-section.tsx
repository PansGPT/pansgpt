"use client";

import { useState } from "react";
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

export function PrivacySection(): React.ReactElement {
  const { session } = useAuth();
  const token = session?.access_token;

  const [infoType, setInfoType] = useState<PrivacyInfoType | null>(null);
  const [uploadsOpen, setUploadsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);

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
          description="Get a copy of the information associated with your account."
          mobileTitle="Export my data"
          mobileDescription="Download your account information."
        >
          {/* General account-export/DSAR engine is a separate security-sensitive
              increment. Kept honestly disabled until contract is implemented. */}
          <SettingsActionButton disabled>Export data</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Shared chats"
          description="Review the conversations you have shared."
          mobileDescription="Review chats you've shared with others."
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

      {/* Dialogs */}
      <PrivacyInfoDialog
        type={infoType}
        open={infoType !== null}
        onOpenChange={(open) => {
          if (!open) setInfoType(null);
        }}
      />
      <UploadedFilesDialog open={uploadsOpen} onOpenChange={setUploadsOpen} token={token} />
      <FeedbackHistoryDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} token={token} />
      <ArchivedChatsDialog open={archivedOpen} onOpenChange={setArchivedOpen} token={token} />
      <DeletedChatsDialog open={deletedOpen} onOpenChange={setDeletedOpen} token={token} />
    </div>
  );
}
