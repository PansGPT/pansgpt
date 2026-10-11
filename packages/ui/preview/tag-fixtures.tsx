import { useState, type ReactNode } from "react";
import { ControlNativeAsset, Tag, type ControlNativeAssetName, type TagSize } from "../src";
import { tagSources } from "./tag-source-data";
const bases = { Dot: 9, Country: 12, Avatar: 15 };
function ornament(size: TagSize, type: string): ReactNode {
  if (!Object.hasOwn(bases, type)) return undefined;
  const base = bases[type as keyof typeof bases];
  const index = base + (size === "sm" ? 0 : size === "md" ? 1 : 2);
  const name =
    `source${index}_${type === "Dot" ? "imgSizeSmOutlineFalse" : type === "Country" ? "imgAu" : "imgAvatar"}` as ControlNativeAssetName;
  return type === "Avatar" ? (
    <span className="tag-source-avatar">
      <ControlNativeAsset name={name} />
    </span>
  ) : (
    <ControlNativeAsset name={name} />
  );
}
export function TagFixtures(): React.ReactElement {
  const [visible, setVisible] = useState(true);
  return (
    <section className="preview-section">
      <h2>All tag variants</h2>
      <div className="tag-library-grid">
        {tagSources.map((source) => {
          const props = Object.fromEntries(source.name.split(", ").map((pair) => pair.split("=")));
          const size = props.Size as TagSize;
          return (
            <div key={source.id} data-tag-source-id={source.id}>
              <Tag
                size={size}
                leading={ornament(size, props.Icon)}
                decoration={
                  props.Icon === "False"
                    ? "none"
                    : (props.Icon.toLowerCase() as "dot" | "avatar" | "country")
                }
                selectable={props.Checkbox === "True"}
                checkboxLabel={`Select ${source.id}`}
                onDismiss={props.Action === "X close" ? () => undefined : undefined}
                count={props.Action === "Count" ? 5 : undefined}
              >
                Label
              </Tag>
            </div>
          );
        })}
      </div>
      <form aria-label="Interactive tags" className="tag-live-form">
        {visible && (
          <Tag
            size="md"
            selectable
            name="topic"
            checkboxLabel="Select topic"
            onDismiss={() => setVisible(false)}
            dismissLabel="Remove topic"
          >
            Pharmacology
          </Tag>
        )}
        <Tag onDismiss={() => setVisible(false)} dismissLabel="Remove disabled topic" disabled>
          Unavailable
        </Tag>
      </form>
    </section>
  );
}
