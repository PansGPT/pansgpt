"use client";

import { ExternalLink, MessageSquare, BookOpen, Bug } from "lucide-react";
import { SettingsSection } from "../settings-section";
import { SettingsRow } from "../settings-row";

export function HelpSection(): React.ReactElement {
  return (
    <div className="settings-section-container">
      <SettingsSection
        title="Help & Learning Resources"
        description="Guides and support for using PansGPT clinical features effectively."
      >
        <SettingsRow
          title="Getting started with PansGPT"
          description="Learn how to upload monographs, snip PDF text to chat, and practice with quizzes."
          chevron
          onClick={() => {
            window.open(
              "https://pansgpt.edu.ng/docs/getting-started",
              "_blank",
              "noopener,noreferrer"
            );
          }}
        >
          <ExternalLink size={15} aria-hidden="true" />
        </SettingsRow>

        <SettingsRow
          title="Clinical tools & calculation guides"
          description="How to format dosing regimens, check drug interactions, and render chemical structures."
          chevron
          onClick={() => {
            window.open(
              "https://pansgpt.edu.ng/docs/clinical-tools",
              "_blank",
              "noopener,noreferrer"
            );
          }}
        >
          <BookOpen size={15} aria-hidden="true" />
        </SettingsRow>

        <SettingsRow
          title="Report a bug or dosage discrepancy"
          description="Flag incorrect clinical calculations or application glitches directly to the engineering team."
          chevron
          onClick={() => {
            window.open("mailto:support@pansgpt.edu.ng?subject=PansGPT%20Feedback", "_blank");
          }}
        >
          <Bug size={15} aria-hidden="true" />
        </SettingsRow>

        <SettingsRow
          title="Contact pharmacy faculty support"
          description="Need access to additional monograph collections or course materials?"
          chevron
          onClick={() => {
            window.open(
              "mailto:faculty@pansgpt.edu.ng?subject=Course%20Material%20Inquiry",
              "_blank"
            );
          }}
        >
          <MessageSquare size={15} aria-hidden="true" />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
}
