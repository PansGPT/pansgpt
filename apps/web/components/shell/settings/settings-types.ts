import type { ReactNode } from "react";
import type { UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "@/components/shell/use-preferences";

export type SettingsSectionId =
  | "account"
  | "billing"
  | "appearance"
  | "notifications"
  | "privacy"
  | "wellbeing"
  | "data-storage"
  | "about";

export interface SettingsNavGroup {
  label?: string;
  items: {
    id: SettingsSectionId;
    label: string;
    icon: ReactNode;
    badge?: string;
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
