"use client";
import { useId, type HTMLAttributes, type ReactNode, type MouseEventHandler } from "react";
import { Button } from "./button";
import { Typography } from "./typography";
import { Illustration, type IllustrationProps } from "./illustration";
import { EmptyStateAsset, type EmptyStateAssetName } from "./empty-state-asset";
import { cn } from "../utils";
import folderPattern from "../../assets/empty-folder-pattern.png";

export type EmptyStateAction = {
  label: ReactNode;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  loading?: boolean;
  leadingIcon?: ReactNode;
};
export type EmptyStateProps = HTMLAttributes<HTMLDivElement> & {
  title: ReactNode;
  supportingText?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "featured" | "illustration" | "file" | "folder";
  icon?: ReactNode;
  illustrationVariant?: IllustrationProps["variant"];
  showGraphic?: boolean;
  decorativePattern?: boolean;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
};
export function EmptyState({
  title,
  supportingText,
  size = "sm",
  variant = "featured",
  icon,
  illustrationVariant = "cloud",
  showGraphic = true,
  decorativePattern = true,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: EmptyStateProps): React.ReactElement {
  const headingId = useId();
  const key = (suffix: string): EmptyStateAssetName =>
    ("featured-" + size + "-" + suffix) as EmptyStateAssetName;
  return (
    <div
      aria-labelledby={headingId}
      {...props}
      className={cn("p-empty-state", className)}
      data-empty-size={size}
      data-empty-variant={variant}
    >
      {decorativePattern && variant !== "file" && (
        <div aria-hidden="true" className="p-empty-pattern">
          {variant === "folder" ? (
            <img
              alt=""
              src={typeof folderPattern === "string" ? folderPattern : folderPattern.src}
            />
          ) : variant === "featured" ? (
            <div className="p-empty-pattern-mask">
              <EmptyStateAsset name={key("imgContent1")} />
            </div>
          ) : (
            <div className="p-empty-pattern-mask">
              <EmptyStateAsset name={("grid-" + size + "-imgVertical") as EmptyStateAssetName} />
              <EmptyStateAsset name={("grid-" + size + "-imgHorizontal") as EmptyStateAssetName} />
            </div>
          )}
        </div>
      )}
      <div className="p-empty-body">
        <div className="p-empty-content">
          {showGraphic && (
            <div className="p-empty-graphic" aria-hidden="true">
              {variant === "illustration" ? (
                <Illustration size={size} variant={illustrationVariant} />
              ) : variant === "featured" ? (
                <div className="p-empty-featured">
                  {icon ?? <EmptyStateAsset name={key("imgSearchLg")} />}
                </div>
              ) : variant === "file" ? (
                <div className="p-empty-file-wrap">
                  <div className="p-empty-file">
                    <EmptyStateAsset className="p-empty-file-page" name="file-imgPage" />
                    <EmptyStateAsset className="p-empty-file-glyph" name="file-imgIconWrap" />
                  </div>
                </div>
              ) : (
                <div className="p-empty-folder">
                  <EmptyStateAsset name="folder-native" />
                </div>
              )}
            </div>
          )}
          <div className="p-empty-text">
            <Typography
              as="h2"
              id={headingId}
              variant={
                size === "sm"
                  ? "text-md-semibold"
                  : size === "md"
                    ? "text-lg-semibold"
                    : "text-xl-semibold"
              }
            >
              {title}
            </Typography>
            {supportingText && (
              <Typography
                variant={
                  size === "sm"
                    ? "text-sm-regular"
                    : size === "md"
                      ? "text-sm-regular"
                      : "text-md-regular"
                }
              >
                {supportingText}
              </Typography>
            )}
          </div>
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="p-empty-actions">
            {secondaryAction && (
              <Button
                size={size === "lg" ? "lg" : "md"}
                variant="secondary"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                loading={secondaryAction.loading}
                leadingIcon={secondaryAction.leadingIcon ?? null}
                trailingIcon={null}
              >
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                size={size === "lg" ? "lg" : "md"}
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                loading={primaryAction.loading}
                leadingIcon={primaryAction.leadingIcon ?? null}
                trailingIcon={null}
              >
                {primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
