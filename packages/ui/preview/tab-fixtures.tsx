import { useState, type CSSProperties } from "react";
import {
  Tabs,
  TabButtonReference,
  type TabButtonVariant,
  type HorizontalTabVariant,
  type TabItem,
} from "../src";
import { tabButtonSources, horizontalTabSources } from "./tab-source-data";
const variants: Record<string, TabButtonVariant> = {
  "Button brand": "brand",
  "Button gray": "gray",
  Underline: "underline",
  "Line (vertical tabs)": "line",
  "Button white": "white",
  "Button minimal": "minimal",
  "Button border": "white",
};
const labels = [
  "My details",
  "Profile",
  "Password",
  "Team",
  "Plan",
  "Billing",
  "Email",
  "Notifications",
  "Integrations",
  "API",
];
const tabItems = (fullWidth: boolean): TabItem[] =>
  (fullWidth ? labels.slice(0, 5) : labels).map((label, index) => ({
    value: String(index),
    label,
    content: `${label} panel`,
    badge: index === (fullWidth ? 3 : 7) ? 2 : undefined,
  }));
const defaultWidths = {
  sm: [93, 68, 91, 60, 53, 65, 61, 144, 106, 47],
  md: [103, 74, 100, 66, 57, 71, 66, 161, 118, 50],
};
export function TabFixtures(): React.ReactElement {
  const [value, setValue] = useState("0");
  const [changes, setChanges] = useState(0);
  return (
    <section className="preview-section">
      <h2>Tab button states</h2>
      <div className="tab-button-source-grid">
        {tabButtonSources.map((source) => (
          <TabButtonReference
            key={source.id}
            className="tab-button-fixture"
            data-source-id={source.id}
            size={/Size=(\w+)/.exec(source.name)?.[1] as "sm" | "md"}
            variant={variants[/Type=([^,]+)/.exec(source.name)?.[1] ?? ""]}
            current={source.name.includes("Current=True")}
            badge={2}
            state={
              /State=(\w+)/.exec(source.name)?.[1].toLowerCase() as "default" | "hover" | "focus"
            }
            style={{ width: source.width }}
          >
            My details
          </TabButtonReference>
        ))}
      </div>
      <h2>Horizontal tabs</h2>
      <div className="horizontal-tabs-source-grid">
        {horizontalTabSources.map((source) => {
          const size = /Size=(\w+)/.exec(source.name)?.[1] as "sm" | "md";
          const type = /Type=([^,]+)/.exec(source.name)?.[1] ?? "";
          const variant =
            type === "Button border" ? "border" : (variants[type] as HorizontalTabVariant);
          const full = source.name.includes("Full width=True");
          const widths =
            variant === "underline"
              ? defaultWidths[size].map((width) => width - 16)
              : source.widths;
          const styles = Object.fromEntries(
            widths.map((width, index) => [`--tab-source-width-${index}`, `${width}px`])
          );
          return (
            <div className="horizontal-tabs-source-scroll" key={source.id}>
              <Tabs
                className="horizontal-tab-fixture"
                data-source-id={source.id}
                label="Source tabs"
                items={tabItems(full)}
                defaultValue="0"
                size={size}
                variant={variant}
                fullWidth={full}
                breakpoint={source.name.includes("Mobile") ? "mobile" : "desktop"}
                style={{ ...styles, width: source.width } as CSSProperties}
              />
            </div>
          );
        })}
      </div>
      <div role="group" aria-label="Interactive horizontal tabs" className="avatar-pattern-demo">
        <Tabs
          label="Study sections"
          items={[
            { value: "0", label: "Overview", content: "Overview panel" },
            { value: "1", label: "Notes", badge: 2, content: "Notes panel" },
            { value: "2", label: "Unavailable", disabled: true, content: "Unavailable panel" },
            { value: "3", label: "Review", content: "Review panel" },
          ]}
          value={value}
          onValueChange={(next) => {
            setValue(next);
            setChanges(changes + 1);
          }}
          variant="border"
          fullWidth
        />
        <output aria-live="polite">
          Selected: {value}; changes: {changes}
        </output>
        <Tabs
          label="Manual study tabs"
          items={tabItems(true)}
          defaultValue="0"
          activationMode="manual"
          variant="underline"
        />
      </div>
    </section>
  );
}
