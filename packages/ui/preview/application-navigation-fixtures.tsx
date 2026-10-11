import { ApplicationNavLiveMobile } from "./application-nav-live-mobile";
import { ApplicationNavLayoutFixture } from "./application-nav-layout-fixtures";
import { useState } from "react";
import {
  ApplicationNavAccountCard,
  ApplicationNavAccountMenuItem,
  ApplicationNavDropdown,
  ApplicationNavIconButton,
  ApplicationNavItem,
  ApplicationNavItemReference,
  ApplicationNavMenuButton,
  type ApplicationNavState,
  type NavigationAccount,
} from "../src";
import {
  ApplicationNavigationAsset,
  applicationNavigationAssetUrl,
} from "../src/components/application-navigation-assets";
import { applicationNavigationSources } from "./application-navigation-source-data";
import { ApplicationNavAccountReference } from "./application-nav-account-reference";
import { NavFeaturedFixture } from "./nav-featured-fixtures";

export function ApplicationNavigationFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [expanded, setExpanded] = useState(false);
  const accounts: NavigationAccount[] = [
    {
      id: "chioma",
      name: "Diepreye Ọ̀rẹ̀kọ́yà",
      email: "chioma@PansGPT.com",
      online: true,
      avatarSrc: applicationNavigationAssetUrl("source3_imgAvatar"),
    },
    {
      id: "ngozi",
      name: "Fatimah Ọ̀ṣúntókun",
      email: "ngozi@PansGPT.com",
      online: true,
      avatarSrc: applicationNavigationAssetUrl("source3_imgAvatar1"),
    },
  ];
  const [accountId, setAccountId] = useState(accounts[0]!.id);
  const account = accounts.find((item) => item.id === accountId)!;
  const actions = [
    {
      id: "profile",
      label: "View profile",
      shortcut: "⌘K->P",
      icon: <ApplicationNavigationAsset name="source3_imgUser01" />,
      onSelect: () => setAction("View profile"),
    },
    {
      id: "settings",
      label: "Account settings",
      shortcut: "⌘S",
      icon: <ApplicationNavigationAsset name="source3_imgSettings01" />,
      onSelect: () => setAction("Account settings"),
    },
    {
      id: "documentation",
      label: "Documentation",
      icon: <ApplicationNavigationAsset name="source3_imgBookOpen01" />,
      onSelect: () => setAction("Documentation"),
    },
  ];
  return (
    <section className="preview-section">
      <h2>Application navigation source primitives</h2>
      {applicationNavigationSources
        .filter((family) =>
          [
            "1161:14070",
            "1165:736",
            "7891:71338",
            "7891:87996",
            "1152:89220",
            "1152:90366",
            "1157:90307",
            "1207:1678",
            "1158:90768",
          ].includes(family.id)
        )
        .map((family) => (
          <section key={family.id}>
            <h3>{family.name}</h3>
            <div
              className="application-nav-source-scroll"
              data-account-cards={family.id === "7891:87996"}
            >
              <div className="application-nav-source-grid">
                {family.variants.map((source) => {
                  const current = source.name.includes("Current=True");
                  const state: ApplicationNavState = source.name.includes("Hover")
                    ? "hover"
                    : source.name.includes("Focused")
                      ? "focused"
                      : "default";
                  return (
                    <div
                      key={source.id}
                      data-app-nav-source-id={source.id}
                      style={{ width: source.width }}
                    >
                      {family.id === "1207:1678" || family.id === "1158:90768" ? (
                        <ApplicationNavLayoutFixture id={source.id} onAction={setAction} />
                      ) : family.id === "1161:14070" ? (
                        <ApplicationNavMenuButton
                          expanded={source.name.includes("Opened=True")}
                          state={state}
                          onClick={() => setAction(source.name)}
                        />
                      ) : family.id === "1165:736" ? (
                        <ApplicationNavIconButton
                          current={current}
                          size={source.name.includes("Size=lg") ? "lg" : "md"}
                          state={state}
                          onClick={() => setAction("Notifications")}
                        />
                      ) : family.id === "7891:71338" ? (
                        <ApplicationNavAccountMenuItem
                          account={
                            source.name.includes("Type=Account")
                              ? {
                                  ...accounts[0]!,
                                  avatarSrc: applicationNavigationAssetUrl("source2_imgAvatar"),
                                }
                              : undefined
                          }
                          current={current}
                          state={state === "hover" ? "hover" : "default"}
                          icon={<ApplicationNavigationAsset name="source2_imgPlaceholder" />}
                          shortcut={source.name.includes("Type=Menu item") ? "⌘C" : undefined}
                          onClick={() => setAction("Account item")}
                        >
                          Placeholder
                        </ApplicationNavAccountMenuItem>
                      ) : family.id === "7891:87996" ? (
                        <ApplicationNavAccountReference
                          accounts={accounts}
                          actions={actions}
                          name={source.name}
                          id={source.id}
                          onAction={setAction}
                        />
                      ) : family.id === "1157:90307" ? (
                        <NavFeaturedFixture name={source.name} onAction={setAction} />
                      ) : family.id === "1152:89220" ? (
                        <ApplicationNavItemReference current={current} state={state} />
                      ) : (
                        <ApplicationNavDropdown
                          label="Dashboard"
                          current={current}
                          contentId={`source-${source.id}`}
                          defaultOpen={source.name.includes("Open=True")}
                          icon={<ApplicationNavigationAsset name="source5_imgBarChartSquare02" />}
                        >
                          {["Overview", "Notifications", "Analytics", "Reports"].map((label) => (
                            <ApplicationNavItem href={`#${label.toLowerCase()}`} key={label}>
                              {label}
                            </ApplicationNavItem>
                          ))}
                        </ApplicationNavDropdown>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      <h2>Live navigation controls</h2>
      <div data-testid="live-application-navigation">
        <ApplicationNavMenuButton
          expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          aria-controls="live-navigation"
        />
        <nav id="live-navigation" hidden={!expanded} aria-label="Study navigation">
          <ApplicationNavDropdown label="Dashboard" contentId="live-dashboard">
            <ApplicationNavItem href="#overview">Overview</ApplicationNavItem>
            <ApplicationNavItem href="#reports">Reports</ApplicationNavItem>
          </ApplicationNavDropdown>
        </nav>
        <ApplicationNavAccountCard
          account={account}
          accounts={accounts}
          actions={actions}
          onAccountChange={setAccountId}
          onAddAccount={() => setAction("Add account")}
          onSignOut={() => setAction("Sign out")}
        />
      </div>
      <ApplicationNavLiveMobile onAction={setAction} />
      <output data-testid="app-nav-action">{action}</output>
      <output data-testid="app-nav-account">{account.email}</output>
    </section>
  );
}
