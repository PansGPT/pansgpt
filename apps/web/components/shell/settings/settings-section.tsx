"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  mobileDescription,
  action,
  children,
  className = "",
  hideTitleOnMobile = false,
}: {
  title?: string;
  description?: string;
  mobileDescription?: string | null;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  hideTitleOnMobile?: boolean;
}): React.ReactElement {
  return (
    <section className={`settings-section ${className}`} data-settings-label={title} tabIndex={-1}>
      {(title || description || action) && (
        <div
          className={`settings-section-header${hideTitleOnMobile && (mobileDescription === null || (!description && !mobileDescription)) && !action ? " settings-mobile-redundant-title" : ""}`}
        >
          <div
            className={`settings-section-title-row${hideTitleOnMobile ? " settings-mobile-redundant-title" : ""}`}
          >
            {title && <h3 className="settings-section-title">{title}</h3>}
            {action && <div className="settings-section-action">{action}</div>}
          </div>
          {description && (
            <p
              className={`settings-section-description${mobileDescription !== undefined ? " settings-copy-desktop" : ""}`}
            >
              {description}
            </p>
          )}
          {mobileDescription && (
            <p className="settings-section-description settings-copy-mobile">{mobileDescription}</p>
          )}
        </div>
      )}
      {children && <div className="settings-section-content">{children}</div>}
    </section>
  );
}
