import {
  ApplicationNavAccountCard,
  ApplicationNavAccountCardButton,
  ApplicationNavAccountMenuItem,
  type NavigationAccount,
  type NavigationAccountAction,
} from "../src";
import { ApplicationNavigationAsset } from "../src/components/application-navigation-assets";
export function ApplicationNavAccountReference({
  accounts,
  actions,
  name,
  id,
  onAction,
}: {
  accounts: NavigationAccount[];
  actions: NavigationAccountAction[];
  name: string;
  id: string;
  onAction: (action: string) => void;
}): React.ReactElement {
  const mobile = name.includes("Mobile");
  const open = name.includes("Open=True");
  const current = accounts[0]!;
  const card = name.includes("Type=Simple") ? (
    <ApplicationNavAccountCard
      type="simple"
      account={current}
      breakpoint={mobile ? "mobile" : "desktop"}
      onSignOut={() => onAction("Sign out")}
    />
  ) : (
    <ApplicationNavAccountCardButton
      account={current}
      breakpoint={mobile ? "mobile" : "desktop"}
      aria-expanded={open}
      aria-label="Account card reference"
      onClick={() => onAction("Account card")}
    />
  );
  return (
    <div className="application-nav-account-reference">
      {card}
      {open && (
        <>
          <div
            className="p-app-nav-account-menu application-nav-account-reference-menu"
            data-breakpoint={mobile ? "mobile" : "desktop"}
            data-app-nav-menu-source={id}
            style={{ left: mobile ? 0 : 288, top: mobile ? -372 : -300 }}
          >
            <div className="p-app-nav-account-actions">
              {actions.map((action) => (
                <ApplicationNavAccountMenuItem
                  key={action.id}
                  icon={action.icon}
                  shortcut={action.shortcut}
                  onClick={action.onSelect}
                >
                  {action.label}
                </ApplicationNavAccountMenuItem>
              ))}
            </div>
            <div className="p-app-nav-account-divider" />
            <div className="p-app-nav-account-switch">
              <div>Switch account</div>
              <div>
                {accounts.map((account) => (
                  <ApplicationNavAccountMenuItem
                    key={account.id}
                    account={account}
                    current={account.id === current.id}
                    onClick={() => onAction(account.email)}
                  />
                ))}
              </div>
            </div>
            <div className="p-app-nav-account-add-wrap">
              <button
                className="p-app-nav-account-add"
                type="button"
                onClick={() => onAction("Add account")}
              >
                <ApplicationNavigationAsset name="source3_imgPlus" />
                Add account
              </button>
            </div>
            <div className="p-app-nav-account-divider" />
            <div className="p-app-nav-account-footer">
              <ApplicationNavAccountMenuItem
                icon={<ApplicationNavigationAsset name="source3_imgLogOut2" />}
                shortcut="⌥⇧Q"
                onClick={() => onAction("Sign out")}
              >
                Sign out
              </ApplicationNavAccountMenuItem>
            </div>
          </div>
          {!mobile && (
            <ApplicationNavigationAsset
              className="application-nav-account-reference-cursor"
              name="source3_imgCursor"
            />
          )}
        </>
      )}
    </div>
  );
}
