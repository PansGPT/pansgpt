import {
  GraduationCap,
  type LucideIcon,
  BookOpen,
  Home,
  MessageSquare,
  Sparkles,
} from "lucide-react";

export const destinations = [
  { href: "/app", label: "Home", icon: Home, description: "Your study workspace" },
  {
    href: "/app/library",
    label: "Library",
    icon: BookOpen,
    description: "Course materials and documents",
  },
  {
    href: "/app/chat",
    label: "Chat",
    icon: MessageSquare,
    description: "Ask PansGPT a study question",
  },
  { href: "/app/quiz", label: "Quiz", icon: Sparkles, description: "Practice and revision" },
] as const;

type Destination = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};
export const mobileDestinations: readonly Destination[] = destinations.flatMap<Destination>(
  (item) =>
    item.href === "/app/library"
      ? [
          item,
          {
            href: "/app/learn",
            label: "Learn",
            icon: GraduationCap,
            description: "Guided study and revision",
          },
        ]
      : [item]
);

export function isCurrentDestination(pathname: string, href: string): boolean {
  return href === "/app" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}
