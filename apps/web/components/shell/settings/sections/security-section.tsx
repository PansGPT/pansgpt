"use client";

import { useState } from "react";
import {
  LockKeyhole,
  ChevronLeft,
  ChevronRight,
  X,
  Laptop,
  Smartphone,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ShieldCheck,
  MoreHorizontal,
  Info,
} from "lucide-react";
import { Button, DialogPrimitive } from "@pansgpt/ui/shell";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

interface SessionDevice {
  id: string;
  name: string;
  location: string;
  signedInAt: string;
  lastActiveAt: string;
  isCurrent: boolean;
  type: "mobile" | "desktop";
}

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
  return `${browser} (${device})`;
}

const INITIAL_DEVICES: SessionDevice[] = [
  {
    id: "device-1",
    name: "Mobile Safari (iOS)",
    location: "Abuja, FCT, NG",
    signedInAt: "Oct 25, 2026, 3:16 PM",
    lastActiveAt: "Oct 25, 2026, 3:16 PM",
    isCurrent: false,
    type: "mobile",
  },
  {
    id: "device-2",
    name: "PansGPT (iOS)",
    location: "Abuja, FCT, NG",
    signedInAt: "Oct 21, 2026, 4:42 PM",
    lastActiveAt: "Nov 8, 2026, 4:20 PM",
    isCurrent: false,
    type: "mobile",
  },
  {
    id: "device-3",
    name: "PansGPT Desktop (Windows)",
    location: "Abuja, FCT, NG",
    signedInAt: "Oct 15, 2026, 9:13 PM",
    lastActiveAt: "Oct 16, 2026, 12:51 PM",
    isCurrent: false,
    type: "desktop",
  },
  {
    id: "device-current",
    name: sessionDevice(),
    location: "Abuja, FCT, NG",
    signedInAt: "Aug 11, 2026, 5:01 AM",
    lastActiveAt: "Active now",
    isCurrent: true,
    type: "desktop",
  },
];

