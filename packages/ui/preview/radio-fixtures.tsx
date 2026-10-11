import { useState, type ReactNode } from "react";
import {
  Badge,
  Button,
  ControlNativeAsset,
  SelectionCard,
  SelectionCardGroup,
  type ControlNativeAssetName,
  type SelectionCardOption,
  type SelectionCardVariant,
} from "../src";
import { radioLayouts, type ControlLayoutNode } from "./radio-layout-data";
function all(node?: ControlLayoutNode): ControlLayoutNode[] {
  return node ? [node, ...(node.children ?? []).flatMap(all)] : [];
}
function named(node: ControlLayoutNode, name: string): ControlLayoutNode | undefined {
  return all(node).find((child) => child.name === name);
}
function text(node?: ControlLayoutNode): string {
  return all(node)
    .flatMap((child) => (child.text ? [child.text] : []))
    .join(" ");
}
function paragraphs(node?: ControlLayoutNode): string[] {
  return (node?.children ?? []).filter((child) => child.tag === "p").map(text);
}
function image(node?: ControlLayoutNode): ReactNode {
  const asset = all(node).find((child) => child.asset)?.asset;
  return asset ? <ControlNativeAsset name={asset as ControlNativeAssetName} /> : undefined;
}
const variants: Record<string, SelectionCardVariant> = {
  "Radio button": "radio",
  Checkbox: "checkbox",
  "Icon simple": "icon",
  "Icon card": "plan",
  Avatar: "avatar",
  "Payment icon": "payment",
};
function option(
  node: ControlLayoutNode,
  value: string,
  size: "sm" | "md",
  type: string
): SelectionCardOption {
  const copy = named(node, "Text and supporting text");
  const row = paragraphs(named(node, "Text and subtext"));
  const plain = paragraphs(copy);
  const header = paragraphs(named(node, "Header"));
  const price = paragraphs(named(node, "Price"));
  const check = all(node).find((child) => child.asset?.includes("imgCheck"));
  const leading =
    named(node, "Featured icon") ??
    named(node, "Payment method icon") ??
    all(node).find(
      (child) => child.asset && !child.asset.includes("imgCheck") && !child.asset.includes("imgDot")
    );
  const badge = named(node, "Badge");
  const actions = named(node, "Actions");
  return {
    value,
    label: type === "Icon card" ? header[0] : (row[0] ?? plain[0]),
    subtext: row[1],
    description: plain.at(-1),
    icon: ["Radio button", "Checkbox"].includes(type) ? undefined : image(leading),
    price: price[0],
    period: paragraphs(named(node, "Time period"))[0],
    checkIcon: image(check),
    badge: badge && (
      <Badge
        variant="modern"
        size={all(badge).some((child) => child.style?.includes("text-sm,14px")) ? "md" : "sm"}
        leading={image(badge)}
      >
        {paragraphs(badge)[0]}
      </Badge>
    ),
    actionsSpacing: all(node)
      .find((child) => child.children?.some((item) => item.name === "Actions"))
      ?.style?.includes("spacing-lg,12px")
      ? "md"
      : undefined,
    actions: actions && (
      <>
        {actions.children?.map((child, index) => (
          <Button
            key={index}
            disabled={all(child).some((node) => node.style?.includes("fg-disabled"))}
            variant={index === 0 ? "link-gray" : "link-color"}
            size={all(child).some((node) => node.style?.includes("text-md,16px")) ? "md" : "sm"}
            leadingIcon={null}
            trailingIcon={null}
          >
            {text(child)}
          </Button>
        ))}
      </>
    ),
  };
}
export function RadioFixtures(): React.ReactElement {
  const [value, setValue] = useState("first");
  const [edits, setEdits] = useState(0);
  return (
    <section className="preview-section">
      <h2>Complete selectable card library</h2>
      <div className="radio-library-grid">
        {radioLayouts.map((source) => {
          const props = Object.fromEntries(source.name.split(", ").map((pair) => pair.split("=")));
          const size = props.Size as "sm" | "md";
          const type = props.Type;
          const variant = variants[type];
          const root = source.nodes[0];
          return (
            <figure
              key={source.id}
              data-radio-source-id={source.id}
              style={{ width: source.width }}
            >
              <figcaption>{source.name}</figcaption>
              {source.familyId === "1142:87213" ? (
                <div className="p-selection-card-group">
                  {root.children?.map((child, index) => (
                    <SelectionCard
                      key={index}
                      {...option(child, String(index), size, type)}
                      size={size}
                      variant={variant}
                      breakpoint={props.Breakpoint.toLowerCase() as "mobile" | "desktop"}
                      name={`group-${source.id}`}
                      defaultChecked={index === 0}
                    />
                  ))}
                </div>
              ) : (
                <SelectionCard
                  {...option(root, source.id, size, type)}
                  size={size}
                  variant={variant}
                  breakpoint={props.Breakpoint.toLowerCase() as "mobile" | "desktop"}
                  name={`source-${source.id}`}
                  defaultChecked={props.Selected === "True"}
                  disabled={props.State === "Disabled"}
                  referenceState={
                    props.State === "Focused"
                      ? "focused"
                      : props.State === "Hover"
                        ? "hover"
                        : "default"
                  }
                />
              )}
            </figure>
          );
        })}
      </div>
      <form aria-label="Interactive selection cards">
        <SelectionCardGroup
          label="Choose payment method"
          name="payment"
          value={value}
          onValueChange={setValue}
          variant="payment"
          options={[
            {
              value: "first",
              label: "First payment method",
              description: "Expires next year",
              actions: (
                <Button
                  variant="link-color"
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={() => setEdits(edits + 1)}
                >
                  Edit payment method
                </Button>
              ),
            },
            { value: "disabled", label: "Unavailable method", disabled: true },
            { value: "second", label: "Second payment method" },
          ]}
        />
        <SelectionCard
          variant="checkbox"
          label="Include study notes"
          name="notes"
          value="included"
        />
        <output aria-label="Payment edits">{edits}</output>
      </form>
    </section>
  );
}
