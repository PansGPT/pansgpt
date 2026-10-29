"use client";

import { BrandMark } from "@/components/auth/brand-art";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

export function AboutSection(): React.ReactElement {
  return (
    <div className="settings-section-container">
      <SettingsSection
        title="About PansGPT"
        description="Version, institutional licensing, and platform architecture."
      >
        <div className="settings-about-flat">
          <BrandMark />
          <div className="settings-about-meta">
            <h4>PansGPT</h4>
            <p>Intelligent Pharmacy Education & Clinical Study Platform</p>
          </div>
        </div>

        <SettingsRow
          title="Curriculum & Institutional Partner"
          description="Piloted in cooperation with the Faculty of Pharmaceutical Sciences, University of Jos."
        >
          <span className="settings-value-pill">UniJos Pilot</span>
        </SettingsRow>

        <SettingsRow
          title="Clinical & AI Reasoning Engines"
          description="Powered by Google Gemma 4 (31B-IT) with Gemini Embedding 2 (1536-dim) vector retrieval."
        >
          <span className="settings-value-pill">FastAPI Hybrid RAG</span>
        </SettingsRow>

        <SettingsRow
          title="Terms of Service"
          chevron
          onClick={() => {
            window.open("/terms", "_blank");
          }}
        />

        <SettingsRow
          title="Privacy Policy"
          chevron
          onClick={() => {
            window.open("/privacy", "_blank");
          }}
        />
      </SettingsSection>
    </div>
  );
}
