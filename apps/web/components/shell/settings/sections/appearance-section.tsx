"use client";

import { useState } from "react";
import { Monitor, Sun, Moon } from "lucide-react";
import type { ThemeName } from "@pansgpt/ui/shell";
import type { usePreferences } from "@/components/shell/use-preferences";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

export function AppearanceSection({
  preferences,
}: {
  preferences: ReturnType<typeof usePreferences>;
}): React.ReactElement {
  const [motion, setMotion] = useState<"system" | "reduced" | "full">(() => {
    if (typeof window === "undefined") return "system";
    try {
      const saved = localStorage.getItem("pansgpt-pref-motion");
      return saved === "system" || saved === "reduced" || saved === "full" ? saved : "system";
    } catch {
      return "system";
    }
  });

  const [responseFont, setResponseFont] = useState("Sans · Inter");
  const [interfaceFont, setInterfaceFont] = useState("Default · Plus Jakarta Sans");

  function handleMotionChange(mode: "system" | "reduced" | "full") {
    setMotion(mode);
    try {
      localStorage.setItem("pansgpt-pref-motion", mode);
    } catch {}
  }

  return (
    <div className="settings-section-container">
      <SettingsSection title="Appearance">
        <SettingsRow title="Theme">
          <div className="settings-theme-icons-toggle" role="radiogroup" aria-label="Theme mode">
            <button
              type="button"
              className={`settings-theme-icon-btn${preferences.theme === "light" ? " is-active" : ""}`}
              onClick={() => preferences.save("light")}
              title="Light theme"
              aria-label="Light theme"
              aria-checked={preferences.theme === "light"}
              role="radio"
            >
              <Sun size={16} />
            </button>
            <button
              type="button"
              className={`settings-theme-icon-btn${preferences.theme === "dark" ? " is-active" : ""}`}
              onClick={() => preferences.save("dark")}
              title="Dark theme"
              aria-label="Dark theme"
              aria-checked={preferences.theme === "dark"}
              role="radio"
            >
              <Moon size={16} />
            </button>
            <button
              type="button"
              className={`settings-theme-icon-btn${preferences.theme === "sepia" ? " is-active" : ""}`}
              onClick={() => preferences.save("sepia" as ThemeName)}
              title="Sepia warm reading"
              aria-label="Sepia theme"
              aria-checked={preferences.theme === "sepia"}
              role="radio"
            >
              <Monitor size={16} />
            </button>
          </div>
        </SettingsRow>

        <SettingsRow title="Interface font">
          <select
            className="settings-select"
            value={interfaceFont}
            onChange={(e) => setInterfaceFont(e.target.value)}
            aria-label="Interface font"
          >
            <option value="Default · Plus Jakarta Sans">Default · Plus Jakarta Sans</option>
            <option value="System Sans">System Sans</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Response font">
          <select
            className="settings-select"
            value={responseFont}
            onChange={(e) => setResponseFont(e.target.value)}
            aria-label="Response font"
          >
            <option value="Sans · Inter">Sans · Inter</option>
            <option value="Serif · Merriweather">Serif · Merriweather</option>
            <option value="Mono · JetBrains Mono">Mono · JetBrains Mono</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Motion">
          <select
            className="settings-select"
            value={motion}
            onChange={(e) => handleMotionChange(e.target.value as "system" | "reduced" | "full")}
            aria-label="Motion preference"
          >
            <option value="system">System</option>
            <option value="reduced">Reduced</option>
            <option value="full">Dynamic</option>
          </select>
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
