import React from "react";

interface UserInitialsAvatarProps {
  name?: string | null;
  email?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const COLOR_CLASSES = [
  "bg-emerald-600 text-emerald-50",
  "bg-sky-600 text-sky-50",
  "bg-indigo-600 text-indigo-50",
  "bg-violet-600 text-violet-50",
  "bg-amber-600 text-amber-50",
  "bg-rose-600 text-rose-50",
  "bg-teal-600 text-teal-50",
  "bg-cyan-600 text-cyan-50",
];

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  if (email && email.trim().length > 0) {
    const localPart = email.split("@")[0].trim();
    if (localPart.length >= 2) {
      return localPart.slice(0, 2).toUpperCase();
    }
    return localPart.slice(0, 1).toUpperCase();
  }

  return "PG";
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function UserInitialsAvatar({
  name,
  email,
  size = "md",
  className = "",
}: UserInitialsAvatarProps) {
  const initials = getInitials(name, email);
  const identifier = (name || email || "pansgpt").toLowerCase();
  const colorClass = COLOR_CLASSES[hashString(identifier) % COLOR_CLASSES.length];

  const sizeClasses = {
    sm: "w-8 h-8 text-xs font-semibold",
    md: "w-10 h-10 text-sm font-semibold",
    lg: "w-12 h-12 text-base font-bold",
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full select-none shadow-sm ${sizeClasses} ${colorClass} ${className}`}
      title={name || email || "User"}
      aria-label={name || email || "User initials"}
    >
      {initials}
    </div>
  );
}
