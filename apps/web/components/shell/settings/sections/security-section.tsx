"use client";

import { useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Laptop,
  Smartphone,
  LogOut,
  Info,
  LockKeyhole,
} from "lucide-react";
import { Button, DialogPrimitive } from "@pansgpt/ui/shell";
import { useAuth } from "@/lib/auth-context";
import type { AccountSession } from "@pansgpt/types";
import { useAccountSecurity } from "../use-account-security";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

type SecurityControls = ReturnType<typeof useAccountSecurity>;
function date(value: string | null): string {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString()
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
      {controls.passwordNotice && <p role="status">{controls.passwordNotice}</p>}
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
  return <SecurityAccount key={session?.user.id ?? "signed-out"} token={session?.access_token} />;
}

function SecurityAccount({ token }: { token: string | undefined }): React.ReactElement {
  const controls = useAccountSecurity(token);
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
      {controls.loading && <p role="status">Loading devices…</p>}
      {controls.sessionError && (
        <div>
          <p role="alert">{controls.sessionError}</p>
          <Button
            variant="secondary"
            leadingIcon={null}
            trailingIcon={null}
            onClick={controls.reload}
            disabled={controls.revoking}
            aria-label="Retry devices"
          >
            Retry
          </Button>
        </div>
      )}
      {controls.hasMore && <p>Only your first 100 sessions are shown.</p>}
      {!controls.loading && !controls.sessionError && !controls.sessions.length && (
        <p>No active sessions found.</p>
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
        (!controls.hasMore && !controls.sessions.some((row) => !row.is_current))
      }
      className="settings-devices-logout-all-btn"
      leadingIcon={null}
      trailingIcon={null}
    >
      {controls.revoking ? "Logging out…" : "Log out other devices"}
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
          {controls.notice && <p role="status">{controls.notice}</p>}
          <p className="settings-mobile-devices-description">
            Review the devices signed in to your account. Logging out other devices keeps this
            session signed in.
          </p>
          {status}
          {logoutOthers}
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
                    <Smartphone size={22} aria-hidden="true" />
                  ) : (
                    <Laptop size={22} aria-hidden="true" />
                  )}
                </div>
                <div className="settings-mobile-linked-device-info">
                  <span className="settings-mobile-linked-device-name">{device.device}</span>
                  <span className="settings-mobile-linked-device-meta">
                    {device.is_current
                      ? "Current session"
                      : `Last active ${date(device.last_active_at)}`}
                  </span>
                </div>
                <ChevronRight size={18} aria-hidden="true" />
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
                        : date(selectedDevice.created_at)}
                    </p>
                  </div>
                  <div className="settings-device-sheet-card">
                    {[
                      ["IP address", selectedDevice.ip_address ?? "Not available"],
                      ["Signed in", date(selectedDevice.created_at)],
                      ["Last active", date(selectedDevice.last_active_at)],
                    ].map(([label, value]) => (
                      <div key={label} className="settings-device-sheet-row">
                        <span className="settings-device-sheet-label">{label}</span>
                        <span className="settings-device-sheet-val">{value}</span>
                      </div>
                    ))}
                  </div>
                  <p className="settings-device-sheet-disclaimer">
                    {selectedDevice.is_current
                      ? "Use Log out from your account menu to end this session."
                      : "This device will need to sign in again. It may take a short time to show the sign-in screen."}
                  </p>
                  {controls.sessionError && <p role="alert">{controls.sessionError}</p>}
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
                      {controls.revoking ? "Logging out…" : "Log out device"}
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
      {controls.notice && <p role="status">{controls.notice}</p>}
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
          <div>
            <h3 className="settings-devices-title">Manage devices</h3>
            <p className="settings-devices-description">
              Review where you use PansGPT. This session stays signed in.
            </p>
          </div>
          {logoutOthers}
        </div>
        {status}
        <div className="settings-devices-table-wrap">
          <table className="settings-devices-table">
            <thead>
              <tr>
                <th scope="col">Device</th>
                <th scope="col">IP address</th>
                <th scope="col">Signed in</th>
                <th scope="col">Last active</th>
              </tr>
            </thead>
            <tbody>
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
                  <td className="settings-devices-cell-muted">
                    {device.ip_address ?? "Not available"}
                  </td>
                  <td className="settings-devices-cell-muted">{date(device.created_at)}</td>
                  <td className="settings-devices-cell-muted">
                    <div className="settings-devices-last-active-wrap">
                      <span>{date(device.last_active_at)}</span>
                      {!device.is_current && (
                        <button
                          type="button"
                          className="settings-devices-row-action"
                          disabled={controls.revoking}
                          onClick={() => void controls.revoke(device.id)}
                          aria-label={`Log out ${device.device}`}
                          title="Log out of this device"
                        >
                          <LogOut size={15} />
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
