"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronUp,
  HelpCircle,
  LogOut,
  Menu,
  Settings,
  Download,
  Command,
  FileText,
  Info,
  Shield,
  FileCheck,
  Bug,
  ExternalLink,
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
import { DownloadAppsDialog } from "./download-apps-dialog";
import { ReportBugDialog } from "./report-bug-dialog";

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

  // Dialog States
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [downloadAppsOpen, setDownloadAppsOpen] = useState(false);
  const [bugReportOpen, setBugReportOpen] = useState(false);

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
          {profile.roles.some((role) =>
            ["super_admin", "university_admin", "lecturer"].includes(role)
          ) && (
            <DropdownItem
              icon={<Shield size={16} />}
              onSelect={() =>
                router.push(
                  profile.roles.includes("super_admin")
                    ? "/super-admin"
                    : profile.roles.includes("university_admin")
                      ? "/admin"
                      : "/lecturer"
                )
              }
            >
              Administration
            </DropdownItem>
          )}

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

          {/* Direct Support Chat Bot / Assistant */}
          <DropdownItem icon={<HelpCircle size={16} />} onSelect={() => transfer(openHelp)}>
            Get help
          </DropdownItem>

          {/* Download apps (Root) */}
          <DropdownItem
            icon={<Download size={16} />}
            onSelect={() => transfer(() => setDownloadAppsOpen(true))}
          >
            Download apps
          </DropdownItem>

          {/* Learn more (Flyout Submenu) */}
          <DropdownSub>
            <DropdownSubTrigger icon={<Info size={16} />}>Learn more</DropdownSubTrigger>
            <DropdownSubContent
              className="shell-account-popup"
              align="end"
              alignOffset={-4}
              sideOffset={8}
              style={{ width: "232px", padding: "6px 6px 8px" }}
            >
              {/* About PansGPT */}
              <DropdownItem
                icon={<Info size={15} />}
                shortcut={<ExternalLink size={12} className="p-dropdown-external-icon" />}
                onSelect={() => {
                  window.open("/about", "_blank");
                }}
              >
                About PansGPT
              </DropdownItem>

              {/* Usage Policy */}
              <DropdownItem
                icon={<FileCheck size={15} />}
                shortcut={<ExternalLink size={12} className="p-dropdown-external-icon" />}
                onSelect={() => {
                  window.open("/usage", "_blank");
                }}
              >
                Usage policy
              </DropdownItem>

              {/* Terms of Service */}
              <DropdownItem
                icon={<FileText size={15} />}
                shortcut={<ExternalLink size={12} className="p-dropdown-external-icon" />}
                onSelect={() => {
                  window.open("/terms", "_blank");
                }}
              >
                Terms of Service
              </DropdownItem>

              {/* Privacy Policy */}
              <DropdownItem
                icon={<Shield size={15} />}
                shortcut={<ExternalLink size={12} className="p-dropdown-external-icon" />}
                onSelect={() => {
                  window.open("/privacy", "_blank");
                }}
              >
                Privacy Policy
              </DropdownItem>

              <div className="study-chat-menu-separator" role="separator" />

              {/* Report a Bug */}
              <DropdownItem
                icon={<Bug size={15} />}
                onSelect={() => transfer(() => setBugReportOpen(true))}
              >
                Report a bug
              </DropdownItem>

              {/* Keyboard Shortcuts */}
              <DropdownItem
                icon={<Command size={15} />}
                shortcut={<kbd className="shell-shortcut-badge">Ctrl+/</kbd>}
                onSelect={() => transfer(() => setShortcutsOpen(true))}
              >
                Keyboard shortcuts
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

      {/* Keyboard Shortcuts Dialog */}
      <ShortcutsDialog
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        returnFocus={() => trigger.current?.focus()}
      />

      {/* Unified Download Apps Dialog (Android, Desktop & iOS) */}
      <DownloadAppsDialog
        open={downloadAppsOpen}
        onOpenChange={setDownloadAppsOpen}
        returnFocus={() => trigger.current?.focus()}
      />

      {/* Report a Bug Dialog */}
      <ReportBugDialog
        open={bugReportOpen}
        onOpenChange={setBugReportOpen}
        returnFocus={() => trigger.current?.focus()}
      />
    </>
  );
}
