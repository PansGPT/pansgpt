import { useState } from "react";
import {
  Avatar,
  AvatarProfilePhoto,
  Button,
  CommandBar,
  CommandDialog,
  CommandFeaturedIcon,
  CommandFooter,
  CommandHelp,
  CommandInput,
  CommandMenuHeader,
  CommandMenuItem,
  CommandMenuSection,
  CommandNavigationKey,
  CommandShortcut,
  EmptyState,
  Toggle,
  type CommandItem,
  type CommandSection,
} from "../src";
import {
  CommandAsset,
  commandAssetUrl,
  type CommandAssetName,
} from "../src/components/command-assets";
import { commandSourceGeometry as geometry } from "./command-source-data";

const people = [
  ["Olúwadámilọ́lá Buhari", "@phoenix"],
  ["Diepreye Ọ̀rẹ̀kọ́yà", "@olivia"],
  ["Ìbùkúnọlá Abubakar", "@lana"],
  ["Ọ̀rẹ́fùnmí Àrègbésọlá", "@demi"],
  ["Ṣọ̀pẹ́ Emenike", "@candice"],
  ["Chizaram Àkànjí", "@natali"],
  ["Ikenna Danjuma", "@drew"],
] as const;
const portraits: CommandAssetName[] = [
  "users_imgAvatar",
  "users_imgAvatar1",
  "users_imgAvatar2",
  "users_imgAvatar3",
  "users_imgAvatar4",
  "users_imgAvatar5",
  "users_imgAvatar6",
];
const integrationNames = ["GitHub", "Linear", "Figma", "Zapier", "Notion", "Slack", "Dropbox"];
const domains = [
  "github.com",
  "linear.app",
  "figma.com",
  "zapier.com",
  "notion.so",
  "slack.com",
  "dropbox.com",
];
const smallLogos: CommandAssetName[] = [
  "logo_github",
  "logo_linear",
  "logo_figma",
  "logo_zapier",
  "logo_notion",
  "logo_slack",
  "logo_dropbox",
];
const largeLogos: CommandAssetName[] = [
  "logo_github_40",
  "logo_linear_40",
  "logo_figma_40",
  "logo_zapier_40",
  "logo_notion_40",
  "logo_slack_40",
  "logo_dropbox_40",
];
const actionLabels = [
  "Marketing site redesign",
  "Create new document",
  "Invite colleagues",
  "My profile",
  "Team profile",
  "Invite colleagues",
  "Create new project",
  "Support",
  "Changelog",
  "Keyboard shortcuts",
];
const actionSupporting = [
  `Project by ${people[1][0]} in Notion migration`,
  "Create a new blank document",
  "Invite your colleagues to join your team",
  "View and edit your personal profile",
  "View and edit your team profile",
  "Collaborate with your team on projects",
  "Create a new blank project",
  "Our team are here to help if you get stuck",
  "Learn about our latest releases and updates",
  "Speed up your workflow with shortcuts",
];
const actionKeys = ["", "⌘N", "⌘I", "P", "T", "⌘I", "⌘N", "⌘H", "⌘C", "⌘?"];
const actionAssets: CommandAssetName[] = [
  "actions_imgFolder",
  "actions_imgFilePlus03",
  "actions_imgUserPlus01",
  "actions_imgUser01",
  "actions_imgUsers01",
  "actions_imgUserPlus01",
  "actions_imgFolderPlus",
  "actions_imgHelpCircle",
  "actions_imgLayersTwo02",
  "actions_imgZapFast",
];
const stackedActionAssets: CommandAssetName[] = [
  "stackedActions_imgFolder",
  "stackedActions_imgFilePlus03",
  "stackedActions_imgUserPlus01",
  "stackedActions_imgUser01",
  "stackedActions_imgUsers01",
  "stackedActions_imgUserPlus01",
  "stackedActions_imgFolderPlus",
  "stackedActions_imgHelpCircle",
  "stackedActions_imgLayersTwo02",
  "stackedActions_imgZapFast",
];
export function CommandFixtures(): React.ReactElement {
  const [selected, setSelected] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [liveQuery, setLiveQuery] = useState("");
  const makePeople = (stacked: boolean): CommandItem[] =>
    people.map(([label, supportingText], index) => ({
      id: `person-${index}`,
      label,
      supportingText,
      leading: (
        <Avatar
          label={label}
          src={commandAssetUrl(portraits[index])}
          size={stacked ? "md" : "xs"}
        />
      ),
    }));
  const makeIntegrations = (stacked: boolean): CommandItem[] =>
    integrationNames.map((label, index) => ({
      id: `integration-${index}`,
      label,
      supportingText: domains[index],
      leading: <CommandAsset name={(stacked ? largeLogos : smallLogos)[index]} />,
    }));
  const makeActions = (stacked: boolean): CommandItem[] =>
    actionLabels.map((label, index) => ({
      id: `action-${index}`,
      label,
      supportingText: stacked ? actionSupporting[index] : undefined,
      leading: stacked ? (
        <CommandFeaturedIcon>
          <CommandAsset name={stackedActionAssets[index]} />
        </CommandFeaturedIcon>
      ) : (
        <CommandAsset name={actionAssets[index]} />
      ),
      shortcut: actionKeys[index] ? (
        index === 3 || index === 4 ? (
          <CommandShortcut first="⌘K" second={actionKeys[index]} supportingText={false} />
        ) : (
          <CommandShortcut first={actionKeys[index]} />
        )
      ) : undefined,
    }));
  const profile = (stacked: boolean): React.ReactElement => (
    <div className="command-source-profile" data-stacked={stacked}>
      <div className="command-source-profile-banner-wrap">
        <div className="command-source-profile-banner" />
      </div>
      <div className="command-source-profile-copy">
        <AvatarProfilePhoto
          label="Diepreye Ọ̀rẹ̀kọ́yà"
          size="sm"
          src={commandAssetUrl("profile_imgContent")}
          verified
        />
        <div>
          <h3>Diepreye Ọ̀rẹ̀kọ́yà</h3>
          <p>
            {stacked
              ? "I\u0027m a Product Designer based in Melbourne, Australia."
              : "I\u0027m a Product Designer and Webflow Developer based in Melbourne, Australia."}
          </p>
        </div>
        <div className="command-source-socials">
          {(
            ["profile_imgSocialIcon", "profile_imgSocialIcon1", "profile_imgSocialIcon2"] as const
          ).map((name, index) => (
            <a
              key={name}
              href={`#profile-social-${index}`}
              aria-label={["X profile", "LinkedIn profile", "Dribbble profile"][index]}
            >
              <CommandAsset name={name} />
            </a>
          ))}
        </div>
      </div>
      <div className="command-source-profile-actions">
        <Button
          variant="secondary"
          size="md"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setSelected("Portfolio")}
        >
          View portfolio
        </Button>
        <Button
          size="md"
          leadingIcon={stacked ? null : <CommandAsset name="profile_imgPlus" />}
          trailingIcon={null}
          onClick={() => setSelected("Follow")}
        >
          Follow
        </Button>
      </div>
    </div>
  );
  const integration = (stacked: boolean): React.ReactElement => (
    <div className="command-source-integration" data-stacked={stacked}>
      <div className="command-source-integration-copy">
        <CommandAsset name={stacked ? "stackedIntegrations_imgLinear" : "logo_linear_64"} />
        <div>
          <h3>Linear</h3>
          <p>Linear helps streamline software projects, sprints, tasks, and bug tracking.</p>
        </div>
        <Toggle
          aria-label="Enable Linear integration"
          size="sm"
          checked={enabled}
          onCheckedChange={setEnabled}
        />
      </div>
      <div className="command-source-integration-actions">
        <Button
          size="md"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setSelected("View integration")}
        >
          View integration
        </Button>
        <Button
          size="md"
          variant="secondary"
          leadingIcon={null}
          trailingIcon={null}
          onClick={() => setSelected("Learn more")}
        >
          Learn more
        </Button>
      </div>
    </div>
  );
  const empty = (
    <EmptyState
      title="No projects found"
      supportingText={
        "“Landing page design” did not match any projects. Would you like to create a project?"
      }
      secondaryAction={{ label: "Clear search", onClick: () => setSelected("Clear search") }}
      primaryAction={{
        label: "New project",
        leadingIcon: <CommandAsset name="empty_imgPlus" />,
        onClick: () => setSelected("New project"),
      }}
    />
  );
  const liveItems = [
    ...makePeople(false),
    { id: "disabled", label: "Unavailable action", disabled: true },
  ];
  return (
    <section className="preview-section">
      <h2>Command bar source panels</h2>
      <div className="command-source-scroll">
        <div className="command-source-grid">
          {geometry.bars.map((bar) => {
            const type = bar.name.match(/Type=([^,]+)/)?.[1] ?? "";
            const stacked = bar.name.endsWith("Stacked");
            let sections: CommandSection[] = [];
            if (type === "Users") {
              const users = makePeople(stacked);
              sections = [
                { id: "recent", label: "Recent", items: users.slice(0, stacked ? 3 : 2) },
                { id: "all", label: "All users", items: users },
              ];
            }
            if (type === "Users menu")
              sections = [
                {
                  id: "designers",
                  label: stacked ? undefined : "Designers",
                  items: makePeople(stacked),
                },
              ];
            if (type === "Integrations menu")
              sections = [
                { id: "integrations", label: "Integrations", items: makeIntegrations(stacked) },
              ];
            if (type === "Actions") {
              const actions = makeActions(stacked);
              sections = [
                { id: "recent", label: stacked ? "Recent" : undefined, items: actions.slice(0, 3) },
                { id: "actions", items: actions.slice(3) },
              ];
            }
            return (
              <CommandBar
                key={bar.id}
                data-source-id={bar.id}
                data-source-type={type}
                className="command-source-bar"
                sections={sections}
                textLayout={stacked ? "stacked" : "inline"}
                commandOnly={type === "Command only"}
                defaultActiveId={
                  type === "Actions"
                    ? "action-1"
                    : type === "Integrations menu"
                      ? "integration-1"
                      : "person-1"
                }
                defaultQuery={type === "Empty state" ? "Landing page design" : ""}
                empty={empty}
                footer={type === "Users"}
                detail={
                  type === "Users menu"
                    ? profile(stacked)
                    : type === "Integrations menu"
                      ? integration(stacked)
                      : undefined
                }
                help={type === "Integrations menu" ? <CommandHelp /> : undefined}
                onSelect={(item) => setSelected(item.label)}
                onBack={() => setSelected("Parent")}
                onSettings={() => setSelected("Settings")}
              />
            );
          })}
        </div>
      </div>
      <h2>All forty-eight row variants</h2>
      <div className="command-source-scroll">
        <div className="command-item-source-grid">
          {geometry.sets[0].variants.map((item) => {
            const type = item.name.match(/Type=([^,]+)/)?.[1];
            const size = item.name.endsWith("md") ? "md" : "sm";
            const stacked = item.name.includes("Text=Stacked");
            const state = item.name.includes("State=Hover")
              ? "hover"
              : item.name.includes("State=Focus")
                ? "focus"
                : "default";
            const leading =
              type === "Avatar leading" ? (
                <Avatar
                  label="Diepreye Ọ̀rẹ̀kọ́yà"
                  src={commandAssetUrl("item_imgSizeLgPlaceholderFalseTextFalseStatusIconFalse")}
                  size={stacked ? (size === "sm" ? "md" : "lg") : "xs"}
                />
              ) : type === "Icon leading" ? (
                stacked ? (
                  <CommandFeaturedIcon size={size}>
                    <CommandAsset name={size === "sm" ? "item_imgUser2" : "item_imgUser3"} />
                  </CommandFeaturedIcon>
                ) : (
                  <CommandAsset name="item_imgUser01" />
                )
              ) : type === "Dot leading" ? (
                <CommandAsset name="item_imgSizeMdOutlineFalse" />
              ) : undefined;
            return (
              <CommandMenuItem
                key={item.id}
                data-row-source-id={item.id}
                label="Diepreye Ọ̀rẹ̀kọ́yà"
                supportingText="@olivia"
                size={size}
                textLayout={stacked ? "stacked" : "inline"}
                referenceState={state}
                leading={leading}
                shortcut={<CommandShortcut />}
                onClick={() => setSelected(item.name)}
              />
            );
          })}
        </div>
      </div>
      <h2>Menu section layouts</h2>
      <div className="command-source-scroll">
        <div className="command-section-source-grid">
          {geometry.sets[3].variants.map((source) => {
            const size = source.name.endsWith("md") ? "md" : "sm";
            return (
              <CommandMenuSection
                key={source.id}
                data-section-source-id={source.id}
                label="Recent"
                size={size}
                scrollable={source.name.includes("Scrollable=True")}
              >
                {makePeople(false).map((item) => (
                  <CommandMenuItem
                    key={item.id}
                    label={item.label}
                    supportingText={item.supportingText}
                    leading={item.leading}
                    size={size}
                  />
                ))}
              </CommandMenuSection>
            );
          })}
        </div>
      </div>
      <h2>Shared command primitives</h2>
      <div className="command-primitive-sources">
        <CommandShortcut data-primitive-source-id="3307:405244" />
        <CommandShortcut data-primitive-source-id="3307:405248" first="⌘K" second="C" />
        <CommandInput data-source-input="3307:404884" />
        <CommandInput data-source-input="3307:405354" defaultValue="Diepreye Ọ̀rẹ̀kọ́yà" />
        <CommandInput
          data-source-input="3307:405367"
          defaultValue="Diepreye Ọ̀rẹ̀kọ́yà"
          referenceState="focus"
        />
        <CommandMenuHeader data-primitive-source-id="3307:404987">Recent</CommandMenuHeader>
        <CommandMenuHeader data-primitive-source-id="3307:411612" size="md">
          Recent
        </CommandMenuHeader>
        <CommandNavigationKey data-primitive-source-id="4898:411305">
          <CommandAsset name="nav_imgArrowUp" />
        </CommandNavigationKey>
        <CommandNavigationKey data-primitive-source-id="4898:411318">esc</CommandNavigationKey>
        <CommandFooter
          onBack={() => setSelected("Parent")}
          onSettings={() => setSelected("Settings")}
        />
      </div>
      <h2>Live command dialog</h2>
      <CommandDialog
        title="People commands"
        trigger={
          <Button leadingIcon={null} trailingIcon={null}>
            Open command menu
          </Button>
        }
        sections={[{ id: "people", label: "People", items: liveItems }]}
        query={liveQuery}
        onQueryChange={setLiveQuery}
        onSelect={(item) => setSelected(item.label)}
        empty="No people found"
        footer
      />
      <output data-testid="command-selection">{selected}</output>
      <output data-testid="command-query">{liveQuery}</output>
      <output data-testid="command-toggle">{enabled ? "enabled" : "disabled"}</output>
    </section>
  );
}
