"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export interface SettingsRowProps {
  title: string;
  description?: string;
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
            {title}
          </span>
          {description && <p className="settings-row-description">{description}</p>}
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
      >
        {content}
      </button>
    );
  }

  return <div className={`settings-row ${className}`}>{content}</div>;
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
