"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { AlertAsset, type AlertAssetName } from "./alert-assets";

export const alertColors = ["default", "brand", "gray", "error", "warning", "success"] as const;
export type AlertColor = (typeof alertColors)[number];
export interface AlertAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}
export type AlertProps = Omit<ComponentProps<"div">, "title" | "children" | "role"> & {
  title: ReactNode;
  description?: ReactNode;
  color?: AlertColor;
  layout?: "floating" | "full-width";
  breakpoint?: "auto" | "desktop" | "mobile";
  action?: AlertAction;
  dismissLabel?: string;
  closeLabel?: string;
  dismissible?: boolean;
  showClose?: boolean;
  showActions?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  announcement?: "polite" | "assertive" | "off";
};
const icons: Record<AlertColor, AlertAssetName> = {
  default: "imgInfoCircle2",
  brand: "imgInfoCircle",
  gray: "imgInfoCircle1",
  error: "imgAlertCircle",
  warning: "imgAlertCircle1",
  success: "imgCheckCircle",
};

export function Alert({
  title,
  description,
  color = "default",
  layout = "floating",
  breakpoint = "auto",
  action,
  dismissLabel = "Dismiss",
  closeLabel = "Close alert",
  dismissible = true,
  showClose = true,
  showActions = true,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  announcement = color === "error" ? "assertive" : "polite",
  className,
  ...props
}: AlertProps): React.ReactElement | null {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const titleId = useId();
  const descriptionId = useId();
  const open = controlledOpen ?? localOpen;
  const prominent = layout === "full-width" && ["default", "brand", "gray"].includes(color);
  const dismiss = (): void => {
    if (controlledOpen === undefined) setLocalOpen(false);
    onOpenChange?.(false);
  };
  if (!open) return null;
  const icon =
    layout === "full-width" && color === "warning"
      ? "imgAlertCircle2"
      : layout === "full-width" && color === "success"
        ? "imgCheckCircle1"
        : icons[color];
  return (
    <div
      {...props}
      className={cn("p-alert", className)}
      data-color={color}
      data-layout={layout}
      data-breakpoint={breakpoint}
      data-prominent={prominent || undefined}
      role={
        announcement === "assertive" ? "alert" : announcement === "polite" ? "status" : undefined
      }
      aria-live={announcement === "off" ? "off" : undefined}
      aria-atomic={announcement === "off" ? undefined : true}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      <div className="p-alert-inner">
        <span className="p-alert-icon" aria-hidden="true">
          <AlertAsset name={icon} />
        </span>
        <div className="p-alert-body">
          <div className="p-alert-text">
            <div className="p-alert-title" id={titleId}>
              {title}
            </div>
            {description && (
              <div className="p-alert-description" id={descriptionId}>
                {description}
              </div>
            )}
          </div>
          {showActions && (action || dismissible) && (
            <div className="p-alert-actions">
              {dismissible && (
                <Button
                  className="p-alert-dismiss"
                  size="md"
                  variant={prominent ? "secondary" : "link-gray"}
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={dismiss}
                >
                  {dismissLabel}
                </Button>
              )}
              {action && (
                <Button
                  className="p-alert-primary-action"
                  size="md"
                  variant={prominent ? "primary" : "link-color"}
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              )}
            </div>
          )}
        </div>
        {dismissible && showClose && (
          <button className="p-alert-close" type="button" onClick={dismiss} aria-label={closeLabel}>
            <AlertAsset
              name={
                layout === "full-width" && breakpoint === "desktop" ? "imgXClose" : "imgXClose1"
              }
            />
          </button>
        )}
      </div>
    </div>
  );
}
