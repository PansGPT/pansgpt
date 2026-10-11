import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
  Badge,
  badgeColors,
  Button,
  Checkbox,
  Dialog,
  DialogClose,
  FigmaAsset,
  Input,
  ProgressBar,
  Select,
  Slider,
  Spinner,
  TabItem,
  Tabs,
  Tag,
  Textarea,
  ThemeProvider,
  Toggle,
  Tooltip,
  isThemeName,
  useTheme,
  Typography,
  typographyStyles,
  Avatar,
  avatarSizes,
  Breadcrumbs,
  RadioGroup,
  VerticalTabs,
  verticalTabVariants,
} from "../src";
import { ReferenceAsset, referenceAssetUrl } from "../src/components/reference-assets";
import "../src/styles/index.css";
import "./preview.css";
import { NavigationFixtures } from "./navigation-fixtures";
import { GroupFixtures } from "./group-fixtures";
import { IconFixtures } from "./icon-fixtures";
import { AlertFixtures } from "./alert-fixtures";
import { NotificationFixtures } from "./notification-fixtures";
import { UploadFixtures } from "./upload-fixtures";
import { TooltipFixtures } from "./tooltip-fixtures";
import { IndicatorFixtures } from "./indicator-fixtures";
import { SliderFixtures } from "./slider-fixtures";
import { CodeFixtures } from "./code-fixtures";
import { AvatarPatternFixtures } from "./avatar-pattern-fixtures";
import { CloseButtonFixtures } from "./close-button-fixtures";
import { SocialFixtures } from "./social-fixtures";
import { ButtonFixtures } from "./button-fixtures";
import { FieldFixtures } from "./field-fixtures";
import { ControlFixtures } from "./control-fixtures";
import { TagFixtures } from "./tag-fixtures";
import { RadioFixtures } from "./radio-fixtures";
import { BadgeFixtures } from "./badge-fixtures";
import { BadgeGroupFixtures } from "./badge-group-fixtures";
import { TabFixtures } from "./tab-fixtures";
import { CarouselFixtures } from "./carousel-fixtures";
import { StepFixtures } from "./step-fixtures";
import { EmptyStateFixtures } from "./empty-state-fixtures";
import { SnippetFixtures } from "./snippet-fixtures";
import { SectionLabelFixtures } from "./section-label-fixtures";
import { SectionHeaderFixtures } from "./section-header-fixtures";
import { CardHeaderFixtures } from "./card-header-fixtures";
import { SectionFooterFixtures } from "./section-footer-fixtures";
import { PageHeaderFixtures } from "./page-header-fixtures";
import { TextEditorFixtures } from "./text-editor-fixtures";
import { CommandFixtures } from "./command-fixtures";
import { InlineCTAFixtures } from "./inline-cta-fixtures";
import { MetricFixtures } from "./metric-fixtures";
import { VideoFixtures } from "./video-fixtures";
import { FeedFixtures } from "./feed-fixtures";
import { MessageFixtures } from "./message-fixtures";
import { ChartFixtures } from "./chart-fixtures";
import { TableFixtures } from "./table-fixtures";
import { ApplicationNavigationFixtures } from "./application-navigation-fixtures";
import { DatePickerFixtures } from "./date-picker-fixtures";
import { CalendarFixtures } from "./calendar-fixtures";
import { FoundationFixtures } from "./foundation-fixtures";
import { SlideoutFixtures } from "./slideout-fixtures";

const items: TabItem[] = [
  { value: "details", label: "My details", content: "Details panel" },
  { value: "profile", label: "Profile", content: "Profile panel" },
  { value: "password", label: "Password", content: "Password panel" },
  { value: "team", label: "Team", content: "Team panel" },
  { value: "notifications", label: "Notifications", badge: 2, content: "Notifications panel" },
];

