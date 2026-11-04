import type { SettingsSectionId } from "./settings-types";

export interface SettingsSearchField {
  section: SettingsSectionId;
  label: string;
  target: string;
  keywords: string;
}

// Targets correspond to visible rows/sections, never account data or draft values.
export const SETTINGS_SEARCH_FIELDS: readonly SettingsSearchField[] = [
  { section: "account", label: "Full name", target: "Name", keywords: "profile first last name" },
  { section: "account", label: "Email", target: "Email", keywords: "email address" },
  { section: "account", label: "University", target: "University", keywords: "school institution" },
  {
    section: "account",
    label: "Academic level",
    target: "Academic level",
    keywords: "year cohort",
  },
  {
    section: "account",
    label: "Delete account",
    target: "Delete account",
    keywords: "deletion remove account",
  },
  {
    section: "security",
    label: "Password",
    target: "Password",
    keywords: "change password login sign in",
  },
  {
    section: "security",
    label: "This browser",
    target: "This browser",
    keywords: "current device browser",
  },
  {
    section: "security",
    label: "Signed-in devices",
    target: "Signed-in devices",
    keywords: "active sessions revoke devices",
  },
  {
    section: "billing",
    label: "Credit usage",
    target: "Credit usage",
    keywords: "balance credits spending",
  },
  {
    section: "billing",
    label: "Purchase history",
    target: "Purchase history",
    keywords: "payments receipts billing",
  },
  {
    section: "appearance",
    label: "Theme",
    target: "Theme",
    keywords: "light dark sepia color colour",
  },
  {
    section: "appearance",
    label: "Interface font",
    target: "Interface font",
    keywords: "text typeface system font",
  },
  {
    section: "appearance",
    label: "Response font",
    target: "Response font",
    keywords: "text sans serif monospace",
  },
  {
    section: "appearance",
    label: "Motion",
    target: "Motion",
    keywords: "animation reduced motion",
  },
  {
    section: "notifications",
    label: "Finished replies",
    target: "Finished replies",
    keywords: "answer completion notifications",
  },
  {
    section: "notifications",
    label: "Generated files",
    target: "Generated files",
    keywords: "presentations ready files",
  },
  {
    section: "notifications",
    label: "Course updates",
    target: "Course updates",
    keywords: "new materials notifications",
  },
  {
    section: "notifications",
    label: "Study reminders",
    target: "Study reminders",
    keywords: "study plan reminders",
  },
  {
    section: "privacy",
    label: "How we protect your data",
    target: "How we protect your data",
    keywords: "privacy protection",
  },
  {
    section: "privacy",
    label: "How we use your data",
    target: "How we use your data",
    keywords: "privacy usage",
  },
  {
    section: "privacy",
    label: "Privacy policy",
    target: "Privacy policy",
    keywords: "privacy policy",
  },
  {
    section: "privacy",
    label: "Export account data",
    target: "Export account data",
    keywords: "download personal information",
  },
  {
    section: "privacy",
    label: "Shared chats",
    target: "Shared chats",
    keywords: "public links conversations sharing",
  },
  {
    section: "privacy",
    label: "Uploaded files",
    target: "Uploaded files",
    keywords: "attachments images manage uploads",
  },
  {
    section: "privacy",
    label: "Your feedback",
    target: "Your feedback",
    keywords: "previous feedback reports",
  },
  {
    section: "privacy",
    label: "Archived chats",
    target: "Archived chats",
    keywords: "archive conversations",
  },
  {
    section: "privacy",
    label: "Deleted chats",
    target: "Deleted chats",
    keywords: "restore recover conversations trash",
  },
  {
    section: "wellbeing",
    label: "Response detail",
    target: "Response detail",
    keywords: "chat explanation concise balanced detailed",
  },
  {
    section: "wellbeing",
    label: "Break reminders",
    target: "Break reminders",
    keywords: "rest study breaks",
  },
  {
    section: "wellbeing",
    label: "Late-night reminders",
    target: "Late-night reminders",
    keywords: "sleep bedtime night study",
  },
  {
    section: "data-storage",
    label: "Storage overview",
    target: "Storage overview",
    keywords: "space used storage size",
  },
  {
    section: "data-storage",
    label: "Downloaded documents",
    target: "Downloaded documents",
    keywords: "offline files manage downloads",
  },
  {
    section: "data-storage",
    label: "Remove downloads",
    target: "Remove downloads",
    keywords: "delete local files free space",
  },
  {
    section: "data-storage",
    label: "Cached files & previews",
    target: "Cached files & previews",
    keywords: "clear cache thumbnails",
  },
  {
    section: "data-storage",
    label: "Export study data",
    target: "Export study data",
    keywords: "download conversations notes",
  },
  {
    section: "data-storage",
    label: "Delete conversation history",
    target: "Delete conversation history",
    keywords: "clear chats history",
  },
  {
    section: "about",
    label: "Feedback",
    target: "Send feedback",
    keywords: "help support report bug idea feedback",
  },
  { section: "about", label: "Version", target: "PansGPT", keywords: "app version release" },
  {
    section: "about",
    label: "Terms of service",
    target: "Terms of service",
    keywords: "legal terms conditions",
  },
];
