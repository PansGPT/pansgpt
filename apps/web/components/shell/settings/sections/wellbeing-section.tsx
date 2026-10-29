"use client";

import { useState } from "react";
import { SettingsSection } from "../settings-section";
import { SettingsRow, SettingsToggle } from "../settings-row";

export function WellbeingSection(): React.ReactElement {
  const [studyBreaks, setStudyBreaks] = useState(true);
  const [nightRestAlert, setNightRestAlert] = useState(false);
  const [studyPacing, setStudyPacing] = useState(true);

  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Study & Wellbeing"
        description="Encourage balanced academic study rhythms and prevent monograph exam fatigue."
      >
        <SettingsRow
          title="Study break nudges"
          description="Suggest gentle 5-minute pauses after 50 minutes of continuous chat and reading."
        >
          <SettingsToggle
            checked={studyBreaks}
            onChange={setStudyBreaks}
            aria-label="Toggle study break nudges"
          />
        </SettingsRow>

        <SettingsRow
          title="Night study alert"
          description="Gentle reminder when active study extends past midnight before early lectures."
        >
          <SettingsToggle
            checked={nightRestAlert}
            onChange={setNightRestAlert}
            aria-label="Toggle night study alert"
          />
        </SettingsRow>

        <SettingsRow
          title="Paced learning check-ins"
          description="Adaptive question pauses to consolidate comprehension before generating new topics."
        >
          <SettingsToggle
            checked={studyPacing}
            onChange={setStudyPacing}
            aria-label="Toggle paced learning check-ins"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
