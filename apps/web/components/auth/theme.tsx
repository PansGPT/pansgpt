"use client";
import { ThemeProvider } from "@pansgpt/ui/auth";

export function AuthTheme({ children }: { children: React.ReactNode }): React.ReactElement {
  return <ThemeProvider>{children}</ThemeProvider>;
}
