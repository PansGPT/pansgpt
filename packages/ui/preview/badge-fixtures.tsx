import { useState } from "react";
import {
  Badge,
  type BadgeColor,
  type BadgeDecoration,
  type BadgeSize,
  type BadgeVariant,
} from "../src";
import { badgeSources } from "./badge-source-data";
const decorations: Record<string, BadgeDecoration> = {
  False: "none",
  Dot: "dot",
  "Icon leading": "leading",
  "Icon trailing": "trailing",
  Only: "only",
  Avatar: "avatar",
  Country: "country",
  "X close": "close",
};
const variants: Record<string, BadgeVariant> = {
  "Pill color": "pill",
  "Badge color": "color",
  "Badge modern": "modern",
};
export function BadgeFixtures(): React.ReactElement {
  const [removed, setRemoved] = useState(false);
  return (
    <section className="preview-section">
      <h2>Complete badge library</h2>
      <div className="badge-library-grid">
        {badgeSources.map((source) => {
          const props = Object.fromEntries(source.name.split(", ").map((pair) => pair.split("=")));
          const color = props.Color.toLowerCase()
            .replace("blue gray", "gray blue")
            .replaceAll(" ", "-") as BadgeColor;
          return (
            <div key={source.id} data-badge-source-id={source.id}>
              <Badge
                size={props.Size as BadgeSize}
                variant={variants[props.Type]}
                color={color}
                decoration={decorations[props.Icon]}
                aria-label={props.Icon === "Only" ? "Add label" : undefined}
                onDismiss={() => setRemoved(true)}
              >
                Label
              </Badge>
            </div>
          );
        })}
      </div>
      <div data-testid="live-decorated-badges">
        {!removed && (
          <Badge
            decoration="close"
            dismissLabel="Remove pharmacy"
            onDismiss={() => setRemoved(true)}
          >
            Pharmacy
          </Badge>
        )}
        <Badge decoration="close" dismissLabel="Remove locked badge" dismissDisabled>
          Locked
        </Badge>
        <Badge decoration="avatar">Olivia Rhye</Badge>
        <Badge decoration="country">Australia</Badge>
      </div>
      <output data-testid="badge-dismissal">{removed ? "removed" : "present"}</output>
    </section>
  );
}
