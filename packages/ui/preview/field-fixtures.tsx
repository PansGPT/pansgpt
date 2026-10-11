import { useId, useState, type ReactNode } from "react";
import {
  Button,
  Combobox,
  FieldLabel,
  FieldMessage,
  FieldNativeAsset,
  Input,
  InputAddonSelect,
  PaymentMethodIcon,
  Select,
  Tag,
  TagInput,
  type FieldNativeAssetName,
  type InputProps,
  type SelectOption,
} from "../src";
import { fieldLayouts, type FieldLayoutNode, type FieldLayoutSource } from "./field-layout-data";

function descendants(node?: FieldLayoutNode): FieldLayoutNode[] {
  return node ? [node, ...(node.children ?? []).flatMap(descendants)] : [];
}
function named(node: FieldLayoutNode, name: string): FieldLayoutNode | undefined {
  return descendants(node).find((child) => child.name === name);
}
function text(node?: FieldLayoutNode): string {
  return node
    ? descendants(node)
        .flatMap((child) => (child.text ? [child.text] : []))
        .join(" ")
    : "";
}
function image(node?: FieldLayoutNode): ReactNode {
  const asset = node && descendants(node).find((child) => child.asset)?.asset;
  return asset ? <FieldNativeAsset name={asset as FieldNativeAssetName} /> : undefined;
}
function copy(node?: FieldLayoutNode): string[] {
  return (node?.children ?? []).filter((child) => child.tag === "p").map(text);
}
function sourceTags(control: FieldLayoutNode): SelectOption[] {
  return (named(control, "Tags")?.children ?? [])
    .filter((node) => node.name === "Tag")
    .map((node, index) => ({
      value: String(index),
      label: text(named(node, "Content")),
      leading: (
        <span className="field-source-avatar" data-size="16">
          {image(named(node, "Avatar"))}
        </span>
      ),
    }));
}
const layouts: Record<string, InputProps["layout"]> = {
  Default: "default",
  "Leading dropdown": "leading-dropdown",
  "Trailing dropdown": "trailing-dropdown",
  "Leading text": "leading-text",
  "Payment input": "payment",
  Tags: "tags",
  "Trailing button": "trailing-button",
};

function SourceInput({
  source,
  props,
}: {
  source: FieldLayoutSource;
  props: Record<string, string>;
}): React.ReactElement {
  const root = source.nodes[0];
  const control = named(root, "Input")!;
  const label = copy(named(root, "Label wrapper"))[0];
  const content = named(control, "Content") ?? named(control, "Text input");
  const message = text(root.children?.find((child) => child.tag === "p"));
  const direct = copy(content);
  const trailingText =
    props.Type === "Trailing dropdown" ? copy(named(control, "Text input")) : direct;
  const inputText = trailingText.at(-1) ?? "";
  const placeholder = props.State === "Placeholder" || props.State === "Disabled";
  const destructive = props.Destructive === "True";
  const helper = descendants(control).find((child) => child.asset?.includes("OpenFalse"));
  const alert = descendants(control).find((child) => child.asset?.includes("AlertCircle"));
  const shared = {
    size: props.Size as "sm" | "md",
    label,
    required: true,
    hint: destructive ? undefined : message,
    error: destructive ? message : undefined,
    disabled: props.State === "Disabled",
    referenceState: props.State === "Focused" ? ("focused" as const) : undefined,
    help: "This is a tooltip",
    helpIcon: helper ? image(helper) : undefined,
    errorIcon: alert ? image(alert) : undefined,
    layout: layouts[props.Type],
    placeholder: placeholder ? inputText : undefined,
    defaultValue: placeholder ? undefined : inputText,
  };
  if (props.Type === "Tags")
    return (
      <TagInput
        {...shared}
        defaultQuery={placeholder ? "" : inputText}
        defaultValue={sourceTags(control)}
      />
    );
  const dropdown = named(control, "Dropdown");
  const dropdownText = copy(dropdown)[0];
  const addon = dropdown && (
    <InputAddonSelect
      aria-label={`${label} ${props.Type === "Leading dropdown" ? "country" : "currency"}`}
      options={[{ value: dropdownText, label: dropdownText }]}
      defaultValue={dropdownText}
      disabled={shared.disabled}
    />
  );
  const leadingIcon = image(named(control, "mail-01"));
  return (
    <Input
      {...shared}
      leadingIcon={leadingIcon}
      leadingAddon={
        props.Type === "Leading dropdown" ? (
          addon
        ) : props.Type === "Leading text" ? (
          text(named(control, "Add-on"))
        ) : props.Type === "Trailing dropdown" ? (
          trailingText[0]
        ) : props.Type === "Payment input" ? (
          <PaymentMethodIcon>{image(named(control, "Mastercard"))}</PaymentMethodIcon>
        ) : undefined
      }
      trailingAddon={props.Type === "Trailing dropdown" ? addon : undefined}
      trailingAction={
        props.Type === "Trailing button" ? (
          <Button
            variant="secondary"
            size={props.Size as "sm" | "md"}
            disabled={shared.disabled}
            leadingIcon={image(named(control, "placeholder"))}
            trailingIcon={null}
            onClick={() => {
              void navigator.clipboard.writeText(inputText);
            }}
          >
            Copy
          </Button>
        ) : undefined
      }
    />
  );
}

