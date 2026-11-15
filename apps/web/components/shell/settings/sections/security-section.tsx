"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Laptop,
  Smartphone,
  MoreHorizontal,
  Info,
  LockKeyhole,
  LoaderCircle,
  AlertCircle,
  RotateCw,
} from "lucide-react";
import {
  Button,
  DialogPrimitive,
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  Toaster,
  toast,
} from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import type { AccountSession } from "@pansgpt/types";
import { useAccountSecurity } from "../use-account-security";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

type SecurityControls = ReturnType<typeof useAccountSecurity>;
function DeviceLoading(): React.ReactElement {
  return (
    <div className="settings-device-loading" role="status" aria-label="Loading devices">
      <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
    </div>
  );
}
function date(value: string | null): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Not available";
}

function PasswordFields({
  controls,
  mobile,
  onSaved,
}: {
  controls: SecurityControls;
  mobile: boolean;
  onSaved: () => void;
}): React.ReactElement {
  const prefix = mobile ? "mobile" : "desktop";
  const fieldClass = mobile ? "settings-subpage-input-card" : "settings-edit-field";
  const labelClass = mobile ? "settings-subpage-input-label" : "settings-edit-field-label";
  const inputClass = mobile ? "settings-subpage-input" : "settings-edit-input";
  return (
    <form
      className="settings-password-form"
      id={`settings-password-${prefix}`}
      onSubmit={(event) => {
        event.preventDefault();
        void controls.savePassword().then((saved) => {
          if (saved) onSaved();
        });
      }}
    >
      {controls.passwordError && (
        <p role="alert" className="settings-edit-dialog-error">
          {controls.passwordError}
        </p>
      )}
      {controls.passwordNotice && (
        <p className="settings-field-feedback" role="status">
          {controls.passwordNotice}
        </p>
      )}
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`${prefix}-current-password`}>
          Current password{controls.currentRequired ? "" : " (if set)"}
        </label>
        <input
          id={`${prefix}-current-password`}
          className={inputClass}
          type="password"
          autoComplete="current-password"
          value={controls.currentPassword}
          onChange={(event) => controls.setCurrentPassword(event.target.value)}
          maxLength={128}
          disabled={controls.saving}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`${prefix}-new-password`}>
          New password
        </label>
        <input
          id={`${prefix}-new-password`}
          className={inputClass}
          type="password"
          autoComplete="new-password"
          value={controls.password}
          onChange={(event) => controls.setPassword(event.target.value)}
          minLength={8}
          maxLength={128}
          required
          disabled={controls.saving}
        />
      </div>
      <div className={fieldClass}>
        <label className={labelClass} htmlFor={`${prefix}-confirm-password`}>
          Confirm password
        </label>
        <input
          id={`${prefix}-confirm-password`}
          className={inputClass}
          type="password"
          autoComplete="new-password"
          value={controls.confirmPassword}
          onChange={(event) => controls.setConfirmPassword(event.target.value)}
          maxLength={128}
          required
          disabled={controls.saving}
        />
      </div>
      {controls.confirmationRequired && (
        <div className={fieldClass}>
          <label className={labelClass} htmlFor={`${prefix}-password-code`}>
            Confirmation code
          </label>
          <input
            id={`${prefix}-password-code`}
            className={inputClass}
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6,10}"
            maxLength={10}
            value={controls.nonce}
            onChange={(event) => controls.setNonce(event.target.value)}
            disabled={controls.saving}
          />
          <Button
            type="button"
            variant="secondary"
            leadingIcon={null}
            trailingIcon={null}
            disabled={controls.sending || controls.saving}
            onClick={() => void controls.sendConfirmation()}
          >
            {controls.sending ? "Sending…" : "Send confirmation code"}
          </Button>
        </div>
      )}
    </form>
  );
}

export function SecuritySection(): React.ReactElement {
  const { session } = useAuth();
  return (
    <>
      <Toaster
        className="settings-toaster"
        position="bottom-right"
        duration={3000}
        closeButton={false}
        visibleToasts={1}
        icons={{ success: null, error: null }}
        style={{ zIndex: 110 }}
      />
      <SecurityAccount key={session?.user.id ?? "signed-out"} token={session?.access_token} />
    </>
  );
}

