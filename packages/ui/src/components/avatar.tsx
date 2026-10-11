"use client";

import { useState, type ComponentProps, type ReactNode, type ReactEventHandler } from "react";
import { cn } from "../utils";
import { ReferenceAsset, referenceAssetUrl, type ReferenceAssetName } from "./reference-assets";

export const avatarSizes = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;
export type AvatarSize = (typeof avatarSizes)[number];
export type AvatarStatus = "none" | "online" | "offline" | "company" | "verified";
const placeholders: Record<AvatarSize, ReferenceAssetName> = {
  xs: "avatarImgUser5",
  sm: "avatarImgUser4",
  md: "avatarImgUser3",
  lg: "avatarImgUser2",
  xl: "avatarImgUser01",
  "2xl": "avatarImgUser01",
};
const verified: Record<AvatarSize, ReferenceAssetName> = {
  xs: "avatarImgSizeXs",
  sm: "avatarImgSizeSm",
  md: "avatarImgSizeMd",
  lg: "avatarImgSizeLg",
  xl: "avatarImgSizeXl",
  "2xl": "avatarImgSize2Xl",
};
export type AvatarProps = Omit<ComponentProps<"span">, "children"> & {
  label: string;
  src?: string;
  initials?: string;
  placeholder?: boolean;
  size?: AvatarSize;
  status?: AvatarStatus;
  companySrc?: string;
  verifiedSrc?: string;
  placeholderIcon?: ReactNode;
  onImageError?: ReactEventHandler<HTMLImageElement>;
};

export function Avatar({
  label,
  src,
  initials,
  placeholder = false,
  size = "xs",
  status = "none",
  companySrc,
  verifiedSrc,
  placeholderIcon,
  onImageError,
  className,
  ...props
}: AvatarProps): React.ReactElement {
  const [failedSource, setFailedSource] = useState<string>();
  const showPhoto = !placeholder && !initials && src != null && failedSource !== src;
  const showInitials = !placeholder && Boolean(initials);
  return (
    <span
      {...props}
      role="img"
      aria-label={label + (status === "none" ? "" : ", " + status)}
      className={cn("p-avatar", className)}
      data-size={size}
      data-photo={showPhoto || undefined}
      data-status={status}
    >
      {showPhoto ? (
        <img
          className="p-avatar-photo"
          src={src}
          alt=""
          onError={(event) => {
            setFailedSource(src);
            onImageError?.(event);
          }}
        />
      ) : showInitials ? (
        <span className="p-avatar-initials" aria-hidden="true">
          {initials}
        </span>
      ) : (
        (placeholderIcon ?? (
          <ReferenceAsset name={placeholders[size]} className="p-avatar-placeholder" />
        ))
      )}
      {(status === "online" || status === "offline") && (
        <span className="p-avatar-online" aria-hidden="true" />
      )}
      {status === "verified" &&
        (verifiedSrc ? (
          <img src={verifiedSrc} alt="" aria-hidden="true" className="p-avatar-verified" />
        ) : (
          <ReferenceAsset name={verified[size]} className="p-avatar-verified" />
        ))}
      {status === "company" && (
        <span className="p-avatar-company" aria-hidden="true">
          <img src={companySrc ?? referenceAssetUrl("avatarImgSizeXs1")} alt="" />
        </span>
      )}
    </span>
  );
}
