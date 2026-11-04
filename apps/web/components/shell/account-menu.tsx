"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
  BookOpen,
  Download,
  Smartphone,
  Monitor,
  Share2,
  Command,
  FileText,
  Info,
} from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownHeader,
  DropdownItem,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
  UserInitialsAvatar,
} from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { SettingsSectionId } from "./settings/settings-types";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { IosInstructionsDialog } from "./ios-instructions-dialog";

export function AccountMenu({
  profile,
  openProfile,
  openSettings,
  openHelp,
  compact = false,
  openNavigation,
}: {
  profile: UserProfile;
  openProfile: (opener: HTMLButtonElement | null) => void;
  openSettings?: (opener: HTMLButtonElement | null, section?: SettingsSectionId) => void;
  openHelp: (opener: HTMLButtonElement | null) => void;
  compact?: boolean;
  openNavigation?: () => void;
}): React.ReactElement {
  const { signOut } = useAuth();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const transferring = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [iosModalOpen, setIosModalOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your account";

  function transfer(action: (opener: HTMLButtonElement | null) => void): void {
    transferring.current = true;
    requestAnimationFrame(() => action(trigger.current));
  }

  return (
    <>
      <Dropdown
        onOpenChange={(open) => {
          if (open) transferring.current = false;
        }}
      >
        <DropdownTrigger asChild>
          <button
            ref={trigger}
            className={`shell-account shell-account-menu${compact ? " shell-account-compact" : ""}`}
            aria-label="Account menu"
          >
            {compact ? (
              <span className="shell-account-initial" aria-hidden="true">
                {Array.from(profile.first_name || name)[0]?.toUpperCase()}
              </span>
            ) : (
              <UserInitialsAvatar name={name} email={profile.email} size="sm" />
            )}
            {!compact && (
              <span className="shell-account-copy">
                <strong>{name}</strong>
                <small>{profile.email}</small>
              </span>
            )}
            {!compact && <ChevronUp size={16} aria-hidden="true" />}
          </button>
        </DropdownTrigger>
        <DropdownContent
          side={compact ? "bottom" : "top"}
          align={compact ? "end" : "start"}
          aria-label="Account options"
          className="shell-account-popup"
          onCloseAutoFocus={(event) => {
            if (transferring.current) event.preventDefault();
          }}
        >
          <DropdownHeader title={name} description={profile.email} />

          {openNavigation && (
            <DropdownItem
              icon={<Menu size={16} />}
              onSelect={() => transfer(() => openNavigation())}
            >
              Navigation
            </DropdownItem>
          )}

          {/* Settings */}
          <DropdownItem
            icon={<Settings size={16} />}
            onSelect={() => transfer((opener) => (openSettings ?? openProfile)(opener))}
          >
            Settings
          </DropdownItem>

          {/* Get help */}
          <DropdownItem icon={<HelpCircle size={16} />} onSelect={() => transfer(openHelp)}>
            Get help
          </DropdownItem>

          {/* Learn more (Hover Submenu) */}
          <DropdownSub>
            <DropdownSubTrigger icon={<BookOpen size={16} />}>Learn more</DropdownSubTrigger>
            <DropdownSubContent className="shell-account-popup" style={{ width: "196px" }}>
              <DropdownItem
                icon={<Info size={15} />}
                onSelect={() => transfer((opener) => openSettings?.(opener, "about"))}
              >
                About PansGPT
              </DropdownItem>
              <DropdownItem
                icon={<Command size={15} />}
                onSelect={() => transfer(() => setShortcutsOpen(true))}
              >
                Keyboard shortcuts
              </DropdownItem>
              <DropdownItem
                icon={<FileText size={15} />}
                onSelect={() => transfer((opener) => openSettings?.(opener, "privacy"))}
              >
                Privacy & Data
              </DropdownItem>
            </DropdownSubContent>
          </DropdownSub>

          {/* Download (Hover Submenu) */}
          <DropdownSub>
            <DropdownSubTrigger icon={<Download size={16} />}>Download app</DropdownSubTrigger>
            <DropdownSubContent className="shell-account-popup" style={{ width: "206px" }}>
              <DropdownItem
                icon={<Smartphone size={15} />}
                onSelect={() => {
                  // Direct download link or prompt
                  window.open("/downloads/pansgpt-android.apk", "_blank");
                }}
              >
                Download for Android
              </DropdownItem>
              <DropdownItem
                icon={<Monitor size={15} />}
                onSelect={() => {
                  // Direct desktop app link
                  window.open("/downloads/pansgpt-desktop.exe", "_blank");
                }}
              >
                Download Desktop App
              </DropdownItem>
              <DropdownItem
                icon={<Share2 size={15} />}
                onSelect={() => {
                  // Open iOS home screen instructions dialog
                  setIosModalOpen(true);
                }}
              >
                Add to iOS Home Screen
              </DropdownItem>
            </DropdownSubContent>
          </DropdownSub>

          <div className="study-chat-menu-separator" role="separator" />

          {/* Log out */}
          <DropdownItem
            className="shell-account-logout"
            icon={<LogOut size={16} />}
            disabled={busy}
            onSelect={(event) => {
              event.preventDefault();
              setBusy(true);
              setError(false);
              void signOut()
                .then(() => {
                  router.replace("/login");
                  router.refresh();
                })
                .catch(() => {
                  setBusy(false);
                  setError(true);
                });
            }}
          >
            {busy ? "Signing out…" : "Log out"}
          </DropdownItem>

          {error && (
            <p role="alert" className="shell-account-error">
              We couldn&apos;t sign you out. Please try again.
            </p>
          )}
        </DropdownContent>
      </Dropdown>

      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        returnFocus={() => trigger.current?.focus()}
      />
      {/* iOS Installation Instructions Dialog */}
      <IosInstructionsDialog open={iosModalOpen} onOpenChange={setIosModalOpen} />
    </>
  );
}
