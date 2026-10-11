"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { Button } from "./button";
import { ProgressBar } from "./progress";
import type { AlertAction } from "./alert";
import {
  NotificationAsset,
  notificationAssetUrl,
  type NotificationAssetName,
} from "./notification-assets";

export const notificationTypes = [
  "primary-icon",
  "image",
  "avatar",
  "gray-icon",
  "error-icon",
  "warning-icon",
  "success-icon",
  "no-icon",
  "progress",
] as const;
export type NotificationType = (typeof notificationTypes)[number];
export type NotificationProps = Omit<ComponentProps<"div">, "title" | "children" | "role"> & {
  title: ReactNode;
  description?: ReactNode;
  type?: NotificationType;
  breakpoint?: "auto" | "desktop" | "mobile";
  action?: AlertAction;
  secondaryAction?: AlertAction;
  showActions?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
  avatarSrc?: string;
  avatarLabel?: string;
  avatarOnline?: boolean;
  timeLabel?: ReactNode;
  progress?: number;
  progressLabel?: (value: number) => string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  announcement?: "polite" | "assertive" | "off";
};
const icons: Partial<Record<NotificationType, NotificationAssetName>> = {
  "primary-icon": "imgInfoCircle",
  "gray-icon": "imgCodepen",
  "error-icon": "imgAlertCircle1",
  "warning-icon": "imgAlertCircle",
  "success-icon": "imgCheckCircle",
  progress: "imgUploadCloud02",
};

export function Notification({
  title,
  description,
  type = "image",
  breakpoint = "auto",
  action,
  secondaryAction,
  showActions = true,
  showClose = true,
  closeLabel = "Close notification",
  imageSrc = notificationAssetUrl("imgImageWrap"),
  imageAlt = "",
  avatarSrc = notificationAssetUrl("imgAvatar"),
  avatarLabel = "Notification sender",
  avatarOnline = true,
  timeLabel,
  progress = 0,
  progressLabel = (value) => `${value}% uploaded...`,
  open: controlledOpen,
  defaultOpen = true,
  onOpenChange,
  announcement = type === "error-icon" ? "assertive" : "polite",
  className,
  ...props
}: NotificationProps): React.ReactElement | null {
  const [localOpen, setLocalOpen] = useState(defaultOpen);
  const titleId = useId();
  const descriptionId = useId();
  const open = controlledOpen ?? localOpen;
  const dismiss = (): void => {
    if (controlledOpen === undefined) setLocalOpen(false);
    onOpenChange?.(false);
  };
  if (!open) return null;
  const icon = icons[type];
  const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(progress, 100)) : 0;
  return (
    <div
      {...props}
      className={cn("p-notification", className)}
      data-type={type}
      data-breakpoint={breakpoint}
      role={
        announcement === "assertive" ? "alert" : announcement === "polite" ? "status" : undefined
      }
      aria-live={announcement === "off" ? "off" : undefined}
      aria-atomic={announcement === "off" ? undefined : true}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
    >
      {type === "image" && (
        <div className="p-notification-media">
          <img src={imageSrc} alt={imageAlt} />
        </div>
      )}
      {type === "avatar" && (
        <Avatar
          size="md"
          src={avatarSrc}
          label={avatarLabel}
          status={avatarOnline ? "online" : "none"}
        />
      )}
      {icon && (
        <span className="p-notification-icon" aria-hidden="true">
          <NotificationAsset name={icon} />
        </span>
      )}
      <div className="p-notification-body">
        <div className="p-notification-text">
          <div className="p-notification-title-row">
            <div className="p-notification-title" id={titleId}>
              {title}
            </div>
            {timeLabel && <span className="p-notification-time">{timeLabel}</span>}
          </div>
          {description && (
            <div className="p-notification-description" id={descriptionId}>
              {description}
            </div>
          )}
        </div>
        {type === "progress" && (
          <div className="p-notification-progress">
            <ProgressBar value={safeProgress} aria-label="Upload progress" />
            <span>{progressLabel(safeProgress)}</span>
          </div>
        )}
        {showActions && (action || secondaryAction) && (
          <div className="p-notification-actions">
            {secondaryAction && (
              <Button
                variant="link-gray"
                leadingIcon={null}
                trailingIcon={null}
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Button>
            )}
            {action && (
              <Button
                variant="link-color"
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
      {showClose && (
        <button
          type="button"
          className="p-notification-close"
          onClick={dismiss}
          aria-label={closeLabel}
        >
          <NotificationAsset name="imgXClose" />
        </button>
      )}
    </div>
  );
}
