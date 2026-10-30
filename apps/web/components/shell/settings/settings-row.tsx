"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@pansgpt/ui/shell";

export interface SettingsRowProps {
  title: string;
  description?: string;
  mobileTitle?: string;
  mobileDescription?: string | null;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  chevron?: boolean;
  className?: string;
}

export function SettingsRow({
  title,
  description,
  mobileTitle,
  mobileDescription,
  icon,
  children,
  onClick,
  disabled = false,
  destructive = false,
  chevron = false,
  className = "",
}: SettingsRowProps): React.ReactElement {
  const isInteractive = typeof onClick === "function" && !children;

  const content = (
    <>
      <div className="settings-row-left">
        {icon && (
          <span className="settings-row-icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="settings-row-meta">
          <span className={`settings-row-title${destructive ? " settings-row-destructive" : ""}`}>
            {mobileTitle ? (
              <>
                <span className="settings-copy-desktop">{title}</span>
                <span className="settings-copy-mobile">{mobileTitle}</span>
              </>
            ) : (
              title
            )}
          </span>
          {description && (
            <p
              className={`settings-row-description${mobileDescription !== undefined ? " settings-copy-desktop" : ""}`}
            >
              {description}
            </p>
          )}
          {mobileDescription && (
            <p className="settings-row-description settings-copy-mobile">{mobileDescription}</p>
          )}
        </div>
      </div>
      <div className="settings-row-right">
        {children}
        {chevron && <ChevronRight size={18} className="settings-row-chevron" aria-hidden="true" />}
      </div>
    </>
  );

  if (isInteractive) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`settings-row settings-row-button ${className}`}
        data-settings-label={title}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`settings-row ${className}`} data-settings-label={title} tabIndex={-1}>
      {content}
    </div>
  );
}

/** Compact action labels on desktop, a single named chevron action on mobile. */
export function SettingsActionButton({
  children,
  onClick,
  disabled = false,
  destructive = false,
  expanded,
  icon,
}: {
  children: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  expanded?: boolean;
  icon?: ReactNode;
}): React.ReactElement {
  return (
    <Button
      className="settings-row-action"
      variant="secondary"
      leadingIcon={icon ?? null}
      trailingIcon={null}
      aria-label={children}
      aria-expanded={expanded}
      onClick={onClick}
      disabled={disabled}
      destructive={destructive}
    >
      <span className="settings-copy-desktop">{children}</span>
      <ChevronRight size={16} className="settings-copy-mobile" aria-hidden="true" />
    </Button>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  "aria-label"?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="settings-switch"
    >
      <span className="settings-switch-thumb" />
    </button>
  );
}
