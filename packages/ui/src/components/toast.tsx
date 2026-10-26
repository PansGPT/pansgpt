"use client";

import { Toaster as SonnerToaster, type ToasterProps as SonnerToasterProps } from "sonner";
import { cn } from "../utils";
import { useTheme } from "./theme";

export { toast } from "sonner";
export type { ExternalToast } from "sonner";
export type ToasterProps = Omit<SonnerToasterProps, "theme">;

/** Mount once inside ThemeProvider. Sonner owns announcements, timing and actions. */
export function Toaster({
  className,
  toastOptions,
  closeButton = true,
  ...props
}: ToasterProps): React.ReactElement {
  const { theme } = useTheme();
  const classes = toastOptions?.classNames;
  return (
    <SonnerToaster
      {...props}
      theme={theme === "dark" ? "dark" : "light"}
      closeButton={closeButton}
      className={cn("p-toaster", className)}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
        classNames: {
          ...classes,
          toast: cn("p-toast", classes?.toast),
          title: cn("p-toast-title", classes?.title),
          description: cn("p-toast-description", classes?.description),
          actionButton: cn("p-toast-action", classes?.actionButton),
          cancelButton: cn("p-toast-cancel", classes?.cancelButton),
          closeButton: cn("p-toast-close", classes?.closeButton),
        },
      }}
    />
  );
}
