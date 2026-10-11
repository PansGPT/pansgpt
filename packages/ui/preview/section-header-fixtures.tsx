import { useState } from "react";
import {
  Button,
  ButtonGroup,
  ButtonGroupButton,
  Dropdown,
  DropdownButton,
  DropdownContent,
  DropdownItem,
  SectionHeader,
  SectionHeaderSearch,
  Tabs,
} from "../src";

const sources = [
  ["1214:66", "buttons", false, "desktop"],
  ["1214:1330", "buttons", false, "mobile"],
  ["1214:2800", "search", false, "desktop"],
  ["1214:2781", "search", false, "mobile"],
  ["1740:454693", "group", false, "desktop"],
  ["1740:454674", "group", false, "mobile"],
  ["1214:2269", "buttons", true, "desktop"],
  ["1214:2250", "buttons", true, "mobile"],
  ["1214:3129", "search", true, "desktop"],
  ["1214:3110", "search", true, "mobile"],
  ["1740:454704", "group", true, "desktop"],
  ["1740:454665", "group", true, "mobile"],
] as const;
const labels = [
  "My details",
  "Profile",
  "Password",
  "Team",
  "Plan",
  "Billing",
  "Email",
  "Notifications",
  "Integrations",
  "API",
];
const tabItems = labels.map((label) => ({
  value: label,
  label,
  content: null,
  badge: label === "Notifications" ? 2 : undefined,
}));
export function SectionHeaderFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("My details");
  const button = (
    label: string,
    variant: "tertiary" | "secondary" | "primary"
  ): React.ReactElement => (
    <Button
      size="md"
      variant={variant}
      leadingIcon={null}
      trailingIcon={null}
      onClick={() => setAction(label)}
    >
      {label}
    </Button>
  );
  const actions = (
    <>
      {button("Tertiary", "tertiary")}
      {button("Secondary", "secondary")}
      {button("Secondary", "secondary")}
      {button("Primary", "primary")}
    </>
  );
  const mobileActions = (
    <>
      {button("Secondary", "secondary")}
      {button("Primary", "primary")}
    </>
  );
  const menu = (
    <Dropdown>
      <DropdownButton variant="icon" label="Team options" />
      <DropdownContent>
        <DropdownItem onSelect={() => setAction("Export team")}>Export team</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
  const group = (
    <ButtonGroup label="Team actions">
      {[0, 1, 2].map((index) => (
        <ButtonGroupButton key={index} onClick={() => setAction(`Group ${index + 1}`)}>
          Text
        </ButtonGroupButton>
      ))}
    </ButtonGroup>
  );
  return (
    <section className="preview-section">
      <h2>Section header source layouts</h2>
      <div className="section-header-source-scroll">
        <div className="section-header-source-grid">
          {sources.map(([id, type, tabs, breakpoint]) => (
            <SectionHeader
              key={id}
              data-source-id={id}
              breakpoint={breakpoint}
              title="Team members"
              supportingText="Manage your team members and their account permissions here."
              actions={type === "buttons" ? actions : undefined}
              mobileActions={type === "buttons" ? mobileActions : undefined}
              control={
                type === "search" ? (
                  <SectionHeaderSearch enableShortcut={false} />
                ) : type === "group" ? (
                  group
                ) : undefined
              }
              menu={type === "search" ? undefined : menu}
              tabs={
                tabs ? (
                  <Tabs
                    className="section-header-source-tabs"
                    label={`Team tabs ${id}`}
                    variant="border"
                    items={tabItems}
                    breakpoint={breakpoint}
                  />
                ) : undefined
              }
            />
          ))}
        </div>
      </div>
      <h2>Responsive live header</h2>
      <SectionHeader
        data-testid="section-header-live"
        title="Team members"
        supportingText="Manage your team members and their account permissions here."
        control={
          <SectionHeaderSearch
            aria-label="Search team"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        }
        tabs={
          <Tabs
            className="section-header-source-tabs"
            label="Live team tabs"
            variant="border"
            items={tabItems}
            value={tab}
            onValueChange={setTab}
          />
        }
      />
      <output data-testid="header-query">{query}</output>
      <output data-testid="header-tab">{tab}</output>
      <output data-testid="header-action" aria-live="polite">
        {action}
      </output>
    </section>
  );
}
