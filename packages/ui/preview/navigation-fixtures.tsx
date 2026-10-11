import { useState } from "react";
import {
  Avatar,
  Dropdown,
  DropdownButton,
  DropdownCheckboxItem,
  DropdownContent,
  DropdownGroup,
  DropdownHeader,
  DropdownItem,
  DropdownSeparator,
  Pagination,
  PaginationDots,
  paginationVariants,
} from "../src";
import { NavigationAsset } from "../src/components/navigation-asset";
import { navigationAssetUrl, type NavigationAssetName } from "../src/components/navigation-assets";

const accountGroups: readonly (readonly {
  label: string;
  icon: NavigationAssetName;
  shortcut?: string;
}[])[] = [
  [
    { label: "View profile", icon: "dropdownImgUser01", shortcut: "⌘K→P" },
    { label: "Settings", icon: "dropdownImgSettings01", shortcut: "⌘S" },
    { label: "Keyboard shortcuts", icon: "dropdownImgZap", shortcut: "?" },
  ],
  [
    { label: "Company profile", icon: "dropdownImgHomeLine", shortcut: "⌘K→C" },
    { label: "Team", icon: "dropdownImgUsers01", shortcut: "⌘K→T" },
    { label: "Invite colleagues", icon: "dropdownImgUserPlus01", shortcut: "⌘I" },
  ],
  [
    { label: "Changelog", icon: "dropdownImgLayersTwo01" },
    { label: "Slack Community", icon: "dropdownImgMessageSmileCircle" },
    { label: "Support", icon: "dropdownImgHelpCircle" },
    { label: "API", icon: "dropdownImgContainer" },
  ],
  [{ label: "Sign out", icon: "dropdownImgLogOut01", shortcut: "⌥⇧Q" }],
];

function AccountMenu({
  variant,
  initiallyOpen,
}: {
  variant: "button" | "icon" | "avatar";
  initiallyOpen: boolean;
}): React.ReactElement {
  const [selection, setSelection] = useState("No action selected");
  return (
    <div className="dropdown-fixture" data-variant={variant} data-initial-open={initiallyOpen}>
      <p className="type-name">
        {variant} / {initiallyOpen ? "open" : "closed"}
      </p>
      <Dropdown defaultOpen={initiallyOpen} modal={false}>
        <DropdownButton
          variant={variant}
          aria-label={variant + " " + (initiallyOpen ? "open" : "closed") + " account menu"}
        />
        <DropdownContent aria-label={variant + " account options"} hideWhenDetached>
          <DropdownHeader
            title="Diepreye Ọ̀rẹ̀kọ́yà"
            description="chioma@PansGPT.com"
            avatar={
              <Avatar
                label="Diepreye Ọ̀rẹ̀kọ́yà"
                size="md"
                status="online"
                src={navigationAssetUrl("dropdownHeaderImgAvatar")}
              />
            }
          />
          {accountGroups.map((group, index) => (
            <div key={index}>
              {index > 0 && <DropdownSeparator />}
              <DropdownGroup>
                {group.map((item) => (
                  <DropdownItem
                    key={item.label}
                    icon={<NavigationAsset name={item.icon} />}
                    shortcut={item.shortcut}
                    onSelect={() => setSelection(item.label)}
                  >
                    {item.label}
                  </DropdownItem>
                ))}
              </DropdownGroup>
            </div>
          ))}
        </DropdownContent>
      </Dropdown>
      <output className="menu-selection" aria-live="polite">
        {selection}
      </output>
    </div>
  );
}

function PreferenceMenu(): React.ReactElement {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="dropdown-preferences">
      <Dropdown>
        <DropdownButton label="Preferences" />
        <DropdownContent aria-label="Preference options">
          <DropdownHeader title="Account menu" />
          <DropdownGroup>
            <DropdownItem href="#pagination-workbench" shortcut="⌘C">
              Pagination examples
            </DropdownItem>
            <DropdownItem
              icon={<NavigationAsset name="dropdownItemImgPlaceholder1" />}
              shortcut="⌘C"
            >
              Placeholder
            </DropdownItem>
            <DropdownCheckboxItem
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
              shortcut="⌘C"
            >
              Email updates
            </DropdownCheckboxItem>
            <DropdownCheckboxItem disabled checked={false} shortcut="⌘C">
              Managed setting
            </DropdownCheckboxItem>
            <DropdownItem
              disabled
              icon={<NavigationAsset name="dropdownItemImgPlaceholder" />}
              shortcut="⌘C"
            >
              Unavailable
            </DropdownItem>
          </DropdownGroup>
          <DropdownSeparator />
          <DropdownGroup>
            <DropdownItem disabled shortcut="⌘C">
              Disabled text item
            </DropdownItem>
          </DropdownGroup>
        </DropdownContent>
      </Dropdown>
      <output aria-live="polite">Email updates {enabled ? "enabled" : "disabled"}</output>
    </div>
  );
}

export function NavigationFixtures(): React.ReactElement {
  const [page, setPage] = useState(1);
  return (
    <>
      <section className="preview-section">
        <h2>Dropdown menus</h2>
        <div className="dropdown-matrix">
          {(["button", "icon", "avatar"] as const).flatMap((variant) =>
            [false, true].map((initiallyOpen) => (
              <AccountMenu
                key={variant + initiallyOpen}
                variant={variant}
                initiallyOpen={initiallyOpen}
              />
            ))
          )}
        </div>
        <PreferenceMenu />
      </section>
      <section className="preview-section" id="pagination-workbench">
        <h2>Pagination</h2>
        <output className="pagination-selection" aria-live="polite">
          Selected page: {page}
        </output>
        <Pagination
          aria-label="Responsive pagination"
          pageCount={10}
          page={page}
          onPageChange={setPage}
        />
        <div className="pagination-matrix">
          {paginationVariants.flatMap((variant) =>
            (variant === "page-default" || variant === "page-minimal" || variant === "card-default"
              ? (["square", "circle"] as const)
              : (["square"] as const)
            ).flatMap((shape) =>
              (["desktop", "mobile"] as const).map((breakpoint) => (
                <div
                  key={variant + shape + breakpoint}
                  className="pagination-fixture"
                  data-breakpoint={breakpoint}
                >
                  <p className="type-name">
                    {variant} / {shape} / {breakpoint}
                  </p>
                  <Pagination
                    aria-label={variant + " " + shape + " " + breakpoint}
                    variant={variant}
                    shape={shape}
                    breakpoint={breakpoint}
                    pageCount={10}
                  />
                </div>
              ))
            )
          )}
        </div>
      </section>
      <section className="preview-section">
        <h2>Pagination indicators</h2>
        <div className="indicator-matrix">
          {(["dot", "line"] as const).flatMap((variant) =>
            (["md", "lg"] as const).flatMap((size) =>
              [false, true].map((framed) => (
                <div key={variant + size + framed}>
                  <p className="type-name">
                    {variant} / {size} / {framed ? "framed" : "plain"}
                  </p>
                  <PaginationDots
                    aria-label={variant + " " + size + " " + framed + " slides"}
                    pageCount={3}
                    variant={variant}
                    size={size}
                    framed={framed}
                  />
                </div>
              ))
            )
          )}
        </div>
      </section>
    </>
  );
}
