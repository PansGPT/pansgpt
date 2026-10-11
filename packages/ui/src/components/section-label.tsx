"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { HelpIcon } from "./tooltip";

export type SectionLabelProps = Omit<ComponentProps<"div">, "children"> & {
  label: ReactNode;
  size?: "sm" | "md";
  htmlFor?: string;
  required?: boolean;
  supportingText?: ReactNode;
  supportingTextId?: string;
  help?: ReactNode;
  helpLabel?: string;
  actions?: ReactNode;
};

/** A field-section label. Callers own input validation and action handlers. */
export function SectionLabel({
  label,
  size = "sm",
  htmlFor,
  required = false,
  supportingText,
  supportingTextId,
  help,
  helpLabel = "More information",
  actions,
  className,
  ...props
}: SectionLabelProps): React.ReactElement {
  const text = (
    <>
      {label}
      {required && (
        <>
          <span className="p-section-label-required" aria-hidden="true">
            *
          </span>
          <span className="p-section-label-sr"> (required)</span>
        </>
      )}
    </>
  );
  return (
    <div {...props} className={cn("p-section-label", className)} data-size={size}>
      <div className="p-section-label-copy">
        <div className="p-section-label-title-row">
          {htmlFor ? (
            <label className="p-section-label-title" htmlFor={htmlFor}>
              {text}
            </label>
          ) : (
            <span className="p-section-label-title">{text}</span>
          )}
          {help != null && <HelpIcon content={help} label={helpLabel} />}
        </div>
        {supportingText != null && (
          <p id={supportingTextId} className="p-section-label-supporting">
            {supportingText}
          </p>
        )}
      </div>
      {actions != null && <div className="p-section-label-actions">{actions}</div>}
    </div>
  );
}
