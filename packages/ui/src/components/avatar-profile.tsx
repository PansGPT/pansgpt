"use client";
import { useState, type ComponentProps } from "react";
import { cn } from "../utils";
import { Avatar } from "./avatar";
import { AvatarPatternAsset, type AvatarPatternAssetName } from "./avatar-pattern-assets";
export const avatarProfileSizes = ["sm", "md", "lg"] as const;
export type AvatarProfileSize = (typeof avatarProfileSizes)[number];
const glyphs: Record<AvatarProfileSize, AvatarPatternAssetName> = {
  sm: "avatarprofile_imgUser3",
  md: "avatarprofile_imgUser2",
  lg: "avatarprofile_imgUser01",
};
const ticks: Record<AvatarProfileSize, AvatarPatternAssetName> = {
  sm: "avatarprofile_imgSize2Xl",
  md: "avatarprofile_imgSize3Xl",
  lg: "avatarprofile_imgSize4Xl",
};
export type AvatarProfilePhotoProps = Omit<ComponentProps<"span">, "children"> & {
  label: string;
  src?: string;
  initials?: string;
  placeholder?: boolean;
  size?: AvatarProfileSize;
  verified?: boolean;
};
export function AvatarProfilePhoto({
  label,
  src,
  initials,
  placeholder = false,
  size = "sm",
  verified = false,
  className,
  ...props
}: AvatarProfilePhotoProps): React.ReactElement {
  const [failedSource, setFailedSource] = useState<string>();
  const mode = initials
    ? "initials"
    : !placeholder && src && src !== failedSource
      ? "photo"
      : "placeholder";
  return (
    <span
      {...props}
      className={cn("p-avatar-profile", className)}
      data-size={size}
      data-mode={mode}
    >
      <span className="p-avatar-profile-wrapper">
        <Avatar
          label={label + (verified ? ", verified" : "")}
          src={mode === "photo" ? src : undefined}
          initials={initials}
          placeholder={mode === "placeholder"}
          placeholderIcon={
            <AvatarPatternAsset name={glyphs[size]} className="p-avatar-profile-glyph" />
          }
          size="2xl"
          className="p-avatar-profile-content"
          onImageError={() => setFailedSource(src)}
        />
      </span>
      {verified && <AvatarPatternAsset name={ticks[size]} className="p-avatar-profile-verified" />}
    </span>
  );
}
