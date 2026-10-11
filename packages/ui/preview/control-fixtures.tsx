import { useState, type ReactNode } from "react";
import {
  Checkbox,
  ControlNativeAsset,
  Radio,
  SelectMenuItem,
  TagTextarea,
  Textarea,
  Toggle,
  type ControlNativeAssetName,
} from "../src";
import {
  controlLayouts,
  type ControlLayoutNode,
  type ControlLayoutSource,
} from "./control-layout-data";
function all(node?: ControlLayoutNode): ControlLayoutNode[] {
  return node ? [node, ...(node.children ?? []).flatMap(all)] : [];
}
function named(root: ControlLayoutNode, name: string): ControlLayoutNode | undefined {
  return all(root).find((node) => node.name === name);
}
function content(node?: ControlLayoutNode): string {
  return all(node)
    .flatMap((child) => (child.text ? [child.text] : []))
    .join(" ");
}
function paragraphs(node?: ControlLayoutNode): string[] {
  return (node?.children ?? []).filter((child) => child.tag === "p").map(content);
}
function image(node?: ControlLayoutNode): ReactNode {
  const asset = all(node).find((child) => child.asset)?.asset;
  return asset ? <ControlNativeAsset name={asset as ControlNativeAssetName} /> : undefined;
}
function ReferenceControl({ source }: { source: ControlLayoutSource }): React.ReactElement {
  const props = Object.fromEntries(source.name.split(", ").map((pair) => pair.split("=")));
  const root = source.nodes[0];
  const state =
    props.State === "Focused" || props.State === "Focus"
      ? "focused"
      : props.State === "Hover"
        ? "hover"
        : "default";
  const disabled = props.State === "Disabled";
  const size = props.Size as "sm" | "md";
  if (["1097:63652", "1097:63886", "1102:4208", "122:3294"].includes(source.familyId)) {
    const copy = all(root)
      .filter((child) => child.tag === "p")
      .map(content);
    const shared = {
      size,
      disabled,
      referenceState: state,
      label: props.Text === "True" ? copy[0] : undefined,
      supportingText: props.Text === "True" ? copy[1] : undefined,
      "aria-label": props.Text === "True" ? undefined : source.name,
    } as const;
    if (["1102:4208", "122:3294"].includes(source.familyId))
      return (
        <Toggle
          {...shared}
          variant={props.Type === "Slim" ? "slim" : "default"}
          defaultChecked={props.Pressed === "True"}
        />
      );
    return props.Type === "Radio" ? (
      <Radio
        {...shared}
        name={`reference-${source.id}`}
        defaultChecked={props.Checked === "True"}
      />
    ) : (
      <Checkbox
        {...shared}
        defaultChecked={props.Indeterminate === "True" ? "indeterminate" : props.Checked === "True"}
      />
    );
  }
  if (source.familyId === "3281:380429") {
    const body = root.children?.[0];
    const textGroup = body && named(body, "Text and supporting text");
    const copy = paragraphs(textGroup);
    const check = all(body).find((node) => node.asset?.includes("Check"));
    const leadingAsset = all(textGroup).find((node) => node.asset);
    const leading = leadingAsset ? (
      props.Type === "Avatar leading" ? (
        <span className="control-source-avatar">{image(leadingAsset)}</span>
      ) : (
        image(leadingAsset)
      )
    ) : undefined;
    return (
      <SelectMenuItem
        size={size}
        disabled={disabled}
        selected={props.Selected === "True"}
        label={copy[0]}
        supportingText={copy[1]}
        leading={leading}
        checkIcon={image(check)}
        referenceState={state === "hover" ? "hover" : "default"}
      />
    );
  }
  const label = paragraphs(named(root, "Label wrapper"))[0];
  const field = named(root, "Input");
  const textGroup = field && named(field, "Content");
  const text =
    paragraphs(textGroup)[0] ??
    all(field)
      .filter((child) => child.tag === "p")
      .map(content)
      .at(-1) ??
    "";
  const hint = content(root.children?.find((child) => child.tag === "p"));
  const helper = all(named(root, "Label wrapper")).find((child) => child.asset);
  const error = props.Destructive === "True" ? hint : undefined;
  const shared = {
    label,
    required: true,
    help: "This is a tooltip",
    helpIcon: image(helper),
    disabled,
    hint: error ? undefined : hint,
    error,
    referenceState: state === "focused" ? ("focused" as const) : undefined,
  };
  if (props.Type === "Tags") {
    const tags = (field ? (named(field, "Tags")?.children ?? []) : [])
      .filter((node) => node.name === "Tag")
      .map((node, index) => ({ value: String(index), label: content(named(node, "Content")) }));
    return <TagTextarea {...shared} defaultValue={tags} placeholder={text} />;
  }
  return (
    <Textarea
      {...shared}
      placeholder={props.State === "Placeholder" || disabled ? text : undefined}
      defaultValue={props.State === "Placeholder" || disabled ? undefined : text}
    />
  );
}
export function ControlFixtures(): React.ReactElement {
  const [choice, setChoice] = useState("first");
  return (
    <section className="preview-section">
      <h2>Complete choice controls, textareas and select rows</h2>
      <div className="control-library-grid">
        {controlLayouts.map((source) => (
          <figure
            key={source.id}
            data-control-source-id={source.id}
            style={{ width: source.width }}
          >
            <figcaption>{source.name}</figcaption>
            <ReferenceControl source={source} />
          </figure>
        ))}
      </div>
      <form aria-label="Native radio choices" className="control-live-form">
        <Radio
          label="First choice"
          name="choice"
          value="first"
          checked={choice === "first"}
          onChange={() => setChoice("first")}
        />
        <Radio label="Unavailable choice" name="choice" value="unavailable" disabled />
        <Radio
          label="Second choice"
          name="choice"
          value="second"
          checked={choice === "second"}
          onChange={() => setChoice("second")}
        />
        <TagTextarea
          label="Study labels"
          name="labels"
          defaultValue={[{ value: "design", label: "Design" }]}
          placeholder="Add tags..."
        />
        <output>{choice}</output>
      </form>
    </section>
  );
}
