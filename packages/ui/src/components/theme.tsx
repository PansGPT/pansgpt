"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const THEME_NAMES = ["light", "dark", "sepia"] as const;
export type ThemeName = (typeof THEME_NAMES)[number];
export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === "string" && THEME_NAMES.some((theme) => theme === value);
}
interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
export const THEME_STORAGE_KEY = "pansgpt-theme";

export function ThemeProvider({
  children,
  initialTheme = "light",
}: {
  children: ReactNode;
  initialTheme?: ThemeName;
}): React.ReactElement {
  const [theme, setTheme] = useState<ThemeName>(initialTheme);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (isThemeName(saved)) setTheme(saved);
    } catch {
      /* Storage may be unavailable in private or embedded contexts. */
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* Keep the in-memory theme. */
    }
  }, [ready, theme]);
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme requires ThemeProvider");
  return value;
}
