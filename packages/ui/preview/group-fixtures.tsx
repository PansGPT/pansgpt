import { useState } from "react";
import { Toolbar } from "radix-ui";
import { Button, ButtonGroup, ButtonGroupButton, ContentDivider, SegmentedControl } from "../src";
import { GroupAsset } from "../src/components/group-assets";

const filters = [
  { value: "all", label: "View all" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function IconActions({
  label,
  onAction,
  divider = false,
}: {
  label: string;
  onAction: (action: string) => void;
  divider?: boolean;
}): React.ReactElement {
  return (
    <ButtonGroup label={label}>
      <ButtonGroupButton
        kind="icon"
        aria-label="Previous"
        icon={
          <GroupAsset name={divider ? "contentDividerImgArrowLeft" : "buttonGroupImgArrowLeft"} />
        }
        onClick={() => onAction("Previous")}
      />
      <ButtonGroupButton
        kind="icon"
        aria-label="Add"
        icon={<GroupAsset name={divider ? "contentDividerImgPlus" : "buttonGroupImgPlus"} />}
        onClick={() => onAction("Add")}
      />
      <ButtonGroupButton
        kind="icon"
        aria-label="Next"
        icon={
          <GroupAsset name={divider ? "contentDividerImgArrowRight" : "buttonGroupImgArrowRight"} />
        }
        onClick={() => onAction("Next")}
      />
    </ButtonGroup>
  );
}

export function GroupFixtures(): React.ReactElement {
  const [action, setAction] = useState("No action selected");
  const [submitted, setSubmitted] = useState("");
  return (
    <>
      <section className="preview-section">
        <h2>Button groups</h2>
        <div className="button-group-reference">
          <ButtonGroup label="Text actions">
            {[1, 2, 3].map((index) => (
              <ButtonGroupButton key={index} onClick={() => setAction("Text " + index)}>
                Text
              </ButtonGroupButton>
            ))}
          </ButtonGroup>
          <ButtonGroup label="Leading icon actions">
            {[1, 2, 3].map((index) => (
              <ButtonGroupButton
                key={index}
                kind="leading"
                icon={<GroupAsset name="buttonGroupImgPlaceholder" />}
                onClick={() => setAction("Leading " + index)}
              >
                Text
              </ButtonGroupButton>
            ))}
          </ButtonGroup>
          <IconActions label="Icon actions" onAction={setAction} />
        </div>
        <output className="group-action" aria-live="polite">
          {action}
        </output>
        <form
          aria-label="Segmented filter form"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmitted(String(new FormData(event.currentTarget).get("filter")));
          }}
        >
          <SegmentedControl
            label="Notification filters"
            name="filter"
            items={[
              filters[0],
              { value: "locked", label: "Locked", disabled: true },
              filters[1],
              filters[2],
            ]}
          />
          <button type="submit">Apply filter</button>
          <output aria-live="polite">{submitted}</output>
        </form>
        <div className="group-base-matrix">
          {(["text", "leading", "dot", "icon"] as const).flatMap((kind) =>
            [false, true].flatMap((current) =>
              [false, true].map((disabled) => (
                <Toolbar.Root
                  key={kind + current + disabled}
                  className="group-base-fixture"
                  aria-label={kind + " " + current + " " + disabled + " base"}
                >
                  <p className="type-name">
                    {kind} / {current ? "selected" : "unselected"} /{" "}
                    {disabled ? "disabled" : "enabled"}
                  </p>
                  {kind === "icon" ? (
                    <ButtonGroupButton
                      kind="icon"
                      aria-label="Placeholder action"
                      current={current}
                      disabled={disabled}
                    />
                  ) : (
                    <ButtonGroupButton kind={kind} current={current} disabled={disabled}>
                      Text
                    </ButtonGroupButton>
                  )}
                </Toolbar.Root>
              ))
            )
          )}
        </div>
      </section>
      <section className="preview-section">
        <h2>Content dividers</h2>
        <div className="divider-matrix">
          {(["single", "dual", "filled"] as const).flatMap((variant) =>
            (["heading", "text", "button", "group-icon", "group", "button-icon"] as const).map(
              (kind) => (
                <div key={variant + kind} data-divider-kind={kind}>
                  <p className="type-name">
                    {variant} / {kind}
                  </p>
                  <ContentDivider
                    variant={variant}
                    kind={kind === "heading" || kind === "text" ? kind : "action"}
                    compact={kind === "button-icon"}
                  >
                    {kind === "heading" ? (
                      "Notifications"
                    ) : kind === "text" ? (
                      "Today"
                    ) : kind === "button" ? (
                      <Button
                        variant="secondary"
                        size="md"
                        leadingIcon={null}
                        trailingIcon={null}
                        onClick={() => setAction("Add")}
                      >
                        Add
                      </Button>
                    ) : kind === "group-icon" ? (
                      <IconActions
                        divider
                        label={variant + " divider actions"}
                        onAction={setAction}
                      />
                    ) : kind === "group" ? (
                      <SegmentedControl label={variant + " divider filters"} items={filters} />
                    ) : (
                      <Button
                        variant="secondary"
                        size="md"
                        iconOnly
                        aria-label="Add item"
                        leadingIcon={<GroupAsset name="contentDividerImgPlus1" />}
                        onClick={() => setAction("Add")}
                      />
                    )}
                  </ContentDivider>
                </div>
              )
            )
          )}
        </div>
      </section>
    </>
  );
}
