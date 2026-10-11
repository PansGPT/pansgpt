import { useState, type CSSProperties } from "react";
import {
  BadgeGroup,
  BadgeGroupReference,
  type BadgeGroupColor,
  Badge,
  BadgeCloseButton,
  BadgeCloseButtonReference,
  badgeColors,
} from "../src";
import { badgeGroupSources } from "./badge-group-source-data";
export function BadgeGroupFixtures(): React.ReactElement {
  const [actions, setActions] = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(true);
  return (
    <section className="preview-section">
      <h2>Badge groups</h2>
      <h2>Badge close actions</h2>
      <div className="badge-close-source-grid">
        {badgeColors.flatMap((color) =>
          (["square", "rounded"] as const).flatMap((shape) =>
            (["default", "hover"] as const).map((state) => (
              <div
                className="badge-close-fixture"
                data-color={color}
                data-shape={shape}
                data-state={state}
                key={color + shape + state}
              >
                <BadgeCloseButtonReference
                  aria-label="Close source badge"
                  color={color}
                  shape={shape}
                  state={state}
                />
              </div>
            ))
          )
        )}
      </div>
      <div
        role="group"
        aria-label="Interactive badge close actions"
        className="avatar-pattern-demo"
      >
        {badgeVisible && (
          <Badge
            color="brand"
            trailing={
              <BadgeCloseButton
                aria-label="Remove selected badge"
                color="brand"
                shape="rounded"
                onClick={() => setBadgeVisible(false)}
              />
            }
          >
            Selected badge
          </Badge>
        )}
        <BadgeCloseButton aria-label="Unavailable badge close" disabled />
        <output aria-live="polite">Badge visible: {String(badgeVisible)}</output>
      </div>
      <div className="badge-group-source-grid">
        {badgeGroupSources.map((source) => (
          <div className="badge-group-source-scroll" key={source.id}>
            <BadgeGroupReference
              className="badge-group-fixture"
              data-source-id={source.id}
              color={/Color=(\w+)/.exec(source.name)?.[1].toLowerCase() as BadgeGroupColor}
              size={/Size=(\w+)/.exec(source.name)?.[1] as "md" | "lg"}
              variant={source.name.includes("modern") ? "modern" : "pill"}
              placement={source.name.includes("Trailing") ? "trailing" : "leading"}
              state={source.name.includes("Hover") ? "hover" : "default"}
              badge={source.badge}
              style={
                {
                  width: source.width,
                  "--badge-group-source-badge-width": `${source.badgeWidth}px`,
                } as CSSProperties
              }
            >
              {source.message}
            </BadgeGroupReference>
          </div>
        ))}
      </div>
      <div role="group" aria-label="Interactive badge groups" className="avatar-pattern-demo">
        <BadgeGroup badge="New feature" color="brand" onAction={() => setActions(actions + 1)}>
          Inspect release
        </BadgeGroup>
        <BadgeGroup badge="Fix now" color="error" placement="trailing" href="#badge-group-details">
          Inspect details
        </BadgeGroup>
        <BadgeGroup badge="Unavailable" onAction={() => setActions(actions + 1)} disabled>
          Disabled action
        </BadgeGroup>
        <BadgeGroup badge="Success" variant="modern" color="success" arrow={false}>
          A longer status message wraps within the available container without losing the original
          dot artwork.
        </BadgeGroup>
        <output aria-live="polite">Badge actions: {actions}</output>
        <p id="badge-group-details">Local details target</p>
      </div>
    </section>
  );
}
