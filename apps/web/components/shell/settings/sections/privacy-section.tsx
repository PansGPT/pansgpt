"use client";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsActionButton } from "../settings-row";
export function PrivacySection(): React.ReactElement {
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
          disabled
          onClick={() => undefined}
        />
        <SettingsRow
          title="How we use your data"
          mobileTitle="Data use"
          mobileDescription="See how PansGPT uses your information."
          chevron
          disabled
          onClick={() => undefined}
        />
        <SettingsRow
          title="Privacy policy"
          mobileDescription="Read how we collect, use and store data."
          chevron
          disabled
          onClick={() => undefined}
        />
      </SettingsSection>
      <SettingsSection title="Your data">
        <SettingsRow
          title="Export account data"
          description="Get a copy of the information associated with your account."
          mobileTitle="Export my data"
          mobileDescription="Download your account information."
        >
          <SettingsActionButton disabled>Export data</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Shared chats"
          description="Review the conversations you have shared."
          mobileDescription="Review chats you've shared with others."
        >
          <SettingsActionButton disabled>Manage</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Uploaded files"
          description="Review files you have added to PansGPT."
          mobileDescription="Review files you've uploaded."
        >
          <SettingsActionButton disabled>Manage</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Your feedback"
          description="Review the feedback you have sent."
          mobileTitle="My feedback"
          mobileDescription="View feedback you've sent."
        >
          <SettingsActionButton disabled>Manage</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Conversations">
        <SettingsRow
          title="Archived chats"
          description="Conversations you've put away for later."
          mobileDescription="Find chats you've put away."
        >
          <SettingsActionButton disabled>View archived</SettingsActionButton>
        </SettingsRow>
        <SettingsRow
          title="Deleted chats"
          description="Restore conversations within 30 days of deletion."
          mobileDescription="Restore within 30 days."
        >
          <SettingsActionButton disabled>View deleted</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