export function SecuritySection(): React.ReactElement {
  const [devices, setDevices] = useState<SessionDevice[]>(INITIAL_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<SessionDevice | null>(null);
  const [subpage, setSubpage] = useState<"none" | "change-password" | "manage-devices">("none");
  const [desktopModal, setDesktopModal] = useState<"none" | "change-password">("none");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  function handleLogoutAll() {
    setDevices((prev) => prev.filter((d) => d.isCurrent));
  }

  function handleLogoutDevice(id: string) {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }

  function handleUpdatePassword() {
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setDesktopModal("none");
    setSubpage("none");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError(null);
  }

  /* --- Mobile Subpage: Change Password --- */
  if (subpage === "change-password") {
    return (
      <div className="settings-mobile-subpage">
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            onClick={() => {
              setPasswordError(null);
              setSubpage("none");
            }}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="settings-subpage-title">Change password</h2>
          <button
            type="button"
            className="settings-subpage-save-btn"
            disabled={!newPassword || newPassword !== confirmPassword}
            onClick={handleUpdatePassword}
          >
            Save
          </button>
        </div>
        <div className="settings-subpage-body">
          {passwordError && <p className="settings-subpage-error">{passwordError}</p>}
          <div className="settings-subpage-info-card">
            <Info size={16} className="settings-subpage-info-icon" aria-hidden="true" />
            <p className="settings-subpage-info-text">
              Use at least 8 characters with a mix of letters and numbers to protect your account.
            </p>
          </div>
          <div className="settings-subpage-input-card">
            <label className="settings-subpage-input-label" htmlFor="mobile-new-password">
              New password
            </label>
            <input
              id="mobile-new-password"
              type="password"
              className="settings-subpage-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              autoComplete="new-password"
              placeholder="Enter new password"
            />
          </div>
          <div className="settings-subpage-input-card">
            <label className="settings-subpage-input-label" htmlFor="mobile-confirm-password">
              Confirm password
            </label>
            <input
              id="mobile-confirm-password"
              type="password"
              className="settings-subpage-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              placeholder="Confirm new password"
            />
          </div>
        </div>
      </div>
    );
  }

  /* --- Mobile Subpage: Manage Devices --- */
  if (subpage === "manage-devices") {
    return (
      <div className="settings-mobile-subpage">
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            onClick={() => {
              setSelectedDevice(null);
              setSubpage("none");
            }}
            aria-label="Back"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="settings-subpage-title">Manage devices</h2>
          <div style={{ width: 38 }} aria-hidden="true" />
        </div>
        <div className="settings-subpage-body">
          <p className="settings-mobile-devices-description">
            Review the devices currently signed in to your account. You can log out of any session
            you do not recognize.
          </p>

          <h3 className="settings-mobile-linked-devices-title">Linked devices</h3>

          <div className="settings-mobile-linked-device-list">
            {devices.map((dev) => (
              <button
                key={dev.id}
                type="button"
                className="settings-mobile-linked-device-card"
                onClick={() => setSelectedDevice(dev)}
                aria-label={`View details for ${dev.name}`}
              >
                <div className="settings-mobile-linked-device-icon-wrap">
                  {dev.type === "mobile" ? (
                    <Smartphone
                      size={22}
                      className="settings-mobile-linked-device-icon"
                      aria-hidden="true"
                    />
                  ) : (
                    <Laptop
                      size={22}
                      className="settings-mobile-linked-device-icon"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="settings-mobile-linked-device-info">
                  <span className="settings-mobile-linked-device-name">{dev.name}</span>
                  <span className="settings-mobile-linked-device-meta">
                    {dev.isCurrent
                      ? "Active now"
                      : dev.lastActiveAt.toLowerCase().startsWith("last active")
                        ? dev.lastActiveAt
                        : `Last active ${dev.lastActiveAt}`}
                  </span>
                </div>
                <ChevronRight
                  size={18}
                  className="settings-mobile-linked-device-chevron"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>

        <DialogPrimitive.Root
          open={!!selectedDevice}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedDevice(null);
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="settings-device-sheet-overlay" />
            <DialogPrimitive.Content className="settings-device-sheet" aria-describedby={undefined}>
              <div className="settings-device-sheet-top-bar">
                <DialogPrimitive.Close
                  className="settings-device-sheet-close-btn"
                  aria-label="Close"
                >
                  <X size={16} />
                </DialogPrimitive.Close>
              </div>

              {selectedDevice && (
                <>
                  <div className="settings-device-sheet-hero">
                    <div className="settings-device-sheet-icon-box">
                      {selectedDevice.type === "mobile" ? (
                        <Smartphone size={32} color="#ffffff" aria-hidden="true" />
                      ) : (
                        <Laptop size={32} color="#ffffff" aria-hidden="true" />
                      )}
                    </div>
                    <DialogPrimitive.Title className="settings-device-sheet-title">
                      {selectedDevice.name}
                    </DialogPrimitive.Title>
                    <p className="settings-device-sheet-subtitle">
                      {selectedDevice.isCurrent
                        ? "Current session"
                        : selectedDevice.signedInAt.split(",")[0] || selectedDevice.signedInAt}
                    </p>
                  </div>

                  <div className="settings-device-sheet-card">
                    <div className="settings-device-sheet-row">
                      <span className="settings-device-sheet-label">Location</span>
                      <span className="settings-device-sheet-val">{selectedDevice.location}</span>
                    </div>
                    <div className="settings-device-sheet-divider" />
                    <div className="settings-device-sheet-row">
                      <span className="settings-device-sheet-label">Signed in</span>
                      <span className="settings-device-sheet-val">{selectedDevice.signedInAt}</span>
                    </div>
                    <div className="settings-device-sheet-divider" />
                    <div className="settings-device-sheet-row">
                      <span className="settings-device-sheet-label">Last active</span>
                      <span className="settings-device-sheet-val">
                        {selectedDevice.isCurrent ? "Active now" : selectedDevice.lastActiveAt}
                      </span>
                    </div>
                  </div>

                  <p className="settings-device-sheet-disclaimer">
                    This location estimate is based on the IP address and may not always be
                    accurate.
                  </p>

                  <div className="settings-device-sheet-actions">
                    <button
                      type="button"
                      className="settings-device-sheet-terminate-btn"
                      onClick={() => {
                        handleLogoutDevice(selectedDevice.id);
                        setSelectedDevice(null);
                      }}
                    >
                      Terminate Session
                    </button>
                  </div>
                </>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    );
  }

  /* --- Main Security View --- */
  return (
    <div className="settings-section-container">
      <SettingsSection title="Security" hideTitleOnMobile className="settings-security-section">
        <div className="settings-security-card">
          {/* Row 1: Password */}
          <SettingsRow
            title="Password"
            description="Manage your account password."
            mobileTitle="Change password"
            mobileDescription={null}
          >
            {/* Desktop action button */}
            <div className="settings-copy-desktop">
              <Button
                variant="secondary"
                leadingIcon={<LockKeyhole size={15} />}
                trailingIcon={null}
                onClick={() => {
                  setPasswordError(null);
                  setDesktopModal("change-password");
                }}
              >
                Change password
              </Button>
            </div>
            {/* Mobile row trigger button */}
            <button
              type="button"
              className="settings-mobile-row-trigger settings-copy-mobile"
              onClick={() => {
                setPasswordError(null);
                setSubpage("change-password");
              }}
              aria-label="Change password"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </SettingsRow>

          {/* Row 2 (Mobile only): Manage devices */}
          <div className="settings-copy-mobile">
            <SettingsRow
              title="Manage devices"
              description="Review where you use PansGPT."
              mobileTitle="Manage devices"
              mobileDescription={null}
            >
              <button
                type="button"
                className="settings-mobile-row-trigger settings-copy-mobile"
                onClick={() => setSubpage("manage-devices")}
                aria-label="Manage devices"
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </SettingsRow>
          </div>
        </div>
      </SettingsSection>

      {/* Desktop only: Inline "Manage devices" table matching reference image */}
      <div className="settings-copy-desktop settings-devices-section">
        <div className="settings-devices-header">
          <h3 className="settings-devices-title">Manage devices</h3>
          <Button
            variant="secondary"
            onClick={handleLogoutAll}
            disabled={devices.filter((d) => !d.isCurrent).length === 0}
            className="settings-devices-logout-all-btn"
            leadingIcon={null}
            trailingIcon={null}
          >
            Log out of all devices
          </Button>
        </div>
        <div className="settings-devices-table-wrap">
          <table className="settings-devices-table">
            <thead>
              <tr>
                <th scope="col" style={{ width: "32%" }}>
                  Device
                </th>
                <th scope="col" style={{ width: "22%" }}>
                  Location
                </th>
                <th scope="col" style={{ width: "23%" }}>
                  Signed in
                </th>
                <th scope="col" style={{ width: "23%" }}>
                  Last active
                </th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.id} className="settings-devices-row">
                  <td className="settings-devices-cell-device">
                    <div className="settings-devices-name-wrap">
                      <span className="settings-devices-name">{dev.name}</span>
                      {dev.isCurrent && (
                        <span className="settings-devices-current-badge">Current</span>
                      )}
                    </div>
                  </td>
                  <td className="settings-devices-cell-muted">{dev.location}</td>
                  <td className="settings-devices-cell-muted">{dev.signedInAt}</td>
                  <td className="settings-devices-cell-muted">
                    <div className="settings-devices-last-active-wrap">
                      <span>{dev.lastActiveAt}</span>
                      {!dev.isCurrent && (
                        <button
                          type="button"
                          className="settings-devices-row-action"
                          onClick={() => handleLogoutDevice(dev.id)}
                          aria-label={`Log out ${dev.name}`}
                          title="Log out of this device"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Desktop Modal: Change password */}
      {desktopModal === "change-password" && (
        <>
          <div className="settings-overlay" onClick={() => setDesktopModal("none")} />
          <div
            className="settings-edit-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="security-password-dialog-title"
          >
            <div className="settings-edit-dialog-header">
              <h3 id="security-password-dialog-title" className="settings-edit-dialog-title">
                Change password
              </h3>
              <button
                type="button"
                className="settings-edit-dialog-close"
                onClick={() => setDesktopModal("none")}
                aria-label="Close dialog"
              >
                <X size={16} />
              </button>
            </div>
            <div className="settings-edit-dialog-body">
              {passwordError && <p className="settings-edit-dialog-error">{passwordError}</p>}
              <div className="settings-edit-field">
                <label className="settings-edit-field-label" htmlFor="desktop-new-password">
                  New password
                </label>
                <input
                  id="desktop-new-password"
                  type="password"
                  className="settings-edit-input"
                  aria-label="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Enter new password"
                  autoFocus
                />
              </div>
              <div className="settings-edit-field">
                <label className="settings-edit-field-label" htmlFor="desktop-confirm-password">
                  Confirm password
                </label>
                <input
                  id="desktop-confirm-password"
                  type="password"
                  className="settings-edit-input"
                  aria-label="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Confirm new password"
                />
              </div>
            </div>
            <div className="settings-edit-dialog-actions">
              <Button
                variant="secondary"
                onClick={() => setDesktopModal("none")}
                leadingIcon={null}
                trailingIcon={null}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                onClick={handleUpdatePassword}
                leadingIcon={null}
                trailingIcon={null}
              >
                Update password
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
