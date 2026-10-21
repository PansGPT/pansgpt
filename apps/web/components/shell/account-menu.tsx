"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronUp, HelpCircle, LogOut, Settings, UserRound } from "lucide-react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownHeader,
  DropdownItem,
  UserInitialsAvatar,
} from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";

export function AccountMenu({
  profile,
  openProfile,
  openHelp,
}: {
  profile: UserProfile;
  openProfile: (opener: HTMLButtonElement | null) => void;
  openHelp: (opener: HTMLButtonElement | null) => void;
}): React.ReactElement {
  const { signOut } = useAuth();
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const transferring = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your account";
  function transfer(action: (opener: HTMLButtonElement | null) => void): void {
    transferring.current = true;
    // Let the menu release its focus trap before the next panel takes focus.
    requestAnimationFrame(() => action(trigger.current));
  }
  return (
    <Dropdown
      onOpenChange={(open) => {
        if (open) transferring.current = false;
      }}
    >
      <DropdownTrigger asChild>
        <button
          ref={trigger}
          className="shell-account shell-account-menu"
          aria-label="Account menu"
        >
          <UserInitialsAvatar name={name} email={profile.email} size="sm" />
          <span className="shell-account-copy">
            <strong>{name}</strong>
            <small>{profile.email}</small>
          </span>
          <ChevronUp size={16} aria-hidden="true" />
        </button>
      </DropdownTrigger>
      <DropdownContent
        side="top"
        align="start"
        aria-label="Account options"
        className="shell-account-popup"
        onCloseAutoFocus={(event) => {
          if (transferring.current) event.preventDefault();
        }}
      >
        <DropdownHeader title={name} description={profile.email} />
        <DropdownItem icon={<UserRound size={17} />} onSelect={() => transfer(openProfile)}>
          Profile
        </DropdownItem>
        <DropdownItem icon={<Settings size={17} />} onSelect={() => transfer(openProfile)}>
          Settings
        </DropdownItem>
        <DropdownItem icon={<HelpCircle size={17} />} onSelect={() => transfer(openHelp)}>
          Help
        </DropdownItem>
        <DropdownItem
          icon={<LogOut size={17} />}
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
  );
}