const previewFamilies = {
  fields: FieldFixtures,
  controls: ControlFixtures,
  tags: TagFixtures,
  radios: RadioFixtures,
  badges: BadgeFixtures,
  buttons: ButtonFixtures,
  applicationnavigation: ApplicationNavigationFixtures,
  datepickers: DatePickerFixtures,
  calendars: CalendarFixtures,
  foundations: FoundationFixtures,
  tables: TableFixtures,
  charts: ChartFixtures,
  slideouts: SlideoutFixtures,
  messages: MessageFixtures,
  feeds: FeedFixtures,
  video: VideoFixtures,
  metrics: MetricFixtures,
  inlinectas: InlineCTAFixtures,
  commands: CommandFixtures,
  editors: TextEditorFixtures,
  pageheaders: PageHeaderFixtures,
  sectionlabels: SectionLabelFixtures,
  sectionheaders: SectionHeaderFixtures,
  cardheaders: CardHeaderFixtures,
  sectionfooters: SectionFooterFixtures,
  empty: EmptyStateFixtures,
  snippets: SnippetFixtures,
  steps: StepFixtures,
  carousel: CarouselFixtures,
  navigation: NavigationFixtures,
  groups: GroupFixtures,
  icons: IconFixtures,
  alerts: AlertFixtures,
  notifications: NotificationFixtures,
  uploads: UploadFixtures,
  tooltips: TooltipFixtures,
  indicators: IndicatorFixtures,
  sliders: SliderFixtures,
  codes: CodeFixtures,
  avatars: AvatarPatternFixtures,
  close: CloseButtonFixtures,
  social: SocialFixtures,
  badgegroups: BadgeGroupFixtures,
  tabs: TabFixtures,
};
const requestedFamily = new URLSearchParams(window.location.search).get("section") ?? "core";
const selectedFamily = Object.prototype.hasOwnProperty.call(previewFamilies, requestedFamily)
  ? (requestedFamily as keyof typeof previewFamilies)
  : undefined;
function PreviewHeader(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  return (
    <>
      <header className="preview-header">
        <div>
          <p className="eyebrow">PANSGPT / COMPONENT LIBRARY</p>
          <h1>Foundations &amp; controls</h1>
          <p>Reference fixtures and working interactions.</p>
        </div>
        <label className="appearance">
          Appearance
          <select
            aria-label="Appearance"
            value={theme}
            onChange={(event) => {
              if (isThemeName(event.target.value)) setTheme(event.target.value);
            }}
          >
            <option value="light">Light</option>
            <option value="dark">OLED Dark</option>
            <option value="sepia">Sepia</option>
          </select>
        </label>
      </header>
      <label className="preview-family-picker">
        Component family
        <select
          aria-label="Component family"
          value={selectedFamily ?? (requestedFamily === "all" ? "all" : "core")}
          onChange={(event) => {
            window.location.assign(`/?section=${encodeURIComponent(event.target.value)}`);
          }}
        >
          <option value="core">Core foundations and controls</option>
          {Object.keys(previewFamilies).map((family) => (
            <option value={family} key={family}>
              {family.charAt(0).toUpperCase() + family.slice(1)}
            </option>
          ))}
          <option value="all">Entire library</option>
        </select>
      </label>
    </>
  );
}

