import { useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  RadioGroup,
  SegmentedControl,
  Select,
  Slideout,
  SlideoutClose,
  SlideoutFooter,
  SlideoutHeader,
  SlideoutSection,
  SlideoutSurface,
  Tabs,
} from "../src";
import { SlideoutAsset, type SlideoutAssetName } from "../src/components/slideout-assets";
import { SlideoutApplicationPanel } from "./slideout-application-panel";
import { SlideoutDetailContent } from "./slideout-detail-content";
import { slideoutSources } from "./slideout-source-data";

const lorem =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Odio dictumst tempus magna elit cras posuere cursus pulvinar id. Facilisis at eu amet ornare enim arcu malesuada rutrum a.";
const teams = ["Design", "Product", "Marketing", "Management", "Sales", "Product", "Operations"];
const roles = [
  "Backend Developer",
  "Frontend Developer",
  "Fullstack Developer",
  "Product Designer",
  "Product Manager",
  "QA Engineer",
  "UX Copywriter",
  "UX Designer",
];
function HeaderTabs(): React.ReactElement {
  return (
    <Tabs
      label="Panel sections"
      variant="minimal"
      size="sm"
      fullWidth
      breakpoint="desktop"
      items={["My details", "Profile", "Password"].map((label) => ({
        value: label,
        label,
        content: null,
      }))}
    />
  );
}
function FilterContent({
  onAction,
  sourceIndex,
}: {
  onAction: (value: string) => void;
  sourceIndex: number;
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <SlideoutSection>
        <Select
          aria-label="Saved filter"
          placeholder="Select saved filter"
          leadingIcon={
            <SlideoutAsset name={`source${sourceIndex}_imgFilterLines` as SlideoutAssetName} />
          }
          trailingIcon={
            <SlideoutAsset name={`source${sourceIndex}_imgChevronDown` as SlideoutAssetName} />
          }
          options={[
            { value: "design", label: "Design team" },
            { value: "all", label: "All teams" },
          ]}
          onValueChange={onAction}
        />
      </SlideoutSection>
      <SlideoutSection title="Teams">
        {teams.map((label, index) => (
          <Checkbox
            key={`${label}-${index}`}
            label={
              <Badge
                size="md"
                color={
                  (["brand", "blue", "indigo", "pink", "brand", "success", "blue-light"] as const)[
                    index
                  ] ?? "brand"
                }
              >
                {label}
              </Badge>
            }
            onCheckedChange={(checked) => onAction(`${label}: ${checked}`)}
          />
        ))}
      </SlideoutSection>
      <SlideoutSection title="Role">
        <Input
          aria-label="Search roles"
          placeholder="Search"
          leadingIcon={
            <SlideoutAsset name={`source${sourceIndex}_imgSearchLg` as SlideoutAssetName} />
          }
          trailingAddon={<kbd className="slideout-search-key">⌘K</kbd>}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        {[
          ...roles,
          ...(expanded
            ? [
                "Data Analyst",
                "Researcher",
                "Team Lead",
                "Engineer",
                "Content Designer",
                "Consultant",
                "Administrator",
                "Support",
                "Lecturer",
                "Student",
              ]
            : []),
        ]
          .filter((role) => role.toLowerCase().includes(query.toLowerCase()))
          .map((role) => (
            <Checkbox
              key={role}
              label={role}
              onCheckedChange={(checked) => onAction(`${role}: ${checked}`)}
            />
          ))}
        <Button
          leadingIcon={null}
          trailingIcon={null}
          variant="link-color"
          onClick={() => setExpanded((previous) => !previous)}
        >
          {expanded ? "Show less" : "Show 10 more"}
        </Button>
      </SlideoutSection>
    </>
  );
}
function NotificationContent({
  groups,
  sourceIndex,
  onAction,
}: {
  groups: boolean;
  sourceIndex: number;
  onAction: (value: string) => void;
}): React.ReactElement {
  const options = [
    ["Message mentions", "I’m mentioned in a message or comment."],
    ["Message replies", "Someone replies to any message or comment."],
    ["New projects", "New projects are created on my team."],
    ["Outstanding tasks", "I’ve had outstanding tasks for more than:"],
  ] as const;
  if (groups)
    return (
      <>
        {[...options, ["New team members", "New users have been added to my team."]].map(
          ([label, description]) => (
            <SlideoutSection key={label} title={label} description={description}>
              {label === "Outstanding tasks" && (
                <div className="slideout-duration">
                  <Input
                    aria-label="Outstanding task duration"
                    defaultValue="24"
                    type="number"
                    min={1}
                  />
                  <Select
                    aria-label="Duration units"
                    defaultValue="hours"
                    trailingIcon={
                      <SlideoutAsset
                        name={`source${sourceIndex}_imgChevronDown` as SlideoutAssetName}
                      />
                    }
                    options={[
                      { value: "hours", label: "Hours" },
                      { value: "days", label: "Days" },
                    ]}
                  />
                </div>
              )}
              <SegmentedControl
                label={`${label} delivery`}
                defaultValue="app"
                items={[
                  { value: "none", label: "None" },
                  { value: "app", label: "In-app" },
                  { value: "email", label: "Email" },
                ]}
              />
            </SlideoutSection>
          )
        )}
        <Button
          variant="link-color"
          leadingIcon={<SlideoutAsset name={`source${sourceIndex}_imgPlus` as SlideoutAssetName} />}
          trailingIcon={null}
          onClick={() => onAction("Add custom notification")}
        >
          Add custom notification
        </Button>
      </>
    );
  return (
    <>
      {["In-app notifications", "Email notifications"].map((title, section) => (
        <div key={title} className="slideout-placeholder-section">
          {section > 0 && <hr />}
          <SlideoutSection title={title} description="Select when you’ll be notified in-app.">
            <div className="slideout-notification-list">
              {options
                .filter((_, index) => section === 0 || index !== 2)
                .map(([label, description]) => (
                  <div key={label} className="slideout-notification-row">
                    <Checkbox label={label} supportingText={description} defaultChecked />
                    {section === 0 && label === "Outstanding tasks" && (
                      <div className="slideout-notification-times">
                        <RadioGroup
                          label="Outstanding task threshold"
                          variant="plain"
                          defaultValue="1 hour"
                          options={["1 hour", "24 hours", "1 week"].map((time) => ({
                            value: time,
                            label: time,
                          }))}
                        />
                      </div>
                    )}
                  </div>
                ))}
              {section === 0 && (
                <Checkbox
                  label="Outstanding tasks"
                  supportingText="I’ve had outstanding tasks for more than:"
                  defaultChecked
                />
              )}
            </div>
          </SlideoutSection>
        </div>
      ))}
    </>
  );
}
export function SlideoutFixtures(): React.ReactElement {
  const [selection, setSelection] = useState("");
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState("");
  const headers = slideoutSources[0].variants;
  const panelSources = slideoutSources[1].variants;
  const supported = panelSources;
  const header = (
    index: number,
    mobile: boolean,
    tabs: boolean,
    title = "Heading",
    description = "Lorem ipsum dolor sit amet."
  ): ReactNode => (
    <SlideoutHeader
      title={title}
      description={description}
      icon={<SlideoutAsset name={`source${index}_imgPlaceholder` as SlideoutAssetName} />}
      closeIcon={<SlideoutAsset name={`source${index}_imgXClose` as SlideoutAssetName} />}
      breakpoint={mobile ? "mobile" : "desktop"}
      tabs={tabs ? <HeaderTabs /> : undefined}
      onClose={() => setSelection("Close")}
    />
  );
  return (
    <section className="preview-section">
      <h2>Four slideout headers</h2>
      <div className="slideout-header-scroll">
        <div className="slideout-header-grid">
          {headers.map((source, index) => (
            <div key={source.id} data-slideout-source-id={source.id}>
              {header(index, source.name.includes("Mobile"), source.name.includes("Tabs=True"))}
            </div>
          ))}
        </div>
      </div>
      <h2>Slideout content variants</h2>
      <div className="slideout-source-scroll">
        <div className="slideout-source-grid">
          {supported.map((source) => {
            const index = panelSources.findIndex((item) => item.id === source.id) + 4;
            const mobile = source.name.includes("Mobile");
            const type = source.name.match(/Type=([^,]+)/)?.[1] ?? "Placeholder";
            if (
              ![
                "Placeholder",
                "Filters",
                "Notification settings checkboxes",
                "Notification settings button groups",
                "Project details",
                "Order summary",
                "Payment details",
                "Payment method",
                "Plan",
                "File upload",
              ].includes(type)
            )
              return (
                <SlideoutApplicationPanel
                  key={source.id}
                  id={source.id}
                  name={source.name}
                  index={index}
                  onAction={setSelection}
                />
              );
            const isPlaceholder = type === "Placeholder";
            const isFilter = type === "Filters";
            const details = [
              "Project details",
              "Order summary",
              "Payment details",
              "Payment method",
              "Plan",
              "File upload",
            ].includes(type);
            const billing = ["Payment details", "Payment method", "Plan"].includes(type);
            const title = isPlaceholder
              ? "Heading"
              : isFilter
                ? "Filters"
                : type === "Project details"
                  ? "Marketing site redesign"
                  : type === "Plan"
                    ? "Change your plan"
                    : type === "File upload"
                      ? "Upload and attach files"
                      : details
                        ? type
                        : "Notifications";
            const description = isPlaceholder
              ? "Lorem ipsum dolor sit amet."
              : isFilter
                ? "Apply filters to table data."
                : type === "Project details"
                  ? "Redesign of PansGPT.com"
                  : type === "Plan"
                    ? "Flexible pricing that grows with you."
                    : billing
                      ? "Update your plan payment details."
                      : type === "File upload"
                        ? "Upload and attach files to this project."
                        : type === "Order summary"
                          ? undefined
                          : "Manage when you\u2019ll receive notifications.";
            const primary =
              isFilter || type === "Project details"
                ? "Apply"
                : billing
                  ? "Confirm"
                  : type === "File upload"
                    ? "Attach to project"
                    : "Save";
            return (
              <SlideoutSurface
                key={source.id}
                data-slideout-source-id={source.id}
                breakpoint={mobile ? "mobile" : "desktop"}
                label={source.name}
                header={
                  <SlideoutHeader
                    title={title}
                    description={description}
                    breakpoint={mobile ? "mobile" : "desktop"}
                    icon={
                      isPlaceholder ? (
                        <SlideoutAsset
                          name={`source${index}_imgPlaceholder` as SlideoutAssetName}
                        />
                      ) : billing ? (
                        <SlideoutAsset
                          name={`source${index}_imgCreditCard02` as SlideoutAssetName}
                        />
                      ) : undefined
                    }
                    closeIcon={
                      <SlideoutAsset name={`source${index}_imgXClose` as SlideoutAssetName} />
                    }
                    onClose={() => setSelection("Close")}
                  />
                }
                footer={
                  type === "Order summary" ? undefined : (
                    <SlideoutFooter>
                      {(isFilter || type === "Project details") && (
                        <Button
                          variant="link-color"
                          className="slideout-save-filter"
                          leadingIcon={null}
                          trailingIcon={null}
                          onClick={() => setSelection("Save filter")}
                        >
                          Save filter
                        </Button>
                      )}
                      <Button
                        size="md"
                        variant="secondary"
                        leadingIcon={null}
                        trailingIcon={null}
                        onClick={() => setSelection("Cancel")}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="md"
                        leadingIcon={null}
                        trailingIcon={null}
                        onClick={() => setSelection(primary)}
                      >
                        {primary}
                      </Button>
                    </SlideoutFooter>
                  )
                }
              >
                {isPlaceholder ? (
                  Array.from({ length: 3 }, (_, item) => (
                    <div key={item} className="slideout-placeholder-section">
                      {item > 0 && <hr />}
                      <SlideoutSection title="Label" description={lorem}>
                        <div className="slideout-placeholder" />
                      </SlideoutSection>
                    </div>
                  ))
                ) : isFilter ? (
                  <FilterContent onAction={setSelection} sourceIndex={index} />
                ) : details ? (
                  <SlideoutDetailContent
                    type={type}
                    index={index}
                    mobile={mobile}
                    onAction={setSelection}
                  />
                ) : (
                  <NotificationContent
                    groups={type.endsWith("button groups")}
                    sourceIndex={index}
                    onAction={setSelection}
                  />
                )}
              </SlideoutSurface>
            );
          })}
        </div>
      </div>
      <h2>Live modal panel</h2>
      <Slideout
        open={open}
        onOpenChange={setOpen}
        trigger={
          <Button leadingIcon={null} trailingIcon={null}>
            Open study settings
          </Button>
        }
        title="Study settings"
        description="Update your preferred study name."
        footer={
          <SlideoutFooter>
            <SlideoutClose asChild>
              <Button variant="secondary" leadingIcon={null} trailingIcon={null}>
                Cancel
              </Button>
            </SlideoutClose>
            <Button
              leadingIcon={null}
              trailingIcon={null}
              onClick={() => {
                setSelection(live);
                setOpen(false);
              }}
            >
              Save
            </Button>
          </SlideoutFooter>
        }
      >
        <SlideoutSection>
          <Input
            label="Study name"
            value={live}
            onChange={(event) => setLive(event.currentTarget.value)}
          />
        </SlideoutSection>
        {Array.from({ length: 18 }, (_, index) => (
          <SlideoutSection
            key={index}
            title={`Section ${index + 1}`}
            description="Scroll the body while keeping the header and footer visible."
          />
        ))}
      </Slideout>
      <output data-testid="slideout-selection">{selection}</output>
    </section>
  );
}
