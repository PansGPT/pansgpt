import { useState } from "react";
import {
  Badge,
  Button,
  CardHeader,
  Dropdown,
  DropdownButton,
  DropdownContent,
  DropdownItem,
} from "../src";
import portrait from "../assets/avatar-imgSizeXlPlaceholderFalseTextFalseStatusIconOnlineIndicator.png";

const sources = [
  ["1211:168", false, "desktop"],
  ["1211:221", false, "mobile"],
  ["1211:272", true, "desktop"],
  ["1211:622", true, "mobile"],
] as const;
export function CardHeaderFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
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
      <DropdownButton variant="icon" label="Card options" />
      <DropdownContent>
        <DropdownItem onSelect={() => setAction("Export card")}>Export card</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
  return (
    <section className="preview-section">
      <h2>Card header source layouts</h2>
      <div className="section-header-source-scroll">
        <div className="card-header-source-grid">
          {sources.map(([id, avatar, breakpoint]) => (
            <CardHeader
              key={id}
              data-source-id={id}
              breakpoint={breakpoint}
              title={avatar ? "Diepreye Ọ̀rẹ̀kọ́yà" : "Team members"}
              supportingText={
                avatar
                  ? "chioma@PansGPT.com"
                  : "Manage your team members and their account permissions here."
              }
              badge={<Badge color="brand">{avatar ? "New user" : "10/20 seats"}</Badge>}
              avatar={
                avatar
                  ? {
                      label: "Diepreye Ọ̀rẹ̀kọ́yà",
                      src: typeof portrait === "string" ? portrait : portrait.src,
                    }
                  : undefined
              }
              actions={actions}
              mobileActions={mobileActions}
              menu={menu}
            />
          ))}
        </div>
      </div>
      <h2>Responsive header</h2>
      <CardHeader
        data-testid="card-header-live"
        title="Your study team"
        supportingText="Manage your team members."
        badge={<Badge color="brand">3 members</Badge>}
        actions={actions}
        mobileActions={mobileActions}
        menu={menu}
      />
      <output aria-live="polite" data-testid="card-action">
        {action}
      </output>
      <CardHeader data-testid="card-header-minimal" title="Details" divider={false} />
    </section>
  );
}
