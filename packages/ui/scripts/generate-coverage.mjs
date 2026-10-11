import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const inventory = JSON.parse(await readFile(new URL("design/figma-components.json", root), "utf8"));
const excluded = new Set([
  "Logos",
  "Misc icons",
  "Header navigation",
  "Header sections",
  "Pricing sections",
  "CTA sections",
  "Metrics sections",
  "Newsletter CTA sections",
  "Testimonial sections",
  "Social proof sections",
  "Contact sections",
  "FAQ sections",
  "Footers",
  "Team sections",
  "Banners",
  "Miscellaneous assets",
  "Email templates",
  "Background elements",
  "Dashboards 01",
  "Dashboards 02",
  "Settings pages 01",
  "Settings pages 02",
  "Informational pages 01",
  "Informational pages 02",
]);
const implementations = new Map([
  ["_Swatch base", "ColorSwatch"],
  ["_Swatch base gradient", "GradientSwatch"],
  ["_Type scale base", "TypeScaleSpecimen"],
  ["_Shadow card", "ShadowCard"],
  ["_Focus ring card", "FocusRingCard"],
  ["_Blur card", "BlurCard"],
  ["_Radius card", "RadiusCard"],
  ["_Radius example", "RadiusExample"],
  ["_Container", "ContainerSpecimen"],
  ["_Key", "Keycap"],
  ["Numeric key", "NumericKey"],
  ["Numeric key combo", "NumericKeyCombo"],
  ["Design system footer", "DesignSystemFooter"],
  ["Design note", "DesignNote"],
  ["Figma Variables note", "FigmaVariablesNote"],
  ["Design system header", "DesignSystemHeader"],
  ["Measure + spacing guide", "MeasureSpacingGuide"],
  ["_Measure line base", "MeasureLine"],
  ["_Variables icon", "VariablesIcon"],
  ["_Documentation table cell", "DocumentationTableCell"],
  ["Cursor", "DesignCursor"],
  ["_Date picker list item", "DatePickerListItem"],
  ["_Date picker menu", "DatePickerMenu"],
  ["Date picker dropdown", "DatePickerDropdown"],
  ["Date picker modal", "DatePickerModal"],
  ["_Calendar cell", "DatePickerDay"],
  ["_Calendar view dropdown", "CalendarViewDropdown"],
  ["_Calendar header", "CalendarHeader"],
  ["_Calendar date icon", "CalendarDateIcon"],
  ["_Calendar cell date", "CalendarCellDate"],
  ["_Calendar event/Month view", "CalendarMonthEvent"],
  ["_Calendar cell/Month view", "CalendarMonthCell"],
  ["_Calendar event/Day and week view", "CalendarDayEvent"],
  ["_Calendar cell/Day and week view", "CalendarTimeCell"],
  ["_Calendar column header", "CalendarColumnHeader"],
  ["_Calendar row label", "CalendarRowLabel"],
  ["_Calendar time marker", "CalendarTimeMarker"],
  ["Calendar", "Calendar / CalendarEventDetails"],
  ["Header navigation", "ApplicationHeaderNavigation / ApplicationMobileNavigation"],
  ["Sidebar navigation", "ApplicationSidebarNavigation / ApplicationNavPanel / ApplicationNavSection"],
  ["_Nav featured card", "NavFeaturedCard / NavFeaturedCardText / NavFeaturedCardGroup"],
  ["_Application nav menu button", "ApplicationNavMenuButton"],
  ["_Nav item button", "ApplicationNavIconButton"],
  ["_Nav item base", "ApplicationNavItem"],
  ["_Nav item dropdown base", "ApplicationNavDropdown"],
  ["_Nav account card menu item", "ApplicationNavAccountMenuItem"],
  ["_Nav account card", "ApplicationNavAccountCard / ApplicationNavAccountCardButton"],
  ["_Table header label", "TableHeaderLabel"],
  ["Table header cell", "TableHeaderCell"],
  ["Table cell", "TableCell / TableText / TableRating"],
  ["Table", "DataTable"],
  ["Table cell lead action", "TableCellLeadAction"],
  ["_X-axis label", "ChartAxisLabel"],
  ["_Y-axis label", "ChartAxisLabel"],
  ["_X-axis", "ChartXAxis"],
  ["_Chart data", "ChartDataReference / LineBarChart"],
  ["Line and bar chart", "LineBarChart / LineBarChartReference"],
  ["_Y-axis line", "ChartYAxisLine"],
  ["_Legend", "ChartLegend"],
  ["_Y-axis", "ChartYAxis"],
  ["_Activity gauge", "ActivityGauge / ActivityGaugeReference"],
  ["Activity gauge", "ActivityGauge / ActivityGaugeReference"],
  ["_Pie chart", "PieChart / PieChartReference"],
  ["Pie chart", "PieChart / PieChartReference"],
  ["_Radar chart", "RadarChart / RadarChartReference"],
  ["Radar chart", "RadarChart / RadarChartReference"],
  ["Chart marker", "ChartMarker"],

  ["_Slide out menu header", "SlideoutHeader"],
  ["Slide out menu", "Slideout / SlideoutSurface / SlideoutBody / SlideoutFooter / SlideoutSection / CreditCardPreview"],
  ["Message", "Message / MessageBubble / MessageReply / MessageImage / MessageLink / MessageTypingIndicator / AudioPlayer"],
  ["_Message reaction", "MessageReaction"],
  ["_Message action panel", "MessageActionPanel"],
  ["_Message action button", "MessageActionButton"],
  ["Message action", "MessageComposer"],
  ["_Message status icon", "MessageStatusIcon"],
  ["_Feed item base", "FeedItem / FeedMessage / FeedLabels / FeedAttachment"],
  ["Activity feed", "ActivityFeed"],
  ["_Video volume slider handle", "VideoVolumeHandleReference"],
  ["_Video volume slider", "VideoVolumeSlider"],
  ["_Video action button", "VideoActionButton"],
  ["_Video actions bar", "VideoActionsBar"],
  ["Video player 16:9", "VideoPlayer / VideoPlayerSurface"],
  ["_Video timestamp indicator", "VideoTimestampIndicator"],
  ["_Video overlay action", "VideoOverlayAction"],
  ["_Video action tooltip", "VideoActionTooltip"],
  ["Metric item", "MetricItem"],
  ["_Chart mini", "MiniChart / Sparkline / MetricChartReference"],
  ["_Change", "MetricChange"],
  ["Inline CTA", "InlineCTA / InlineCTAEmailCapture / InlineCTAPlan / InlineCTAFeatures / InlineCTAPaymentMethod / InlineCTAReceipt"],
  ["Command bar", "CommandBar / CommandDialog"],
  ["_Command dropdown menu item", "CommandMenuItem"],
  ["_Command shortcut", "CommandShortcut"],
  ["_Command input", "CommandInput"],
  ["_Command bar menu section", "CommandMenuSection"],
  ["_Command menu header", "CommandMenuHeader"],
  ["_Command bar footer", "CommandFooter"],
  ["_Command bar navigation icon", "CommandNavigationKey"],
  ["Section label", "SectionLabel"],
  ["Section header", "SectionHeader / SectionHeaderSearch"],
  ["Page header", "PageHeader"],
  ["Text editor", "TextEditor"],
  ["_Text editor icon", "TextEditorIcon"],
  ["_Color select", "EditorColorSelect"],
  ["Text editor toolbar", "TextEditorToolbar"],
  ["Text editor tooltip", "TextEditorTooltip"],
  ["Text highlight", "TextHighlight"],
  ["_Scroll bar (control fill with bottom padding)", "ScrollbarReference"],
  ["Card header", "CardHeader"],
  ["Section footer", "SectionFooter"],
  ["Alert", "Alert"],
  ["Notification", "Notification"],
  ["File upload", "FileUpload"],
  ["_File upload base", "FileDropzone"],
  ["_File upload item base", "FileUploadItem"],
  ["_Tag checkbox", "Tag"],
  ["_Tag close X", "Tag"],
  ["_Tag count", "Tag"],
  ["Breadcrumbs", "Breadcrumbs"],
  ["_Breadcrumb button base", "Breadcrumbs"],
  ["Avatar", "Avatar"],
  ["_Avatar company icon", "Avatar"],
  ["_Avatar online indicator", "Avatar"],
  ["Verified tick", "Avatar"],
  ["Radio group", "RadioGroup"],
  ["Radio group item", "RadioGroup"],
  ["Buttons/Button", "Button"],
  ["Buttons/Button destructive", "Button"],
  ["Buttons/Button loading icon", "Button"],
  ["Input field", "Input"],
  ["Textarea input field", "Textarea"],
  ["_Modal actions", "Dialog"],
  ["_Modal header", "Dialog"],
  ["Button", "Button"],
  ["Input", "Input"],
  ["Textarea input", "Textarea"],
  ["Textarea", "Textarea"],
  ["Checkbox", "Checkbox"],
  ["_Checkbox base", "Checkbox / RadioGroup"],
  ["Toggle", "Toggle"],
  ["_Toggle base", "Toggle"],
  ["Badge", "Badge"],
  ["Tag", "Tag"],
  ["Select", "Select"],
  ["_Select menu item", "Select"],
  ["Tooltip", "Tooltip"],
  ["Help icon", "HelpIcon"],
  ["Slider", "Slider"],
  ["_Control handle", "Slider / SliderHandleReference"],
  ["_Mega input field base", "VerificationCodeSlot"],
  ["Verification code input field", "VerificationCodeInput"],
  ["Avatar group", "AvatarGroup"],
  ["Avatar label group", "AvatarLabelGroup"],
  ["_Avatar add button", "AvatarAddButton / AvatarAddButtonReference"],
  ["Avatar profile photo", "AvatarProfilePhoto"],
  ["_Avatar image", "AvatarImage"],
  ["Buttons/Button close X", "CloseButton / CloseButtonReference"],
  ["Buttons/Button utility", "UtilityButton / UtilityButtonReference"],
  ["Mobile app store badge", "AppStoreBadge"],
  ["Social button", "SocialButton / SocialButtonReference"],
  ["Social button groups", "SocialButtonGroup"],
  ["Badge group", "BadgeGroup / BadgeGroupReference"],
  ["_Badge close X", "BadgeCloseButton / BadgeCloseButtonReference"],
  ["_Tab button base", "TabButton / TabButtonReference"],
  ["_Carousel arrow", "CarouselArrow"],
  ["Carousel image", "CarouselImage"],
  ["Empty state", "EmptyState"],
  ["Illustration", "Illustration"],
  ["Code snippet", "CodeSnippet"],
  ["_Code snippet tabs", "CodeSnippetTabButton / CodeSnippetTabReference"],
  ["_Step icon base", "StepIcon"],
  ["_Step base", "ProgressStep"],
  ["Progress steps / Progress minimal icons connected", "ProgressSteps"],
  ["Progress steps / Progress minimal icons", "ProgressSteps"],
  ["Progress steps / Progress text with line", "ProgressSteps"],
  ["Progress steps / Progress icons centered", "ProgressSteps"],
  ["Progress steps / Progress icons with text", "ProgressSteps"],
  ["Progress bar", "ProgressBar"],
  ["Progress circle", "ProgressCircle"],
  ["Loading indicator", "Spinner"],
  ["Modal", "Dialog"],
  ["Modal action", "Dialog"],
  ["Horizontal tabs", "Tabs"],
  ["Vertical tabs", "VerticalTabs"],
  ["Dropdown", "Dropdown / DropdownButton / DropdownContent"],
  ["_Dropdown list header", "DropdownHeader"],
  ["_Dropdown list item", "DropdownItem / DropdownCheckboxItem / DropdownSeparator"],
  ["Pagination", "Pagination"],
  ["_Pagination number base", "Pagination"],
  ["_Pagination button group base", "Pagination"],
  ["Pagination dot group", "PaginationDots"],
  ["_Pagination dot indicator", "PaginationDots"],
  ["Button group", "ButtonGroup / ButtonGroupButton / SegmentedControl"],
  ["_Button group base", "ButtonGroupButton / SegmentedControl"],
  ["Content divider", "ContentDivider"],
]);
const pages = inventory.pages.map((page) => {
  const name = page.page.name.replace(/^[\s↳❖]+/, "");
  const inScope = !excluded.has(name) && name !== "Thumbnail" && name !== "APPLICATION COMPONENTS";
  return {
    id: page.page.id,
    name,
    inScope,
    families: page.families.map((family) => ({
      id: family.id,
      name: family.name,
      defaultId: family.defaultId,
      variantCount: family.variantCount,
      status: !inScope
        ? "excluded"
        : page.page.id === "3463:407484"
          ? "asset-ready"
          : implementations.has(family.name)
            ? "partial"
            : "pending",
      ...(page.page.id === "3463:407484"
        ? {
            codeExport: "FigmaIcon / figmaIcons / figmaIconUrl",
            implementedSubset:
              "Original SVG exported without alteration; typed registry, source-ID manifest, searchable preview and intrinsic-size browser verification.",
            remainingSubset:
              "Product integration and context-specific accessibility labels; source colors are preserved rather than automatically themed.",
          }
        : {}),
      ...(inScope && implementations.has(family.name)
        ? { codeExport: implementations.get(family.name) }
        : {}),
      ...(inScope && family.name === "Badge"
        ? {
            implementedSubset:
              "All 666 source combinations: text/dot, avatar, country, close action, leading/trailing icons and icon-only badges in all three sizes and source palettes.",
            remainingSubset:
              "Application integration and remaining visual audit sign-off; all 666 source frames and original glyph geometry pass browser checks.",
          }
        : {}),
      ...(inScope && family.name === "Vertical tabs"
        ? {
            implementedSubset:
              "Five layout styles, two sizes, desktop tab lists and mobile selects sharing selection state.",
            remainingSubset: "Production hover/focus, theme and selected-badge comparisons across both tab components.",
          }
        : {}),
      ...(inScope && family.name === "Checkbox"
        ? {
            implementedSubset:
              "Both sizes, checked/mixed states, labels, supporting text, enabled/disabled SVGs, and native hover/focus behavior; plain radio choices use RadioGroup.",
            remainingSubset:
              "Standalone radio-only fixtures and full per-variant visual comparisons.",
          }
        : {}),
      ...(inScope && family.name === "Toggle"
        ? {
            implementedSubset:
              "Default/slim styles, both sizes, labels/supporting text, checked and disabled states, hover colors and focus rings.",
            remainingSubset: "Full per-state visual comparisons for the 64 family variants.",
          }
        : {}),
      ...(inScope && family.name === "Dropdown"
        ? {
            implementedSubset:
              "Button/icon/avatar triggers, open/closed fixtures, account menu groups, original local assets, keyboard selection and focus restoration.",
            remainingSubset:
              "Full per-state visual comparisons and composed-menu variant verification.",
          }
        : {}),
      ...(inScope && family.name === "_Dropdown list item"
        ? {
            implementedSubset:
              "Text, icon, checkbox, shortcut and divider rows; hover and disabled states; native link actions and controlled checkbox selection.",
            remainingSubset:
              "Dedicated comparisons for every source state and the standalone 240 px divider asset.",
          }
        : {}),
      ...(inScope && family.name === "Pagination"
        ? {
            implementedSubset:
              "24 source layout/shape/breakpoint fixtures, controlled/uncontrolled paging, responsive state continuity, ellipses and disabled boundaries.",
            remainingSubset:
              "Full per-variant visual comparisons, including hover/focus and theme states.",
          }
        : {}),
      ...(inScope && family.name === "Pagination dot group"
        ? {
            implementedSubset:
              "Eight dot/line, size and framed variants with keyboard selection and exact source geometry.",
            remainingSubset: "Full per-theme visual comparisons and standalone indicator exports.",
          }
        : {}),
      ...(inScope && family.name === "Empty state"
        ? {
            implementedSubset:
              "All 12 fixed source layouts, four treatments across three sizes, original icons/patterns, caller-supplied actions and accessible titles.",
            remainingSubset:
              "Fine hover/focus comparisons and application use across all production themes; reference action widths remain source-only.",
          }
        : {}),
      ...(inScope && family.name === "Illustration"
        ? {
            implementedSubset:
              "All 12 original cloud, box, documents and credit-card graphics at three native source sizes.",
            remainingSubset:
              "Product integration and production theme review; original artwork retains its source colors.",
          }
        : {}),
      ...(inScope && family.name === "Code snippet"
        ? {
            implementedSubset:
              "Both source layouts, local Roboto Mono, numbered code, clipboard errors, controlled language tabs, disabled selection and expandable content.",
            remainingSubset:
              "Syntax highlighting is caller-supplied; compare remaining per-theme source states and integrate into product code views.",
          }
        : {}),
      ...(inScope && family.name === "_Code snippet tabs"
        ? {
            implementedSubset:
              "All six current/idle default, hover and focus source states; live tabs use Radix selection and the original focus color.",
            remainingSubset:
              "Product integration and fine per-theme state comparison.",
          }
        : {}),
      url:
        "https://www.figma.com/design/" +
        inventory.fileKey +
        "/PansGPT?node-id=" +
        family.id.replace(":", "-"),
    })),
  };
});
assert.equal(
  pages.filter((page) => excluded.has(page.name)).length,
  excluded.size,
  "Exclusion does not match an audited page"
);
const families = pages.flatMap((page) => page.families);
const counts = Object.fromEntries(
  ["excluded", "asset-ready", "partial", "pending"].map((status) => [
    status,
    families.filter((family) => family.status === status).length,
  ])
);
const ledger = {
  fileKey: inventory.fileKey,
  updated: "2026-10-10",
  definitions: {
    "asset-ready":
      "Every original SVG in the family is exported locally with a typed registry and source integrity checks. This status applies to static icon masters, not interactive component variant completion.",
    partial:
      "A reusable implementation exists. Remaining source variants, production state/theme comparisons, or integration checks are still required; a full source fixture matrix alone does not mark a family complete.",
    pending:
      "Family metadata is archived; React implementation and high-fidelity visual inspection are outstanding.",
    excluded: "Excluded by the user, or a file organization/thumbnail page.",
  },
  counts,
  pages,
};
const markdown = [
  "# Figma coverage",
  "",
  "Generated from the archived whole-file inventory and the user's exclusions.",
  "",
  "No family is marked complete until its in-scope variants and assets have been checked. Partial means a reusable default/subset exists, not that the entire Figma family has been ported.",
  "",
  `Whole-file discovery: 88 pages, 1,921 families, 7,649 component/variant nodes. The ${excluded.size} requested page exclusions are applied below, including Logos and all 478 Misc icons families. All 1,173 main Icons page SVG masters are exported locally. Original assets already used inside included components are retained.`,
  "",
  `Family status: ${counts["asset-ready"]} asset-ready, ${counts.partial} partial, ${counts.pending} pending, ${counts.excluded} excluded.`,
  "",
  "| Page | Scope | Families | Asset-ready | Partial | Pending |",
  "| --- | --- | ---: | ---: | ---: | ---: |",
  ...pages.map(
    (page) =>
      `| ${page.name} | ${page.inScope ? "Include" : "Exclude"} | ${page.families.length} | ${page.families.filter((f) => f.status === "asset-ready").length} | ${page.families.filter((f) => f.status === "partial").length} | ${page.families.filter((f) => f.status === "pending").length} |`
  ),
  "",
  "Per-family IDs, code exports, Figma links, and statuses are in [coverage.json](coverage.json). Variant dimensions and component-property defaults are in [the source inventory](../../packages/ui/design/figma-components.json).",
  "",
  "The top-level discovery sample is not a complete screen tree. Full screen/layout auditing remains outstanding for included application patterns. The 990 paint-style definitions, 785 variables, 44 text styles, and 24 effect styles are archived. Image hashes in the paint archive do not constitute exported bitmap files or complete CSS mappings.",
  "",
].join("\n");
const outputs = [
  [new URL("../../docs/design-system/coverage.json", root), JSON.stringify(ledger, null, 2) + "\n"],
  [new URL("../../docs/design-system/coverage.md", root), markdown],
];
for (const [target, output] of outputs) {
  if (process.argv.includes("--check"))
    assert.equal(await readFile(target, "utf8"), output, "Coverage ledger is stale");
  else await writeFile(target, output);
}
console.log("Coverage: " + JSON.stringify(counts));