function SourceSelect({
  source,
  props,
}: {
  source: FieldLayoutSource;
  props: Record<string, string>;
}): React.ReactElement {
  const root = source.nodes[0];
  const control = named(root, "Input")!;
  const label = copy(named(root, "Label wrapper"))[0];
  const content = named(control, "Content")!;
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [menuOpen, setMenuOpen] = useState(props.State === "Open");
  const [chosen, setChosen] = useState<string>();
  const id = useId();
  const isPlaceholder = props.State === "Placeholder";
  const tags = sourceTags(control).filter((item) => !removed.includes(item.value));
  const contentCopy = copy(content);
  const menu = named(root, "Menu");
  const helper = descendants(named(root, "Label wrapper")!).find((child) => child.asset);
  const leading =
    named(content, "Avatar") ??
    named(content, "user-01") ??
    named(content, "search-lg") ??
    named(content, "Dot") ??
    content.children?.find(
      (child) =>
        child.tag !== "p" && child.name !== "Tags" && descendants(child).some((node) => node.asset)
    );
  return (
    <div
      className="p-field field-source-select"
      data-size={props.Size}
      data-disabled={props.State === "Disabled" || undefined}
      data-reference-state={["Focused", "Open"].includes(props.State) ? "focused" : undefined}
      data-source-type={props.Type}
    >
      <FieldLabel
        id={id}
        label={label}
        required
        help="This is a tooltip"
        helpIcon={image(helper)}
      />
      <button
        id={id}
        className="p-select-trigger"
        type="button"
        disabled={props.State === "Disabled"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
        data-placeholder={isPlaceholder || undefined}
      >
        {leading && (
          <span
            className="p-select-leading field-source-leading"
            data-avatar={leading.name === "Avatar" || undefined}
          >
            {image(leading)}
          </span>
        )}
        <span className="p-select-value">
          {tags.map((tag) => (
            <Tag key={tag.value} size="md" leading={tag.leading} onDismiss={undefined}>
              {tag.label}
              <span
                className="field-source-tag-close"
                onClick={(event) => {
                  event.stopPropagation();
                  setRemoved([...removed, tag.value]);
                }}
              >
                {image(
                  named(
                    named(content, "Tags")?.children?.find((node) =>
                      text(node).includes(tag.label)
                    ) ?? {},
                    "x-close"
                  )
                )}
              </span>
            </Tag>
          ))}
          <span>{chosen ?? contentCopy[0]}</span>
          {contentCopy[1] && <span className="p-select-supporting">{contentCopy[1]}</span>}
        </span>
        {named(control, "Shortcut wrapper") ? (
          <kbd className="p-combobox-shortcut">{text(named(control, "Shortcut wrapper"))}</kbd>
        ) : (
          image(named(control, "chevron-down"))
        )}
      </button>
      {props.State !== "Open" && (
        <FieldMessage
          id={`${id}-message`}
          hint={text(root.children?.find((child) => child.tag === "p"))}
        />
      )}
      {menuOpen && menu && (
        <div className="field-source-menu p-select-menu" data-size={props.Size}>
          {(named(menu, "Menu items")?.children ?? [])
            .filter((item) => item.name === "_Select menu item")
            .map((item, index) => {
              const body = named(item, "Content")!;
              const values = copy(named(body, "Text and supporting text"));
              const avatar = named(body, "Avatar");
              const check = descendants(body).find((node) => node.asset?.includes("Check"));
              return (
                <button
                  className="p-select-item"
                  type="button"
                  key={index}
                  data-state={check ? "checked" : undefined}
                  onClick={() => {
                    setChosen(values[0]);
                    setMenuOpen(false);
                  }}
                >
                  {avatar && (
                    <span className="field-source-avatar" data-size="24">
                      {image(avatar)}
                    </span>
                  )}
                  {!avatar && image(named(body, "user-01"))}
                  <span>{values[0]}</span>
                  {values[1] && <span className="p-select-supporting">{values[1]}</span>}
                  {check && <span className="p-select-indicator">{image(check)}</span>}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

const liveOptions: SelectOption[] = [
  { value: "chioma", label: "Chioma", supportingText: "@chioma" },
  { value: "unavailable", label: "Unavailable", disabled: true },
  { value: "diepreye", label: "Diepreye Ọ̀rẹ̀kọ́yà", supportingText: "@olivia" },
  { value: "emmanuel", label: "Emmanuel" },
];
export function FieldFixtures(): React.ReactElement {
  return (
    <section className="preview-section">
      <h2>Complete composed input and select library</h2>
      <div className="field-library-grid">
        {fieldLayouts.map((source) => {
          const props = Object.fromEntries(source.name.split(", ").map((pair) => pair.split("=")));
          return (
            <figure
              key={source.id}
              data-field-source-id={source.id}
              data-open={props.State === "Open" || undefined}
              style={{ width: source.width }}
            >
              <figcaption>{source.name}</figcaption>
              {source.familyId === "1090:57817" ? (
                <SourceInput source={source} props={props} />
              ) : (
                <SourceSelect source={source} props={props} />
              )}
            </figure>
          );
        })}
      </div>
      <form
        aria-label="Live composed fields"
        className="field-live-grid"
        onSubmit={(event) => event.preventDefault()}
      >
        <Combobox
          label="Search team member"
          name="member"
          options={liveOptions}
          required
          shortcut
        />
        <Combobox
          label="Multiple team members"
          name="members"
          options={liveOptions}
          multiple
          defaultValue={["chioma"]}
        />
        <Select
          label="Choose member"
          name="selected"
          options={liveOptions}
          placeholder="Select member"
        />
        <TagInput
          label="Study topics"
          name="topics"
          required
          defaultValue={[{ value: "pharmacology", label: "Pharmacology" }]}
        />
        <Input
          label="Phone number"
          name="phone"
          layout="leading-dropdown"
          leadingAddon={
            <InputAddonSelect
              aria-label="Phone country"
              name="country"
              options={[
                { value: "NG", label: "NG" },
                { value: "US", label: "US" },
              ]}
              defaultValue="NG"
            />
          }
        />
        <Input
          label="Card number"
          name="card"
          layout="payment"
          leadingAddon={<PaymentMethodIcon />}
        />
        <Button type="submit" leadingIcon={null} trailingIcon={null}>
          Submit fields
        </Button>
      </form>
    </section>
  );
}