function SecurityAccount({ token }: { token: string | undefined }): React.ReactElement {
  const controls = useAccountSecurity(token);
  const { signOut } = useAuth();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const loggingOutRef = useRef(false);
  const alive = useRef(true);
  const logoutToasts = useRef(new Set<string | number>());
  useEffect(() => {
    alive.current = true;
    const owned = logoutToasts.current;
    return () => {
      alive.current = false;
      for (const id of owned) toast.dismiss(id);
    };
  }, []);
  async function logoutCurrent(): Promise<void> {
    if (loggingOutRef.current) return;
    loggingOutRef.current = true;
    setLoggingOut(true);
    try {
      await signOut("local");
      if (alive.current) {
        router.replace("/login");
        router.refresh();
      }
    } catch {
      if (alive.current)
        logoutToasts.current.add(toast.error("Couldn't log out. Please try again."));
    } finally {
      loggingOutRef.current = false;
      if (alive.current) setLoggingOut(false);
    }
  }
  const [subpage, setSubpage] = useState<"none" | "change-password" | "manage-devices">("none");
  const [desktopPassword, setDesktopPassword] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<AccountSession | null>(null);
  const passwordOpener = useRef<HTMLButtonElement | null>(null);
  const passwordDisabled =
    controls.saving ||
    controls.sending ||
    !controls.password ||
    controls.password !== controls.confirmPassword;
  const closePassword = (): void => {
    controls.clearPassword();
    setDesktopPassword(false);
    setSubpage("none");
  };
  const status = (
    <>
      {controls.sessionError && (
        <div className="settings-inline-error" role="alert">
          <AlertCircle size={16} aria-hidden="true" />
          <span>{controls.sessionError}</span>
          <button
            type="button"
            className="settings-notice-retry"
            onClick={controls.reload}
            disabled={controls.revoking}
            aria-label="Retry devices"
          >
            <RotateCw size={15} aria-hidden="true" />
          </button>
        </div>
      )}
      {controls.hasMore && (
        <p className="settings-device-note">Only your first 100 sessions are shown.</p>
      )}
      {!controls.loading && !controls.sessionError && !controls.sessions.length && (
        <p className="settings-device-note">No active sessions found.</p>
      )}
    </>
  );
  const logoutOthers = (
    <Button
      variant="secondary"
      onClick={() => void controls.revoke()}
      disabled={
        controls.loading ||
        controls.revoking ||
        loggingOut ||
        (!controls.hasMore && !controls.sessions.some((row) => !row.is_current))
      }
      className="settings-devices-logout-all-btn"
      leadingIcon={
        controls.revoking ? (
          <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
        ) : null
      }
      trailingIcon={null}
    >
      Log out other devices
    </Button>
  );
  if (subpage === "change-password")
    return (
      <div className="settings-mobile-subpage">
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            aria-label="Back"
            disabled={controls.saving || controls.sending}
            onClick={closePassword}
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="settings-subpage-title">Change password</h2>
          <button
            type="submit"
            form="settings-password-mobile"
            className="settings-subpage-save-btn"
            disabled={passwordDisabled}
          >
            {controls.saving ? "Saving…" : "Save"}
          </button>
        </div>
        <div className="settings-subpage-body">
          <div className="settings-subpage-info-card">
            <Info size={16} className="settings-subpage-info-icon" aria-hidden="true" />
            <p className="settings-subpage-info-text">
              Use at least 8 characters. You may need to confirm your account before saving.
            </p>
          </div>
          <PasswordFields controls={controls} mobile onSaved={closePassword} />
        </div>
      </div>
    );
  if (subpage === "manage-devices")
    return (
      <div className="settings-mobile-subpage">
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            aria-label="Back"
            onClick={() => {
              setSelectedDevice(null);
              setSubpage("none");
            }}
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
          {status}
          {controls.loading && <DeviceLoading />}
          <h3 className="settings-mobile-linked-devices-title">Linked devices</h3>
          <div className="settings-mobile-linked-device-list">
            {controls.sessions.map((device) => (
              <button
                key={device.id}
                type="button"
                className="settings-mobile-linked-device-card"
                onClick={() => setSelectedDevice(device)}
                aria-label={`View details for ${device.device}`}
              >
                <div className="settings-mobile-linked-device-icon-wrap">
                  {device.device_type === "mobile" ? (
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
                  <span className="settings-mobile-linked-device-name">{device.device}</span>
                  <span className="settings-mobile-linked-device-meta">
                    {device.is_current
                      ? "Active now"
                      : `Last active ${date(device.last_active_at)}`}
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
          onOpenChange={(open) => {
            if (!open && !controls.revoking) setSelectedDevice(null);
          }}
        >
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="settings-device-sheet-overlay" />
            <DialogPrimitive.Content
              className="settings-device-sheet"
              aria-describedby={undefined}
              onEscapeKeyDown={(event) => {
                if (controls.revoking) event.preventDefault();
              }}
            >
              <div className="settings-device-sheet-top-bar">
                <DialogPrimitive.Close
                  className="settings-device-sheet-close-btn"
                  aria-label="Close"
                  disabled={controls.revoking}
                >
                  <X size={16} />
                </DialogPrimitive.Close>
              </div>
              {selectedDevice && (
                <>
                  <div className="settings-device-sheet-hero">
                    <div className="settings-device-sheet-icon-box">
                      {selectedDevice.device_type === "mobile" ? (
                        <Smartphone size={32} aria-hidden="true" />
                      ) : (
                        <Laptop size={32} aria-hidden="true" />
                      )}
                    </div>
                    <DialogPrimitive.Title className="settings-device-sheet-title">
                      {selectedDevice.device}
                    </DialogPrimitive.Title>
                    <p className="settings-device-sheet-subtitle">
                      {selectedDevice.is_current
                        ? "Current session"
                        : date(selectedDevice.created_at).split(",")[0]}
                    </p>
                  </div>
                  <div className="settings-device-sheet-card">
                    {[
                      ["Location", "Not available"],
                      ["Signed in", date(selectedDevice.created_at)],
                      [
                        "Last active",
                        selectedDevice.is_current
                          ? "Active now"
                          : date(selectedDevice.last_active_at),
                      ],
                    ].map(([label, value], index) => (
                      <div key={label}>
                        {index > 0 && <div className="settings-device-sheet-divider" />}
                        <div className="settings-device-sheet-row">
                          <span className="settings-device-sheet-label">{label}</span>
                          <span
                            className="settings-device-sheet-val"
                            title={
                              label === "Location" && selectedDevice.ip_address
                                ? `IP address: ${selectedDevice.ip_address}`
                                : undefined
                            }
                          >
                            {value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="settings-device-sheet-disclaimer">
                    {selectedDevice.is_current
                      ? "Use Log out from your account menu to end this session."
                      : "This device will need to sign in again. It may take a short time to show the sign-in screen."}
                  </p>
                  <div className="settings-device-sheet-actions">
                    <button
                      type="button"
                      className="settings-device-sheet-terminate-btn"
                      disabled={selectedDevice.is_current || controls.revoking}
                      onClick={() => {
                        void controls.revoke(selectedDevice.id).then((success) => {
                          if (success) setSelectedDevice(null);
                        });
                      }}
                    >
                      {controls.revoking ? "Logging out…" : "Terminate Session"}
                    </button>
                  </div>
                </>
              )}
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
      </div>
    );
  return (
    <div className="settings-section-container">
      <SettingsSection title="Security" hideTitleOnMobile className="settings-security-section">
        <div className="settings-security-card">
          <SettingsRow
            title="Password"
            mobileTitle="Change password"
            description="Manage your account password."
            mobileDescription={null}
          >
            <div className="settings-copy-desktop">
              <Button
                variant="secondary"
                leadingIcon={<LockKeyhole size={15} />}
                trailingIcon={null}
                onClick={(event) => {
                  passwordOpener.current = event.currentTarget;
                  controls.clearPassword();
                  setDesktopPassword(true);
                }}
              >
                Change password
              </Button>
            </div>
            <button
              type="button"
              className="settings-mobile-row-trigger settings-copy-mobile"
              aria-label="Change password"
              onClick={(event) => {
                passwordOpener.current = event.currentTarget;
                controls.clearPassword();
                setSubpage("change-password");
              }}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </SettingsRow>
          <div className="settings-copy-mobile">
            <SettingsRow
              title="Manage devices"
              description="Review where you use PansGPT."
              mobileDescription={null}
            >
              <button
                type="button"
                className="settings-mobile-row-trigger settings-copy-mobile"
                aria-label="Manage devices"
                onClick={() => setSubpage("manage-devices")}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </SettingsRow>
          </div>
        </div>
      </SettingsSection>
      <div className="settings-copy-desktop settings-devices-section">
        <div className="settings-devices-header">
          <h3 className="settings-devices-title">Manage devices</h3>
          {logoutOthers}
        </div>
        {status}
        <div className="settings-devices-table-wrap">
          <table className="settings-devices-table" aria-busy={controls.loading}>
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
              {controls.loading && (
                <tr>
                  <td colSpan={4}>
                    <DeviceLoading />
                  </td>
                </tr>
              )}
              {controls.sessions.map((device) => (
                <tr key={device.id} className="settings-devices-row">
                  <td className="settings-devices-cell-device">
                    <div className="settings-devices-name-wrap">
                      <span className="settings-devices-name">{device.device}</span>
                      {device.is_current && (
                        <span className="settings-devices-current-badge">Current</span>
                      )}
                    </div>
                  </td>
                  <td
                    className="settings-devices-cell-muted"
                    title={device.ip_address ? `IP address: ${device.ip_address}` : undefined}
                  >
                    Not available
                  </td>
                  <td className="settings-devices-cell-muted">{date(device.created_at)}</td>
                  <td className="settings-devices-cell-muted">
                    <div className="settings-devices-last-active-wrap">
                      <span>{device.is_current ? "Active now" : date(device.last_active_at)}</span>
                      <Dropdown>
                        <DropdownTrigger asChild>
                          <button
                            type="button"
                            className="settings-devices-row-action"
                            disabled={controls.revoking || loggingOut}
                            aria-label={`Session options for ${device.device}`}
                          >
                            <MoreHorizontal size={15} />
                          </button>
                        </DropdownTrigger>
                        <DropdownContent
                          className="settings-session-menu"
                          aria-label={`Session actions for ${device.device}`}
                          align="end"
                          sideOffset={5}
                        >
                          <DropdownItem
                            className="settings-session-menu-item"
                            disabled={controls.revoking || loggingOut}
                            onSelect={() => {
                              if (device.is_current) void logoutCurrent();
                              else void controls.revoke(device.id);
                            }}
                          >
                            {device.is_current ? "Log out" : "Terminate"}
                          </DropdownItem>
                        </DropdownContent>
                      </Dropdown>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <DialogPrimitive.Root
        open={desktopPassword}
        onOpenChange={(open) => {
          if (!open && !controls.saving && !controls.sending) closePassword();
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="settings-overlay" />
          <DialogPrimitive.Content
            className="settings-edit-dialog"
            aria-describedby={undefined}
            onEscapeKeyDown={(event) => {
              if (controls.saving || controls.sending) event.preventDefault();
            }}
            onCloseAutoFocus={(event) => {
              if (passwordOpener.current?.isConnected) {
                event.preventDefault();
                passwordOpener.current.focus();
              }
            }}
          >
            <div className="settings-edit-dialog-header">
              <DialogPrimitive.Title className="settings-edit-dialog-title">
                Change password
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="settings-edit-dialog-close"
                aria-label="Close dialog"
                disabled={controls.saving || controls.sending}
              >
                <X size={16} />
              </DialogPrimitive.Close>
            </div>
            <div className="settings-edit-dialog-body">
              <PasswordFields controls={controls} mobile={false} onSaved={closePassword} />
            </div>
            <div className="settings-edit-dialog-actions">
              <Button
                variant="secondary"
                leadingIcon={null}
                trailingIcon={null}
                disabled={controls.saving || controls.sending}
                onClick={closePassword}
              >
                Cancel
              </Button>
              <Button
                form="settings-password-desktop"
                type="submit"
                disabled={passwordDisabled}
                leadingIcon={null}
                trailingIcon={null}
              >
                {controls.saving ? "Updating…" : "Update password"}
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
