"use client";
import { useEffect } from "react";

export function AuthTheme({ children }: { children: React.ReactNode }): React.ReactElement {
  useEffect(() => {
    const root = document.documentElement;
    const previous = {
      theme: root.dataset.theme,
      auth: root.dataset.authTheme,
      scheme: root.style.colorScheme,
    };
    // Match body-mounted shared portals to the fixed green/white auth palette, without changing saved app preferences.
    root.dataset.theme = "light";
    root.dataset.authTheme = "brand";
    root.style.colorScheme = "light";
    return () => {
      if (previous.theme === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous.theme;
      if (previous.auth === undefined) delete root.dataset.authTheme;
      else root.dataset.authTheme = previous.auth;
      root.style.colorScheme = previous.scheme;
    };
  }, []);
  return (
    <div className="auth-theme" data-theme="light" style={{ colorScheme: "light" }}>
      {children}
    </div>
  );
}
