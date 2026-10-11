"use client";

import { type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { MessageAsset } from "./message-assets";
import { Tooltip, TooltipSurface } from "./tooltip";

export type MessageType =
  | "text"
  | "reply"
  | "file"
  | "audio"
  | "image"
  | "video"
  | "link-minimal"
  | "link-preview"
  | "writing";
export function MessageReaction({
  label,
  emoji,
  count,
  pressed = false,
  onPressedChange,
  className,
  onClick,
  ...props
}: ComponentProps<"button"> & {
  label: string;
  emoji?: ReactNode;
  count?: number;
  pressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
}): React.ReactElement {
  const total =
    count === undefined ? undefined : Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  return (
    <button
      {...props}
      type="button"
      className={cn("p-message-reaction", className)}
      aria-label={`${label}${total === undefined ? "" : `, ${total}`}`}
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) onPressedChange?.(!pressed);
      }}
    >
      {emoji ?? <MessageAsset className="p-message-emoji" name="primitive1_imgEmoji" />}
      {total !== undefined && <span>{total}</span>}
    </button>
  );
}
export function MessageActionButton({
  label,
  icon,
  referenceState,
  tooltip = true,
  className,
  ...props
}: ComponentProps<"button"> & {
  label: string;
  icon?: ReactNode;
  referenceState?: "default" | "hover";
  tooltip?: boolean;
}): React.ReactElement {
  const button = (
    <button
      {...props}
      type="button"
      className={cn("p-message-action-button", className)}
      aria-label={label}
      data-reference-state={referenceState}
    >
      {icon ?? (
        <MessageAsset
          name={
            referenceState === "hover" ? "primitive3_imgPlaceholder1" : "primitive3_imgPlaceholder"
          }
        />
      )}
      {referenceState === "hover" && (
        <MessageAsset className="p-message-action-cursor" name="primitive3_imgCursor" />
      )}
    </button>
  );
  return tooltip && !referenceState ? <Tooltip content={label}>{button}</Tooltip> : button;
}
export interface MessagePanelAction {
  id: string;
  label: string;
  icon: ReactNode;
  onAction: () => void;
  disabled?: boolean;
}
export function MessageActionPanel({
  actions,
  reference = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  actions: readonly MessagePanelAction[];
  reference?: boolean;
}): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-message-action-panel", className)}
      role="group"
      aria-label={props["aria-label"] ?? "Message actions"}
    >
      {actions.map((action, index) => (
        <MessageActionButton
          key={action.id}
          label={action.label}
          icon={action.icon}
          onClick={action.onAction}
          disabled={action.disabled}
          referenceState={reference && index === 1 ? "hover" : undefined}
          tooltip={!reference}
        />
      ))}
    </div>
  );
}
export type MessageDeliveryStatus = "unread" | "read" | "failed";
export function MessageStatusIcon({
  status,
  readAt,
  referenceState,
  className,
  ...props
}: ComponentProps<"span"> & {
  status: MessageDeliveryStatus;
  readAt?: string;
  referenceState?: "default" | "hover";
}): React.ReactElement {
  const label =
    status === "read"
      ? `Read${readAt ? ` ${readAt}` : ""}`
      : status === "failed"
        ? "Failed"
        : "Unread";
  const glyph =
    referenceState === "hover"
      ? status === "read"
        ? "primitive5_imgVector"
        : status === "failed"
          ? "primitive5_imgIcon1"
          : "primitive5_imgIcon"
      : status === "read"
        ? "primitive5_imgStatusReadStateDefault"
        : status === "failed"
          ? "primitive5_imgStatusFailedStateDefault"
          : "primitive5_imgStatusUnreadStateDefault";
  const element = (
    <span
      {...props}
      className={cn("p-message-status", className)}
      role="img"
      aria-label={label}
      tabIndex={referenceState ? undefined : 0}
      data-status={status}
      data-reference-state={referenceState}
    >
      <MessageAsset name={glyph} />
      {referenceState === "hover" && (
        <span className="p-message-status-reference-tooltip">
          <TooltipSurface content={label} />
        </span>
      )}
    </span>
  );
  return referenceState ? element : <Tooltip content={label}>{element}</Tooltip>;
}
export function Message({
  type = "text",
  sent = false,
  actor,
  timestamp,
  dateTime,
  avatar,
  status,
  actions,
  reactions,
  showHeader = true,
  children,
  className,
  ...props
}: ComponentProps<"article"> & {
  type?: MessageType;
  sent?: boolean;
  actor: ReactNode;
  timestamp?: ReactNode;
  dateTime?: string;
  avatar?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  reactions?: ReactNode;
  showHeader?: boolean;
}): React.ReactElement {
  return (
    <article
      {...props}
      className={cn("p-message", className)}
      data-message-type={type}
      data-sent={sent}
    >
      {!sent && avatar && <span className="p-message-avatar">{avatar}</span>}
      <div className="p-message-content">
        {showHeader && (
          <div className="p-message-header">
            <span className="p-message-actor">{actor}</span>
            {type !== "writing" && (
              <span className="p-message-time-status">
                <time dateTime={dateTime}>{timestamp}</time>
                {status}
              </span>
            )}
          </div>
        )}
        {children}
        {reactions && <div className="p-message-reactions">{reactions}</div>}
        {actions && <div className="p-message-actions">{actions}</div>}
      </div>
    </article>
  );
}
export function MessageBubble({ className, ...props }: ComponentProps<"div">): React.ReactElement {
  return <div {...props} className={cn("p-message-bubble", className)} />;
}
export function MessageReply({
  children,
  onOpen,
  className,
  ...props
}: ComponentProps<"div"> & { onOpen?: () => void }): React.ReactElement {
  const content = <span>{children}</span>;
  return onOpen ? (
    <button
      type="button"
      className={cn("p-message-reply", className)}
      onClick={onOpen}
      aria-label="Open replied message"
    >
      {content}
    </button>
  ) : (
    <div {...props} className={cn("p-message-reply", className)}>
      {content}
    </div>
  );
}
export function MessageTypingIndicator({
  label = "Typing",
  animate = true,
  className,
  ...props
}: ComponentProps<"span"> & { label?: string; animate?: boolean }): React.ReactElement {
  return (
    <span
      {...props}
      className={cn("p-message-typing", className)}
      role="status"
      aria-label={label}
      data-animate={animate}
    >
      <MessageAsset name="variant8_imgLoadingDot" />
      <MessageAsset name="variant8_imgLoadingDotFrame" />
      <MessageAsset name="variant8_imgLoadingDotFrame1" />
    </span>
  );
}
export function MessageImage({
  src,
  alt,
  name,
  sizeText,
  onOpen,
  className,
  ...props
}: ComponentProps<"figure"> & {
  src: string;
  alt: string;
  name: string;
  sizeText?: string;
  onOpen?: () => void;
}): React.ReactElement {
  const image = <img src={src} alt={alt} />;
  return (
    <figure {...props} className={cn("p-message-image", className)}>
      {onOpen ? (
        <button
          type="button"
          className="p-message-image-frame"
          aria-label={`Open ${name}`}
          onClick={onOpen}
        >
          {image}
        </button>
      ) : (
        <div className="p-message-image-frame">{image}</div>
      )}
      <figcaption>
        <span>{name}</span>
        {sizeText && <span>{sizeText}</span>}
      </figcaption>
    </figure>
  );
}
export function MessageLink({
  href,
  children,
  title,
  description,
  preview,
  previewAlt = "",
  icon,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  href: string;
  title?: string;
  description?: string;
  preview?: string;
  previewAlt?: string;
  icon?: ReactNode;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-message-link", className)}>
      {preview && <img className="p-message-link-preview" src={preview} alt={previewAlt} />}
      {(title || description) && (
        <a href={href} className="p-message-link-card">
          {icon}
          <span>
            <strong>{title}</strong>
            <span>{description}</span>
          </span>
        </a>
      )}
      <a className="p-message-link-url" href={href}>
        {children ?? href}
      </a>
    </div>
  );
}
