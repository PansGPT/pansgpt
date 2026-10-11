import { useState } from "react";
import { Button, Input, SectionLabel } from "../src";

const sources = [
  { id: "5013:376528", size: "sm", actions: false },
  { id: "5013:376529", size: "sm", actions: true },
  { id: "5013:376579", size: "md", actions: false },
  { id: "5013:376584", size: "md", actions: true },
] as const;

export function SectionLabelFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const actions = (
    <>
      <Button
        variant="link-gray"
        leadingIcon={null}
        trailingIcon={null}
        onClick={() => setAction("Secondary")}
      >
        Secondary
      </Button>
      <Button
        variant="link-color"
        leadingIcon={null}
        trailingIcon={null}
        onClick={() => setAction("Primary")}
      >
        Primary
      </Button>
    </>
  );
  return (
    <section className="preview-section">
      <h2>Section label source layouts</h2>
      <div
        style={{
          display: "grid",
          alignItems: "start",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 280px))",
          gap: 32,
        }}
      >
        {sources.map((source) => (
          <SectionLabel
            key={source.id}
            data-source-id={source.id}
            label="Team members"
            size={source.size}
            required
            supportingText="Manage your team members here."
            help="This is a tooltip"
            actions={source.actions ? actions : undefined}
          />
        ))}
      </div>
      <h2>Field association</h2>
      <SectionLabel
        label="Team name"
        htmlFor="section-team-name"
        required
        supportingText="Use a name your team recognizes."
        supportingTextId="team-name-detail"
        help="Choose your team name"
        helpLabel="Team name help"
      />
      <Input
        id="section-team-name"
        aria-describedby="team-name-detail"
        required
        leadingIcon={null}
      />
      <output aria-live="polite" data-testid="section-action">
        {action}
      </output>
      <SectionLabel label="Optional section" />
    </section>
  );
}
