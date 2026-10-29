"use client";

import type { ReactNode } from "react";

export function SettingsSection({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <section className={`settings-section ${className}`}>
      {(title || description || action) && (
        <div className="settings-section-header">
          <div className="settings-section-title-row">
            {title && <h3 className="settings-section-title">{title}</h3>}
            {action && <div className="settings-section-action">{action}</div>}
          </div>
          {description && <p className="settings-section-description">{description}</p>}
        </div>
      )}
      {children && <div className="settings-section-content">{children}</div>}
    </section>
  );
}
