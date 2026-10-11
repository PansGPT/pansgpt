"use client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { Avatar, type AvatarProps, type AvatarSize } from "./avatar";
import { AvatarPatternAsset } from "./avatar-pattern-assets";
import { Tooltip, TooltipSurface } from "./tooltip";
export const avatarGroupSizes = ["xs", "sm", "md"] as const;
export type AvatarGroupSize = (typeof avatarGroupSizes)[number];
function AddGlyph({
  size,
  disabled = false,
}: {
  size: AvatarGroupSize;
  disabled?: boolean;
}): React.ReactElement {
  const suffix = size === "md" ? "1" : "";
  return (
    <span className="p-avatar-add-glyph" aria-hidden="true">
      <span className="p-avatar-add-normal">
        <AvatarPatternAsset
          name={
            disabled
              ? size === "md"
                ? "avataradd_imgPlus3"
                : "avataradd_imgPlus2"
              : size === "md"
                ? "avataradd_imgPlus1"
                : "avataradd_imgPlus"
          }
        />
      </span>
      {!disabled && (
        <span className="p-avatar-add-hover">
          <AvatarPatternAsset name={suffix ? "avataradd_imgPlus5" : "avataradd_imgPlus4"} />
        </span>
      )}
    </span>
  );
}
export type AvatarAddButtonProps = ComponentProps<"button"> & {
  size?: AvatarGroupSize;
  tooltip?: boolean;
};
export function AvatarAddButton({
  size = "xs",
  tooltip = true,
  className,
  disabled,
  "aria-label": label = "Add user",
  ...props
}: AvatarAddButtonProps): React.ReactElement {
  const button = (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn("p-avatar-add", className)}
      data-size={size}
      disabled={disabled}
      aria-label={label}
    >
      <AddGlyph size={size} disabled={disabled} />
    </button>
  );
  return tooltip && !disabled ? (
    <Tooltip content={label} arrow sideOffset={3} className="p-avatar-add-tooltip">
      {button}
    </Tooltip>
  ) : (
    button
  );
}
/** Original noninteractive state artwork, including the source hover cursor. */
export function AvatarAddButtonReference({
  size = "xs",
  state = "default",
  className,
  ...props
}: ComponentProps<"div"> & {
  size?: AvatarGroupSize;
  state?: "default" | "hover" | "focus" | "disabled";
}): React.ReactElement {
  const tooltipX = { xs: -25.5, sm: -22, md: -18 };
  const cursor = { xs: [16, 12], sm: [20, 16], md: [28, 24] };
  return (
    <div
      {...props}
      className={cn("p-avatar-add", className)}
      data-size={size}
      data-reference-state={state}
    >
      <AddGlyph size={size} disabled={state === "disabled"} />
      {state === "hover" && (
        <>
          <TooltipSurface
            className="p-avatar-add-reference-tip"
            content={<span style={{ display: "block", width: 52 }}>Add user</span>}
            arrow="bottom-center"
            style={{ left: tooltipX[size] - 1, top: -44 }}
          />
          <AvatarPatternAsset
            className="p-avatar-add-reference-cursor"
            name="avataradd_imgTypeHandPoint"
          />
          <span
            className="p-avatar-add-cursor-slot"
            style={{ left: cursor[size][0] - 1, top: cursor[size][1] - 1 }}
          />
        </>
      )}
    </div>
  );
}
export interface AvatarGroupMember extends Omit<AvatarProps, "size"> {
  id: string;
}
export type AvatarGroupProps = Omit<ComponentProps<"div">, "children"> & {
  members: readonly AvatarGroupMember[];
  size?: AvatarGroupSize;
  maxVisible?: number;
  totalCount?: number;
  showMore?: boolean;
  onMoreClick?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
};
export function AvatarGroup({
  members,
  size = "xs",
  maxVisible = 10,
  totalCount = members.length,
  showMore = true,
  onMoreClick,
  onAdd,
  addLabel = "Add user",
  addDisabled = false,
  className,
  ...props
}: AvatarGroupProps): React.ReactElement {
  const limit = Number.isFinite(maxVisible) ? Math.max(0, Math.floor(maxVisible)) : 10;
  const visible = members.slice(0, limit);
  const count =
    Math.max(
      members.length,
      Number.isFinite(totalCount) ? Math.floor(totalCount) : members.length
    ) - visible.length;
  const moreProps = {
    className: "p-avatar p-avatar-group-more",
    "data-size": size,
    "aria-label": `${count} more ${count === 1 ? "user" : "users"}`,
  };
  return (
    <div
      {...props}
      role="group"
      aria-label={props["aria-label"] ?? "Members"}
      className={cn("p-avatar-group", className)}
      data-size={size}
    >
      <div className="p-avatar-stack">
        {visible.map(({ id, ...member }) => (
          <Avatar key={id} {...member} size={size} />
        ))}
        {showMore &&
          count > 0 &&
          (onMoreClick ? (
            <button {...moreProps} type="button" onClick={onMoreClick}>
              +{count}
            </button>
          ) : (
            <span {...moreProps} role="img">
              +{count}
            </span>
          ))}
      </div>
      {onAdd && (
        <AvatarAddButton size={size} onClick={onAdd} aria-label={addLabel} disabled={addDisabled} />
      )}
    </div>
  );
}
export type AvatarLabelGroupProps = Omit<ComponentProps<"div">, "children"> & {
  avatar: Omit<AvatarProps, "size">;
  name: ReactNode;
  supportingText?: ReactNode;
  size?: Extract<AvatarSize, "sm" | "md" | "lg" | "xl">;
};
export function AvatarLabelGroup({
  avatar,
  name,
  supportingText,
  size = "sm",
  className,
  ...props
}: AvatarLabelGroupProps): React.ReactElement {
  return (
    <div {...props} className={cn("p-avatar-label-group", className)} data-size={size}>
      <Avatar {...avatar} size={size} />
      <div className="p-avatar-label-copy">
        <span className="p-avatar-label-name">{name}</span>
        {supportingText != null && (
          <span className="p-avatar-label-supporting">{supportingText}</span>
        )}
      </div>
    </div>
  );
}
