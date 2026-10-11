"use client";

import { type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { FeedAsset } from "./feed-assets";
import { FileTypeIcon, type UploadFileType } from "./file-upload";

export type FeedItemProps = Omit<ComponentProps<"article">, "children"> & {
  actor: ReactNode;
  timestamp: ReactNode;
  dateTime?: string;
  avatar: ReactNode;
  description: ReactNode;
  supporting?: ReactNode;
  supportingType?: "file" | "labels" | "text";
  size?: "sm" | "md";
  connector?: boolean;
  connectorArtwork?: ReactNode;
  unread?: boolean;
  onMarkRead?: () => void;
  markReadLabel?: string;
};
export function FeedItem({
  actor,
  timestamp,
  dateTime,
  avatar,
  description,
  supporting,
  supportingType,
  size = "md",
  connector = false,
  connectorArtwork,
  unread = false,
  onMarkRead,
  markReadLabel = "Mark activity as read",
  className,
  ...props
}: FeedItemProps): React.ReactElement {
  return (
    <article
      {...props}
      className={cn("p-feed-item", className)}
      data-size={size}
      data-connector={connector}
      data-supporting-type={supportingType}
    >
      <div className="p-feed-avatar-wrap">
        {avatar}
        {connector && (
          <span
            className="p-feed-connector"
            data-artwork={Boolean(connectorArtwork)}
            aria-hidden="true"
          >
            {connectorArtwork}
          </span>
        )}
      </div>
      <div className="p-feed-content">
        <div className="p-feed-copy">
          <div className="p-feed-headline">
            <span className="p-feed-actor">{actor}</span>
            <time className="p-feed-time" dateTime={dateTime}>
              {timestamp}
            </time>
          </div>
          <div className="p-feed-description">{description}</div>
        </div>
        {supporting && <div className="p-feed-supporting">{supporting}</div>}
      </div>
      {unread && (
        <>
          {onMarkRead ? (
            <button
              type="button"
              className="p-feed-unread"
              aria-label={markReadLabel}
              onClick={onMarkRead}
            >
              <FeedAsset name="source0_imgDot" />
            </button>
          ) : (
            <span className="p-feed-unread">
              <FeedAsset name="source0_imgDot" />
              <span className="p-sr-only">Unread</span>
            </span>
          )}
        </>
      )}
    </article>
  );
}
export function FeedMessage({
  children,
  className,
  ...props
}: ComponentProps<"div">): React.ReactElement {
  return (
    <div {...props} className={cn("p-feed-message", className)}>
      {children}
    </div>
  );
}
export function FeedLabels({ className, ...props }: ComponentProps<"div">): React.ReactElement {
  return <div {...props} className={cn("p-feed-labels", className)} />;
}
export type FeedAttachmentProps = {
  name: string;
  sizeText: string;
  type?: UploadFileType;
  href?: string;
  onOpen?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
};
export function FeedAttachment({
  name,
  sizeText,
  type = "pdf",
  href,
  onOpen,
  disabled = false,
  icon,
  className,
}: FeedAttachmentProps): React.ReactElement {
  const content = (
    <>
      {icon ?? <FileTypeIcon type={type} solid={false} />}
      <span className="p-feed-attachment-copy">
        <span className="p-feed-attachment-name">{name}</span>
        <span className="p-feed-attachment-size">{sizeText}</span>
      </span>
    </>
  );
  if (href && !disabled)
    return (
      <a className={cn("p-feed-attachment", className)} href={href}>
        {content}
      </a>
    );
  if (onOpen)
    return (
      <button
        type="button"
        className={cn("p-feed-attachment", className)}
        disabled={disabled}
        onClick={onOpen}
        aria-label={`Open ${name}`}
      >
        {content}
      </button>
    );
  return <div className={cn("p-feed-attachment", className)}>{content}</div>;
}
export type ActivityFeedEntry = FeedItemProps & { id: string };
export type ActivityFeedProps = Omit<ComponentProps<"ol">, "children"> & {
  label: string;
  items: readonly ActivityFeedEntry[];
  divider?: "line" | "connector" | "none";
  empty?: ReactNode;
};
export function ActivityFeed({
  label,
  items,
  divider = "line",
  empty,
  className,
  ...props
}: ActivityFeedProps): React.ReactElement {
  return (
    <ol
      {...props}
      className={cn("p-activity-feed", className)}
      aria-label={label}
      data-divider={divider}
    >
      {items.length ? (
        items.map(({ id, ...item }, index) => (
          <li key={id}>
            <FeedItem {...item} connector={divider === "connector" && index < items.length - 1} />
          </li>
        ))
      ) : (
        <li className="p-feed-empty">{empty ?? "No activity yet."}</li>
      )}
    </ol>
  );
}
