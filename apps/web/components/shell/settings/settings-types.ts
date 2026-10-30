import type { ReactNode } from "react";
import type { UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";

export type SettingsSectionId =
  | "account"
  | "security"
  | "billing"
  | "appearance"
  | "notifications"
  | "privacy"
  | "wellbeing"
  | "data-storage"
  | "about";

export interface SettingsDraft {
  fullName: string;
  academicLevel: string;
  interfaceFont: string;
  responseFont: string;
  motion: string;
  responseStyle: string;
  replies: boolean;
  generatedFiles: boolean;
  courseUpdates: boolean;
  studyReminders: boolean;
  studyBreaks: boolean;
  nightStudy: boolean;
}

export interface DraftSectionProps {
  draft: SettingsDraft;
  onDraftChange: (patch: Partial<SettingsDraft>) => void;
}

export interface SettingsNavGroup {
  label?: string;
  items: {
    id: SettingsSectionId;
    label: string;
    icon: ReactNode;
    keywords?: string;
  }[];
}

export interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
  initialSection?: SettingsSectionId;
  returnFocus?: () => void;
}
