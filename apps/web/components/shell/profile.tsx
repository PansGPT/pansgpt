"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button, isThemeName, Slideout, UserInitialsAvatar } from "@pansgpt/ui/shell";
import { useAuth, type UserProfile } from "@/lib/auth-context";
import type { usePreferences } from "./use-preferences";

export function ProfileDrawer({
  profile,
  preferences,
  compact = false,
}: {
  profile: UserProfile;
  preferences: ReturnType<typeof usePreferences>;
  compact?: boolean;
}): React.ReactElement {
  const router = useRouter();
  const { signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Your profile";
  async function logout(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } catch {
      setError("We couldn't sign you out. Please try again.");
      setBusy(false);
    }
  }
  return (
    <Slideout
      title="Your profile"
      description="Your account, university and workspace preferences."
      trigger={
        <button className="shell-account" aria-label="Open profile">
          <UserInitialsAvatar name={name} email={profile.email} size="sm" />
          {!compact && (
            <span>
              <strong>{name}</strong>
              <small>View your profile</small>
            </span>
          )}
        </button>
      }
    >
      <div className="shell-profile">
        <UserInitialsAvatar name={name} email={profile.email} size="lg" />
        <h3>{name}</h3>
        <p>{profile.email}</p>
        <dl>
          <div>
            <dt>University</dt>
            <dd>{preferences.university ?? "University details unavailable"}</dd>
          </div>
          <div>
            <dt>Academic level</dt>
            <dd>{profile.current_level ? `${profile.current_level} Level` : "Not set"}</dd>
          </div>
          <div>
            <dt>Account</dt>
            <dd>{profile.role.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt>Credits</dt>
            <dd>
              {preferences.credits === null
                ? "Balance unavailable"
                : preferences.credits.toLocaleString()}
            </dd>
          </div>
        </dl>
        <label className="shell-theme-field">
          Workspace theme
          <select
            value={preferences.theme}
            disabled={!preferences.ready}
            onChange={(event) => {
              if (isThemeName(event.target.value)) preferences.save(event.target.value);
            }}
          >
            <option value="light">Light</option>
            <option value="dark">OLED Dark</option>
            <option value="sepia">Sepia</option>
          </select>
        </label>
        <p role="status" className="shell-preference-status">
          {preferences.status === "saving"
            ? "Saving your preference…"
            : preferences.status === "local"
              ? "Saved on this device. Account sync is unavailable."
              : preferences.status === "loading"
                ? "Loading your account preference…"
                : "Your theme is saved."}
        </p>
        {preferences.status === "local" && (
          <Button
            variant="secondary"
            leadingIcon={null}
            trailingIcon={null}
            onClick={() => preferences.save(preferences.theme)}
          >
            Retry theme sync
          </Button>
        )}
        {error && <p role="alert">{error}</p>}
        <Button
          variant="secondary"
          leadingIcon={<LogOut size={16} />}
          trailingIcon={null}
          disabled={busy}
          onClick={() => void logout()}
        >
          {busy ? "Signing out…" : "Sign Out"}
        </Button>
      </div>
    </Slideout>
  );
}
