"use client";

import { useState } from "react";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";

export function AccessibilitySection(): React.ReactElement {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeTouch, setLargeTouch] = useState(false);

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Vision & Motor Access"
        description="Adapt interface ergonomics and visual contrast for comfortable study."
      >
        <SettingsRow
          title="Reduce motion"
          description="Minimize animated message reveal and transition effects across all views."
        >
          <SettingsToggle
            checked={reducedMotion}
            onChange={(checked) => {
              setReducedMotion(checked);
              try {
                localStorage.setItem("pansgpt-pref-motion", checked ? "reduced" : "system");
              } catch {}
            }}
            aria-label="Toggle reduced motion"
          />
        </SettingsRow>

        <SettingsRow
          title="High contrast borders"
          description="Increase the contrast of cards, active inputs, and conversation bubbles."
        >
          <SettingsToggle
            checked={highContrast}
            onChange={(checked) => {
              setHighContrast(checked);
              document.documentElement.setAttribute("data-high-contrast", String(checked));
            }}
            aria-label="Toggle high contrast borders"
          />
        </SettingsRow>

        <SettingsRow
          title="Enhanced touch targets"
          description="Enlarge buttons and clickable areas to 48px minimum for mobile precision."
        >
          <SettingsToggle
            checked={largeTouch}
            onChange={setLargeTouch}
            aria-label="Toggle enhanced touch targets"
          />
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title="Keyboard Navigation">
        <div className="settings-shortcuts-flat">
          <div className="settings-shortcut-row">
            <span>Quick search conversations</span>
            <span>
              <kbd className="settings-kbd">Ctrl</kbd> + <kbd className="settings-kbd">K</kbd>
            </span>
          </div>
          <div className="settings-shortcut-row">
            <span>Send message in composer</span>
            <kbd className="settings-kbd">Enter</kbd>
          </div>
          <div className="settings-shortcut-row">
            <span>New line in composer</span>
            <span>
              <kbd className="settings-kbd">Shift</kbd> + <kbd className="settings-kbd">Enter</kbd>
            </span>
          </div>
          <div className="settings-shortcut-row">
            <span>Close modal or sheet</span>
            <kbd className="settings-kbd">Esc</kbd>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