function Preview(): React.ReactElement {
  const [showRemovableTag, setShowRemovableTag] = useState(true);
  if (selectedFamily) {
    const FamilyFixtures = previewFamilies[selectedFamily];
    return (
      <main className="preview">
        <PreviewHeader />
        <FamilyFixtures />
      </main>
    );
  }
  return (
    <main className="preview">
      <PreviewHeader />
      <section className="preview-section">
        <h2>Breadcrumbs</h2>
        <div className="breadcrumb-examples">
          {(["text", "line", "button"] as const).flatMap((variant) =>
            (["chevron", "slash"] as const).map((divider) => (
              <Breadcrumbs
                key={variant + divider}
                variant={variant}
                divider={divider}
                aria-label={variant + " " + divider + " breadcrumb"}
                items={[
                  {
                    id: "home",
                    label: "Home",
                    href: "#home",
                    icon: <ReferenceAsset name="breadcrumbsImgHomeLine" />,
                  },
                  { id: "quiz", label: "Quiz", href: "#quiz" },
                  { id: "questions", label: "Questions", href: "#questions" },
                  { id: "attempt", label: "Attempt", href: "#attempt" },
                  { id: "results", label: "Results" },
                ]}
              />
            ))
          )}
        </div>
      </section>
      <section className="preview-section">
        <h2>Avatars</h2>
        <div className="avatar-examples">
          {(["photo", "placeholder", "initials"] as const).flatMap((mode) =>
            (["none", "online", "company", "verified"] as const).map((status) => (
              <div className="avatar-row" key={mode + status}>
                {avatarSizes.map((size) => (
                  <Avatar
                    key={size}
                    size={size}
                    status={status}
                    label={mode + " " + size}
                    initials={mode === "initials" ? "OR" : undefined}
                    placeholder={mode === "placeholder"}
                    src={
                      mode === "photo"
                        ? referenceAssetUrl(
                            "avatarImgSizeXlPlaceholderFalseTextFalseStatusIconOnlineIndicator"
                          )
                        : undefined
                    }
                  />
                ))}
              </div>
            ))
          )}
          <Avatar label="Failed portrait" size="md" src="data:image/png;base64,invalid" />
        </div>
      </section>
      <section className="preview-section">
        <h2>Radio cards</h2>
        <form aria-label="Plan choice form">
          <div className="radio-reference">
            <RadioGroup
              label="Choose a plan"
              name="plan"
              defaultValue="basic"
              options={[
                {
                  value: "basic",
                  label: "Basic plan",
                  subtext: "$10/month",
                  description:
                    "Includes up to 10 users, 20 GB individual data and access to all features.",
                  icon: <ReferenceAsset name="radioImgLayersTwo01" />,
                },
                {
                  value: "business",
                  label: "Business plan",
                  subtext: "$20/month",
                  description:
                    "Includes up to 20 users, 40 GB individual data and access to all features.",
                  icon: <ReferenceAsset name="radioImgLayersThree01" />,
                },
                {
                  value: "enterprise",
                  label: "Enterprise plan",
                  subtext: "$40/month",
                  description:
                    "Unlimited users, unlimited individual data and access to all features.",
                  icon: <ReferenceAsset name="radioImgZap" />,
                },
                {
                  value: "ultimate",
                  label: "Ultimate plan",
                  subtext: "$60/month",
                  description:
                    "Unlimited users, unlimited individual data and access to all features.",
                  icon: <ReferenceAsset name="radioImgZapFast" />,
                },
                {
                  value: "secret",
                  label: "Secret plan",
                  subtext: "$80/month",
                  description:
                    "Unlimited users, unlimited individual data and access to all features.",
                  icon: <ReferenceAsset name="radioImgRocket01" />,
                },
              ]}
            />
          </div>
        </form>
      </section>
      <section className="preview-section">
        <h2>Tags</h2>
        <form aria-label="Tag selection form">
          <div className="preview-row">
            <Tag data-reference="tag-sm">Label</Tag>
            <Tag size="md" data-reference="tag-md">
              Label
            </Tag>
            <Tag size="lg" data-reference="tag-lg">
              Label
            </Tag>
            {showRemovableTag && (
              <Tag
                size="lg"
                selectable
                name="topic"
                checkboxLabel="Select removable tag"
                dismissLabel="Remove study tag"
                onDismiss={() => setShowRemovableTag(false)}
                data-reference="tag-lg-close"
              >
                Label
              </Tag>
            )}
            <Tag
              selectable
              count={5}
              leading={<ReferenceAsset name="tagCountryImgAu" />}
              checkboxLabel="Select country tag"
              name="country"
              data-reference="tag-country-count"
            >
              Label
            </Tag>
            {(["sm", "md", "lg"] as const).map((size) => (
              <Tag
                key={size}
                size={size}
                selectable
                defaultChecked
                disabled
                checkboxLabel={"Disabled " + size + " tag"}
              >
                Label
              </Tag>
            ))}
          </div>
        </form>
      </section>
      <section className="preview-section" data-reference="badge-matrix">
        <h2>Badges</h2>
        {(["pill", "color", "modern"] as const).map((variant) => (
          <div key={variant} className="badge-matrix">
            <h3>{variant}</h3>
            {badgeColors
              .filter((color) => variant !== "modern" || color === "gray")
              .map((color) => (
                <div className="preview-row" key={color}>
                  {([false, true] as const).flatMap((dot) =>
                    (["sm", "md", "lg"] as const).map((size) => (
                      <Badge
                        key={size + String(dot)}
                        variant={variant}
                        color={color}
                        size={size}
                        dot={dot}
                      >
                        Label
                      </Badge>
                    ))
                  )}
                </div>
              ))}
            {variant === "modern" &&
              badgeColors
                .filter((color) => color !== "gray")
                .map((color) => (
                  <div className="preview-row" key={color}>
                    {(["sm", "md", "lg"] as const).map((size) => (
                      <Badge key={size} variant={variant} color={color} size={size} dot>
                        Label
                      </Badge>
                    ))}
                  </div>
                ))}
          </div>
        ))}
      </section>
      <section className="preview-section">
        <h2>Typography</h2>
        <details>
          <summary>Inspect all 44 Figma text styles</summary>
          <div className="type-specimens">
            {typographyStyles.map((style) => (
              <div key={style.name}>
                <span className="type-name">{style.figmaName}</span>
                <Typography as="span" variant={style.name}>
                  Learning, clearly.
                </Typography>
              </div>
            ))}
          </div>
        </details>
      </section>
      <section className="preview-section">
        <h2>Buttons</h2>
        <div className="preview-row">
          <div data-reference="button">
            <Button>Button CTA</Button>
          </div>
          <Button variant="secondary" leadingIcon={null} trailingIcon={null}>
            Secondary
          </Button>
          <Button variant="tertiary" leadingIcon={null} trailingIcon={null}>
            Tertiary
          </Button>
          <Button variant="link-color" leadingIcon={null} trailingIcon={null}>
            Text link
          </Button>
          <Button destructive leadingIcon={null} trailingIcon={null}>
            Delete
          </Button>
          <Button disabled leadingIcon={null} trailingIcon={null}>
            Disabled
          </Button>
          <Button loading leadingIcon={null} trailingIcon={null}>
            Saving
          </Button>
        </div>
        <div className="preview-row">
          {(["sm", "md", "lg", "xl"] as const).map((size) => (
            <Button key={size} size={size} leadingIcon={null} trailingIcon={null}>
              {size.toUpperCase()}
            </Button>
          ))}
        </div>
      </section>
      <section className="preview-section">
        <h2>Fields</h2>
        <div className="preview-grid">
          <div data-reference="input">
            <Input
              label="Email"
              required
              placeholder="chioma@PansGPT.com"
              leadingIcon={<FigmaAsset name="mail" />}
              help="Enter your university email address"
              hint="This is a hint text to help user."
            />
          </div>
          <Input
            label="Invalid email"
            error="Enter a valid email address."
            defaultValue="invalid"
          />
          <Input label="Disabled email" disabled placeholder="Email address" />
          <div data-reference="textarea">
            <Textarea
              label="Description"
              required
              placeholder="Enter a description..."
              help="Describe the material"
              hint="This is a hint text to help user."
            />
          </div>
          <Select
            label="Team member"
            required
            help="Choose a team member"
            placeholder="Select team member"
            hint="This is a hint text to help user."
            options={[
              { value: "chioma", label: "Chioma" },
              { value: "emmanuel", label: "Emmanuel" },
              { value: "disabled", label: "Unavailable member", disabled: true },
            ]}
          />
        </div>
      </section>
      <section className="preview-section">
        <h2>Selection</h2>
        <div className="preview-grid">
          <form aria-label="Selection form">
            <Checkbox
              name="agreement"
              label="Accept academic agreement"
              supportingText="Use generated answers as study support."
            />
            <Checkbox aria-label="Partially selected" checked="indeterminate" />
          </form>
          <Toggle label="Reading reminders" supportingText="Receive reminders on this device." />
          <div className="reference-controls">
            <div data-reference="checkbox">
              <Checkbox aria-label="Reference checkbox" />
            </div>
            <div data-reference="checkbox-checked">
              <Checkbox aria-label="Checked checkbox" checked />
            </div>
            <div data-reference="checkbox-mixed">
              <Checkbox aria-label="Mixed checkbox" checked="indeterminate" />
            </div>
            <div data-reference="toggle">
              <Toggle aria-label="Reference toggle" />
            </div>
          </div>
          <div data-reference="slider">
            <Slider thumbLabels={["Minimum", "Maximum"]} defaultValue={[0, 25]} />
          </div>
        </div>
      </section>
      <section className="preview-section">
        <h2>Choice variants</h2>
        <form aria-label="Choice variants form" className="preview-grid">
          {(["sm", "md"] as const).flatMap((size) =>
            ([false, true] as const).flatMap((disabled) =>
              ([false, true] as const).map((labelled) => (
                <div
                  className="choice-variant-row"
                  key={size + String(disabled) + String(labelled)}
                >
                  {([false, true, "indeterminate"] as const).map((checked) => (
                    <Checkbox
                      key={String(checked)}
                      size={size}
                      disabled={disabled}
                      defaultChecked={checked}
                      aria-label={
                        size +
                        " " +
                        String(checked) +
                        " " +
                        String(disabled) +
                        " " +
                        String(labelled) +
                        " checkbox"
                      }
                      label={labelled ? "Remember me" : undefined}
                      supportingText={labelled ? "Save my login details for next time." : undefined}
                    />
                  ))}
                </div>
              ))
            )
          )}
          {(["default", "slim"] as const).flatMap((variant) =>
            (["sm", "md"] as const).flatMap((size) =>
              ([false, true] as const).flatMap((disabled) =>
                ([false, true] as const).map((labelled) => (
                  <div
                    className="choice-variant-row"
                    key={variant + size + String(disabled) + String(labelled)}
                  >
                    {([false, true] as const).map((checked) => (
                      <Toggle
                        key={String(checked)}
                        size={size}
                        variant={variant}
                        disabled={disabled}
                        defaultChecked={checked}
                        name={
                          variant + size + String(checked) + String(disabled) + String(labelled)
                        }
                        aria-label={
                          variant +
                          " " +
                          size +
                          " " +
                          String(checked) +
                          " " +
                          String(disabled) +
                          " " +
                          String(labelled) +
                          " toggle"
                        }
                        label={labelled ? "Remember me" : undefined}
                        supportingText={
                          labelled ? "Save my login details for next time." : undefined
                        }
                      />
                    ))}
                  </div>
                ))
              )
            )
          )}
          {(["sm", "md"] as const).map((size) => (
            <RadioGroup
              key={size}
              variant="plain"
              size={size}
              name={"plain-" + size}
              label={"Plain " + size + " choices"}
              defaultValue="first"
              options={[
                {
                  value: "first",
                  label: "First choice",
                  description: "Save my login details for next time.",
                },
                { value: "unavailable", label: "Unavailable choice", disabled: true },
                {
                  value: "second",
                  label: "Second choice",
                  description: "Save my login details for next time.",
                },
              ]}
            />
          ))}
        </form>
      </section>
      <section className="preview-section">
        <h2>Status & progress</h2>
        <div className="preview-row">
          <div data-reference="badge">
            <Badge>Label</Badge>
          </div>
          <div data-reference="tag">
            <Tag>Label</Tag>
          </div>
          <Tooltip content="This is a tooltip">
            <Button variant="secondary" leadingIcon={null} trailingIcon={null}>
              Hover for help
            </Button>
          </Tooltip>
        </div>
        <div className="preview-grid">
          <div data-reference="progress">
            <ProgressBar value={13.75} aria-label="Reference progress" />
          </div>
          <ProgressBar value={64} showValue aria-label="Ingestion progress" />
          <div data-reference="spinner">
            <Spinner />
          </div>
        </div>
      </section>
      <section className="preview-section">
        <h2>Tabs</h2>
        <Tabs label="Profile sections" defaultValue="details" items={items} />
      </section>
      <section className="preview-section">
        <h2>Vertical tabs</h2>
        <div className="preview-grid">
          {verticalTabVariants.flatMap((variant) =>
            (["sm", "md"] as const).map((size) => (
              <VerticalTabs
                key={variant + size}
                variant={variant}
                size={size}
                label={variant + " " + size + " sections"}
                items={[
                  { value: "details", label: "My details", content: "Details panel" },
                  { value: "profile", label: "Profile", content: "Profile panel" },
                  { value: "password", label: "Password", content: "Password panel" },
                  { value: "team", label: "Team", content: "Team panel" },
                  { value: "plan", label: "Plan", content: "Plan panel" },
                  { value: "billing", label: "Billing", content: "Billing panel" },
                  { value: "email", label: "Email", content: "Email panel" },
                  {
                    value: "notifications",
                    label: "Notifications",
                    badge: 2,
                    content: "Notifications panel",
                  },
                  { value: "integrations", label: "Integrations", content: "Integrations panel" },
                  { value: "api", label: "API", content: "API panel" },
                ]}
              />
            ))
          )}
        </div>
      </section>
      <NavigationFixtures />
      <GroupFixtures />
      {requestedFamily === "all" && (
        <>
          <IconFixtures />
          <AlertFixtures />
          <NotificationFixtures />
          <UploadFixtures />
          <TooltipFixtures />
          <IndicatorFixtures />
          <SliderFixtures />
          <CodeFixtures />
          <AvatarPatternFixtures />
        </>
      )}
      <section className="preview-section">
        <h2>Dialog</h2>
        <Dialog
          decorative
          featuredIcon={<FigmaAsset name="success" />}
          trigger={
            <Button leadingIcon={null} trailingIcon={null}>
              Open dialog
            </Button>
          }
          title="Blog post published"
          description="This blog post has been published. Team members will be able to edit this post and republish changes."
          actions={
            <>
              <DialogClose asChild>
                <Button size="lg" variant="secondary" leadingIcon={null} trailingIcon={null}>
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button size="lg" leadingIcon={null} trailingIcon={null}>
                  Confirm
                </Button>
              </DialogClose>
            </>
          }
        />
      </section>
    </main>
  );
}
const root = document.getElementById("root");
if (!root) throw new Error("Missing component preview root");
createRoot(root).render(
  <ThemeProvider>
    <Preview />
  </ThemeProvider>
);
