import type { ComponentPropsWithoutRef } from "react";
import { cn } from "../utils";
import styles from "../styles/user-initials-avatar.module.css";

export type UserInitialsAvatarProps = Omit<
  ComponentPropsWithoutRef<"span">,
  "children" | "role" | "aria-label" | "title"
> & {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
};

function getInitials(name: string, email: string): string {
  if (name) {
    const parts = name.split(/\s+/);
    return (
      parts.length > 1
        ? [Array.from(parts[0])[0], Array.from(parts[1])[0]].join("")
        : Array.from(parts[0]).slice(0, 2).join("")
    ).toUpperCase();
  }
  return Array.from(email.split("@")[0].trim()).slice(0, 2).join("").toUpperCase() || "PG";
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Shared successor to the web avatar; no profile fetch, storage or image request. */
export function UserInitialsAvatar({
  name,
  email,
  size = "md",
  className,
  ...props
}: UserInitialsAvatarProps): React.ReactElement {
  const displayName = name?.trim() ?? "";
  const address = email?.trim() ?? "";
  const identity = displayName || address;
  return (
    <span
      {...props}
      role="img"
      aria-label={identity || "User initials"}
      title={identity || "User"}
      className={cn(styles.avatar, className)}
      data-size={size}
      data-tone={hashString((identity || "pansgpt").toLowerCase()) % 8}
    >
      {getInitials(displayName, address)}
    </span>
  );
}
