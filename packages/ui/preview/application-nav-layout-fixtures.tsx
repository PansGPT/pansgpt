import type { CSSProperties, ReactNode } from "react";
import {
  ApplicationHeaderNavigation,
  ApplicationSidebarNavigation,
  ApplicationNavPanel,
  ApplicationNavItem,
  ApplicationNavDropdown,
  ApplicationNavIconButton,
  ApplicationNavAccountCard,
  Avatar,
  Badge,
  Button,
  Input,
  type ApplicationSidebarNavigationProps,
} from "../src";
import {
  ApplicationNavigationAsset,
  applicationNavigationAssetUrl,
  type ApplicationNavigationAssetName,
} from "../src/components/application-navigation-assets";
import {
  applicationNavLayouts,
  type NavLayoutNode,
  type NavLayoutSource,
} from "./application-nav-layout-data";
import { NavFeaturedFixture } from "./nav-featured-fixtures";
import { ApplicationNavAccountReference } from "./application-nav-account-reference";

function all(nodes: NavLayoutNode[], predicate: (node: NavLayoutNode) => boolean): NavLayoutNode[] {
  return nodes.flatMap((node) => [
    ...(predicate(node) ? [node] : []),
    ...all(node.children ?? [], predicate),
  ]);
}
function first(nodes: NavLayoutNode[], name: string): NavLayoutNode | undefined {
  return all(nodes, (node) => node.name === name)[0];
}
function paragraphs(nodes: NavLayoutNode[]): string[] {
  return all(nodes, (node) => node.tag === "p").map((node) =>
    all([node], (child) => child.text != null)
      .map((child) => child.text)
      .join(" ")
  );
}
function assetName(value: string | null | undefined): ApplicationNavigationAssetName | undefined {
  if (!value) return undefined;
  try {
    applicationNavigationAssetUrl(value as ApplicationNavigationAssetName);
    return value as ApplicationNavigationAssetName;
  } catch {
    return undefined;
  }
}
function image(node?: NavLayoutNode): ReactNode {
  const name = assetName(node?.asset);
  return name ? <ApplicationNavigationAsset name={name} /> : null;
}
function images(nodes: NavLayoutNode[]): NavLayoutNode[] {
  return all(nodes, (node) => node.asset != null);
}
function sourceSpacing(style = ""): CSSProperties {
  const spacing: CSSProperties = {};
  for (const [prefix, property] of [
    ["pt", "paddingTop"],
    ["pb", "paddingBottom"],
    ["gap", "gap"],
  ] as const) {
    const match = style.match(new RegExp(`${prefix}-\\[(?:var\\([^,]+,)?([0-9.]+)px\\)?\\]`));
    if (match) spacing[property] = Number(match[1]);
  }
  return spacing;
}
function SourceNavigation({
  nodes,
  sourceId,
  onAction,
}: {
  nodes: NavLayoutNode[];
  sourceId: string;
  onAction: (label: string) => void;
}): React.ReactElement {
  function render(node: NavLayoutNode, index: number): ReactNode {
    const key = `${node.id ?? node.name}-${index}`;
    if (node.name === "_Nav item dropdown base") {
      const bases = all(node.children ?? [], (item) => item.name === "_Nav item base");
      const header = bases[0];
      const labels = paragraphs(header?.children ?? []);
      const icons = images(header?.children ?? []);
      const current = (first(header?.children ?? [], "Content")?.style ?? "").includes("bg-active");
      return (
        <ApplicationNavDropdown
          key={key}
          label={labels[0]}
          icon={image(icons[0])}
          current={current}
          badge={labels[1] ? <Badge>{labels[1]}</Badge> : undefined}
          defaultOpen={bases.length > 1}
          contentId={`${sourceId}-${index}-${node.id}`}
        >
          <SourceNavigation
            nodes={bases.slice(1)}
            sourceId={`${sourceId}-${index}`}
            onAction={onAction}
          />
        </ApplicationNavDropdown>
      );
    }
    if (node.name === "_Nav item base") {
      const labels = paragraphs(node.children ?? []);
      const icons = images(node.children ?? []);
      const content = first(node.children ?? [], "Content");
      const main = first(node.children ?? [], "Text and icon");
      const mainImages = images(main?.children ?? []);
      const mainAssets = new Set(mainImages.map((item) => item.asset));
      const trailingImages = icons.filter((item) => !mainAssets.has(item.asset));
      return (
        <ApplicationNavItem
          key={key}
          href={`#${labels[0]?.toLowerCase().replaceAll(" ", "-")}`}
          onClick={() => onAction(labels[0] ?? "Navigation")}
          current={(content?.style ?? "").includes("bg-active")}
          icon={image(mainImages[0])}
          badge={
            labels[1] ? (
              labels[1].startsWith("⌘") ? (
                <kbd className="nav-layout-shortcut">{labels[1]}</kbd>
              ) : (
                <Badge
                  variant={labels[1] === "Online" ? "modern" : "pill"}
                  leading={labels[1] === "Online" ? image(trailingImages[0]) : undefined}
                >
                  {labels[1]}
                </Badge>
              )
            ) : undefined
          }
          trailing={image(trailingImages.find((item) => /Chevron|Share/.test(item.asset ?? "")))}
        >
          {labels[0]}
        </ApplicationNavItem>
      );
    }
    if (node.name === "_Nav item button") {
      const icon = images(node.children ?? [])[0];
      const label =
        icon?.asset
          ?.replace(/^source\d+_img/, "")
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/\d+$/, "") ?? "Navigation";
      return (
        <ApplicationNavIconButton
          key={key}
          aria-label={label}
          icon={image(icon)}
          current={(node.style ?? "").includes("bg-active")}
          onClick={() => onAction(label)}
        />
      );
    }
    if (node.name === "Divider wrapper")
      return (
        <div key={key} className="nav-layout-divider">
          {image(images(node.children ?? [])[0])}
        </div>
      );
    if (node.name === "Subheading" || node.name === "Subheading wrapper")
      return (
        <div key={key} className="nav-layout-source-subheading" style={sourceSpacing(node.style)}>
          {paragraphs(node.children ?? []).join(" ")}
        </div>
      );
    if (node.name === "Section")
      return (
        <div key={key} className="nav-layout-source-section" style={sourceSpacing(node.style)}>
          {node.children?.map(render)}
        </div>
      );
    return node.children?.map(render);
  }
  return <>{nodes.map(render)}</>;
}
export function ApplicationNavLayoutFixture({
  id,
  onAction,
}: {
  id: string;
  onAction: (label: string) => void;
}): React.ReactElement {
  const source = applicationNavLayouts.find((item) => item.id === id)!;
  const mobile = source.name.includes("Breakpoint=Mobile");
  const open = source.name.includes("Open=True");
  const slim = source.name.includes("Style=Slim") && !mobile;
  const variant: ApplicationSidebarNavigationProps["variant"] = source.name.includes(
    "Style=Dual-tier"
  )
    ? "dual-tier"
    : source.name.includes("Style=Slim")
      ? "slim"
      : source.name.includes("Style=Sections dividers")
        ? "sections-dividers"
        : source.name.includes("Style=Sections subheadings")
          ? "sections-subheadings"
          : "simple";
  const root = source.nodes[0]!;
  const panel = first(root.children ?? [], "Content") ?? root;
  const top = (panel.children ?? []).find(
    (node) => node.name === "Navigation" || node.name === "Nav"
  );
  const header = first(top?.children ?? [], "Header");
  const links = (top?.children ?? []).find((node) => node.name === "Navigation");
  const footer = first(panel.children ?? [], "Footer");
  const secondary = first(root.children ?? [], "Sub nav");
  const logoNode = first(header?.children ?? source.nodes, "Logo") ?? first(source.nodes, "Logo");
  const logoImage = images(logoNode ? [logoNode] : (header?.children ?? source.nodes)).find(
    (node) => /Favicon/.test(node.asset ?? "")
  );
  const logo = (
    <a
      className="nav-layout-source-logo"
      href="#home"
      aria-label="PansGPT home"
      data-slim={slim}
      onClick={() => onAction("Home")}
    >
      {image(logoImage)}
      {!slim && <span>PansGPT</span>}
    </a>
  );
  const searchNode = first(header?.children ?? source.nodes, "Select");
  const searchName = assetName(
    images(searchNode ? [searchNode] : source.nodes).find((node) =>
      /SearchLg/.test(node.asset ?? "")
    )?.asset
  );
  const search = (
    <Input
      className="nav-layout-search"
      type="search"
      placeholder="Search"
      aria-label="Search navigation"
      leadingIcon={searchName ? <ApplicationNavigationAsset name={searchName} /> : undefined}
      trailingAddon={<kbd className="nav-layout-search-shortcut">⌘K</kbd>}
    />
  );
  const accountNode = first(footer?.children ?? [], "_Nav account card");
  const accountTexts = paragraphs(accountNode?.children ?? []);
  const avatarName = assetName(
    images(accountNode?.children ?? footer?.children ?? source.nodes).find((node) =>
      /imgAvatar\d*$/.test(node.asset ?? "")
    )?.asset
  );
  const account = {
    id: "chioma",
    name: accountTexts[0] ?? "Diepreye Ọ̀rẹ̀kọ́yà",
    email: accountTexts[1] ?? "chioma@PansGPT.com",
    avatarSrc: avatarName ? applicationNavigationAssetUrl(avatarName) : undefined,
    online: true,
  };
  const accountCard = slim ? (
    <Avatar label={account.name} size="md" src={account.avatarSrc} status="online" />
  ) : first(accountNode?.children ?? [], "Menu") ? (
    <ApplicationNavAccountReference
      id={`${id}-account-menu`}
      name="Type=Card, Open=True, Breakpoint=Desktop"
      accounts={[
        account,
        {
          id: "ngozi",
          name: "Fatimah Ọ̀ṣúntókun",
          email: "ngozi@PansGPT.com",
          avatarSrc: applicationNavigationAssetUrl("source3_imgAvatar1"),
          online: true,
        },
      ]}
      actions={[
        {
          id: "profile",
          label: "View profile",
          shortcut: "⌘K->P",
          icon: <ApplicationNavigationAsset name="source3_imgUser01" />,
          onSelect: () => onAction("View profile"),
        },
        {
          id: "settings",
          label: "Account settings",
          shortcut: "⌘S",
          icon: <ApplicationNavigationAsset name="source3_imgSettings01" />,
          onSelect: () => onAction("Account settings"),
        },
        {
          id: "documentation",
          label: "Documentation",
          icon: <ApplicationNavigationAsset name="source3_imgBookOpen01" />,
          onSelect: () => onAction("Documentation"),
        },
      ]}
      onAction={onAction}
    />
  ) : (
    <ApplicationNavAccountCard
      account={account}
      type={variant === "slim" ? "simple" : "card"}
      breakpoint={mobile ? "mobile" : "desktop"}
      onSignOut={() => onAction("Sign out")}
      onAddAccount={() => onAction("Add account")}
      actions={[
        { id: "settings", label: "Account settings", onSelect: () => onAction("Account settings") },
      ]}
    />
  );
  const navigation = (
    <SourceNavigation nodes={links?.children ?? []} sourceId={id} onAction={onAction} />
  );
  const footerNavigation = (
    <SourceNavigation
      nodes={first(footer?.children ?? [], "Navigation")?.children ?? []}
      sourceId={`${id}-footer`}
      onAction={onAction}
    />
  );
  const featured = first(footer?.children ?? [], "_Nav featured card");
  const featuredTexts = paragraphs(featured?.children ?? []);
  const featuredCard = featured ? (
    <NavFeaturedFixture
      name={featuredTexts[0] === "80%" ? "Type=Progress circle" : "Type=Progress bar"}
      onAction={onAction}
    />
  ) : undefined;
  if (source.familyId === "1207:1678")
    return (
      <HeaderFixture
        source={source}
        logo={logo}
        search={search}
        onAction={onAction}
        mobilePanel={
          <ApplicationNavPanel
            className="nav-layout-header-panel"
            logo={logo}
            search={search}
            navigation={navigation}
            footerNavigation={footerNavigation}
            account={accountCard}
          />
        }
      />
    );
  return (
    <ApplicationSidebarNavigation
      className="nav-layout-source-sidebar"
      style={mobile ? undefined : { height: 960 }}
      breakpoint={mobile ? "mobile" : "desktop"}
      variant={variant}
      open={open}
      reference
      onOpenChange={(next) => onAction(next ? "Open navigation" : "Close navigation")}
      logo={logo}
      search={searchNode ? search : undefined}
      navigation={navigation}
      footerNavigation={first(footer?.children ?? [], "Navigation") ? footerNavigation : undefined}
      featured={featuredCard}
      account={accountCard}
      subnavigation={
        <SourceNavigation
          nodes={secondary?.children ?? []}
          sourceId={`${id}-secondary`}
          onAction={onAction}
        />
      }
      subheading={slim && open ? "Dashboard" : undefined}
      subaccount={
        slim && open ? (
          <ApplicationNavAccountCard
            type="simple"
            account={account}
            onSignOut={() => onAction("Sign out")}
          />
        ) : undefined
      }
    />
  );
}
function HeaderFixture({
  source,
  logo,
  search,
  mobilePanel,
  onAction,
}: {
  source: NavLayoutSource;
  logo: ReactNode;
  search: ReactNode;
  mobilePanel: ReactNode;
  onAction: (label: string) => void;
}): React.ReactElement {
  const mobile = source.name.includes("Mobile");
  const simple = source.name.includes("Style=Simple");
  const nav = first(source.nodes, "Navigation");
  const subnav = first(source.nodes, "Sub navigation");
  const actions = first(source.nodes, "Actions");
  const avatarName = assetName(
    images(source.nodes).find((node) => /imgAvatar$/.test(node.asset ?? ""))?.asset
  );
  return (
    <ApplicationHeaderNavigation
      breakpoint={mobile ? "mobile" : "desktop"}
      variant={simple ? "simple" : "dual-tier"}
      open={source.name.includes("Open=True")}
      onOpenChange={(next) => onAction(next ? "Open navigation" : "Close navigation")}
      reference
      logo={logo}
      navigation={
        <SourceNavigation nodes={nav?.children ?? []} sourceId={source.id} onAction={onAction} />
      }
      actions={
        <>
          {!simple && (
            <Button
              className="nav-layout-upgrade"
              size="sm"
              variant="secondary"
              leadingIcon={<ApplicationNavigationAsset name="source7_imgZap" />}
              trailingIcon={null}
              onClick={() => onAction("Upgrade now")}
            >
              Upgrade now
            </Button>
          )}
          <div className="nav-layout-header-actions">
            <SourceNavigation
              nodes={actions?.children ?? []}
              sourceId={`${source.id}-actions`}
              onAction={onAction}
            />
          </div>
          <button
            type="button"
            className="nav-layout-avatar-button"
            aria-label="Open account menu"
            onClick={() => onAction("Account menu")}
          >
            <Avatar
              size="md"
              label="Account"
              src={avatarName ? applicationNavigationAssetUrl(avatarName) : undefined}
            />
          </button>
        </>
      }
      subnavigation={
        <SourceNavigation
          nodes={subnav?.children ?? []}
          sourceId={`${source.id}-secondary`}
          onAction={onAction}
        />
      }
      search={search}
      mobileNavigation={mobilePanel}
    />
  );
}
