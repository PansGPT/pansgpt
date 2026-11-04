"use client";
import { BrandMark } from "@/components/auth/brand-art";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";
import { HelpSection } from "./help-section";
export function AboutSection(): React.ReactElement {
  return (
    <div className="settings-section-container">
      <div className="settings-about-brand">
        <BrandMark />
        <div>
          <h3>PansGPT</h3>
          <p>Made for pharmacy students.</p>
        </div>
      </div>
      <SettingsSection title="About" hideTitleOnMobile>
        <SettingsRow title="PansGPT">
          <span className="settings-value-pill">2.0</span>
        </SettingsRow>
        <SettingsRow title="Terms of service" chevron disabled onClick={() => undefined} />
        <SettingsRow title="Privacy policy" chevron disabled onClick={() => undefined} />
        <HelpSection />
      </SettingsSection>
    </div>
  );
}
