import {
  ApplicationHeaderNavigation,
  ApplicationNavPanel,
  ApplicationNavItem,
  Input,
  Button,
} from "../src";
export function ApplicationNavLiveMobile({
  onAction,
}: {
  onAction: (label: string) => void;
}): React.ReactElement {
  const logo = (
    <a href="#home" className="nav-layout-source-logo">
      PansGPT
    </a>
  );
  const navigation = (
    <>
      <ApplicationNavItem href="#library" onClick={() => onAction("Library")}>
        Library
      </ApplicationNavItem>
      <ApplicationNavItem href="#learn" onClick={() => onAction("Learn")}>
        Learn
      </ApplicationNavItem>
    </>
  );
  return (
    <div data-testid="live-mobile-navigation" style={{ width: "100%", maxWidth: 375 }}>
      <ApplicationHeaderNavigation
        breakpoint="mobile"
        logo={logo}
        navigation={navigation}
        label="Study menu"
        mobileNavigation={
          <ApplicationNavPanel
            logo={logo}
            search={<Input type="search" placeholder="Search" aria-label="Search study menu" />}
            navigation={navigation}
            account={
              <Button
                onClick={() => onAction("Account settings")}
                leadingIcon={null}
                trailingIcon={null}
              >
                Account settings
              </Button>
            }
          />
        }
      />
    </div>
  );
}
