"use client";

import { useState } from "react";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";

export function CapabilitiesSection(): React.ReactElement {
  const [dosageCalc, setDosageCalc] = useState(true);
  const [drugInteractions, setDrugInteractions] = useState(true);
  const [chemDrawer, setChemDrawer] = useState(true);
  const [monographReranker, setMonographReranker] = useState(true);

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Clinical Capabilities & AI Skills"
        description="Enable specialized tools and dynamic clinical computation modules for your study conversations."
      >
        <SettingsRow
          title="Dosage Calculator"
          description="Automatic pediatric, creatinine-clearance, and body surface area dose calculations."
        >
          <SettingsToggle
            checked={dosageCalc}
            onChange={setDosageCalc}
            aria-label="Toggle Dosage Calculator"
          />
        </SettingsRow>

        <SettingsRow
          title="Drug Interaction Checker"
          description="Real-time multi-drug contraindication and pharmacokinetic CYP450 interaction detection."
        >
          <SettingsToggle
            checked={drugInteractions}
            onChange={setDrugInteractions}
            aria-label="Toggle Drug Interaction Checker"
          />
        </SettingsRow>

        <SettingsRow
          title="Chemical Reaction Drawer"
          description="Generate Smiles, 2D structural formulas, and medicinal chemistry stereocenters."
        >
          <SettingsToggle
            checked={chemDrawer}
            onChange={setChemDrawer}
            aria-label="Toggle Chemical Reaction Drawer"
          />
        </SettingsRow>

        <SettingsRow
          title="Agentic Monograph Re-ranker"
          description="Two-pass neural re-ranking across university course packs and Nigerian pharmacy monographs."
        >
          <SettingsToggle
            checked={monographReranker}
            onChange={setMonographReranker}
            aria-label="Toggle Agentic Monograph Re-ranker"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
