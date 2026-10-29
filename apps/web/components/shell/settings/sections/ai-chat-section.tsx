"use client";

import { useState } from "react";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";

export function AiChatSection(): React.ReactElement {
  const [responseStyle, setResponseStyle] = useState("Balanced");
  const [showThinking, setShowThinking] = useState(true);
  const [webGrounding, setWebGrounding] = useState(true);
  const [localTerminology, setLocalTerminology] = useState(true);

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Your PansGPT"
        description="Fine-tune how PansGPT analyzes clinical cases, explains drug interactions, and delivers answers."
      >
        <SettingsRow
          title="Explanation depth"
          description="Default detail level when answering pharmacotherapy questions."
        >
          <select
            className="settings-select"
            value={responseStyle}
            onChange={(e) => setResponseStyle(e.target.value)}
            aria-label="Explanation depth"
          >
            <option value="Direct">Direct</option>
            <option value="Balanced">Balanced</option>
            <option value="Comprehensive">Comprehensive</option>
          </select>
        </SettingsRow>

        <SettingsRow
          title="Show reasoning steps"
          description="Display clinical step-by-step logic and calculation proofs before the final answer."
        >
          <SettingsToggle
            checked={showThinking}
            onChange={setShowThinking}
            aria-label="Toggle showing reasoning steps"
          />
        </SettingsRow>

        <SettingsRow
          title="Public web grounding"
          description="Allow PansGPT to cross-reference recent clinical drug monographs and public trials."
        >
          <SettingsToggle
            checked={webGrounding}
            onChange={setWebGrounding}
            aria-label="Toggle web grounding"
          />
        </SettingsRow>

        <SettingsRow
          title="Nigerian clinical nomenclature"
          description="Recognize BAN/INN generic standards and Nigerian essential medicine list trade names."
        >
          <SettingsToggle
            checked={localTerminology}
            onChange={setLocalTerminology}
            aria-label="Toggle local clinical terminology"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
