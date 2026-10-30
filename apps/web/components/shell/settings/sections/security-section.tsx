"use client";
import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import { Button } from "@pansgpt/ui/shell";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsActionButton } from "../settings-row";
function sessionDevice(): string {
  if (typeof navigator === "undefined") return "This browser";
  const ua = navigator.userAgent;
  const browser = ua.includes("Edg/")
    ? "Edge"
    : ua.includes("Chrome/")
      ? "Chrome"
      : ua.includes("Firefox/")
        ? "Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Browser";
  const device = /iPhone|iPad/.test(ua)
    ? "iOS"
    : ua.includes("Android")
      ? "Android"
      : ua.includes("Windows")
        ? "Windows"
        : ua.includes("Mac")
          ? "macOS"
          : ua.includes("Linux")
            ? "Linux"
            : "this device";
  return `${browser} on ${device}`;
}

export function SecuritySection(): React.ReactElement {
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [device] = useState(sessionDevice);
  return (
    <div className="settings-section-container">
      <SettingsSection title="Security" hideTitleOnMobile>
        <SettingsRow
          title="Password"
          description="Manage your account password."
          mobileTitle="Change password"
          mobileDescription={null}
        >
          <SettingsActionButton
            icon={<LockKeyhole size={15} />}
            onClick={() => setPasswordOpen((value) => !value)}
            expanded={passwordOpen}
          >
            Change password
          </SettingsActionButton>
        </SettingsRow>
        {passwordOpen && (
          <div className="settings-password-fields">
            <label>
              New password
              <input
                type="password"
                className="settings-input"
                aria-label="New password"
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirm password
              <input
                type="password"
                className="settings-input"
                aria-label="Confirm password"
                autoComplete="new-password"
              />
            </label>
            <Button leadingIcon={null} trailingIcon={null} disabled>
              Update password
            </Button>
          </div>
        )}
        <SettingsRow title="This browser" description={device} mobileTitle="This device">
          <span className="settings-value-pill">Current</span>
        </SettingsRow>
        <SettingsRow
          title="Signed-in devices"
          description="Review where you use PansGPT."
          mobileTitle="Manage devices"
          mobileDescription={null}
        >
          <SettingsActionButton disabled>Manage devices</SettingsActionButton>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
