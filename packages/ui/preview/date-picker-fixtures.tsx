import { useState } from "react";
import {
  Button,
  DatePickerDay,
  DatePickerListItem,
  DatePickerMenu,
  DatePickerDropdown,
  DatePickerModal,
  defaultDatePresets,
  type DateRange,
} from "../src";
import { dateSources } from "./date-source-data";
const selected: DateRange = { start: "2025-01-10", end: "2025-01-16" };
const dots = ["2025-01-01", "2025-01-30", "2025-02-04", "2025-02-14", "2025-03-08"];
export function DatePickerFixtures(): React.ReactElement {
  const [action, setAction] = useState("");
  const [range, setRange] = useState<DateRange>({ start: "2025-01-10", end: "2025-01-16" });
  const presets = defaultDatePresets("2025-01-30").map((item) =>
    item.id === "last-week" ? { ...item, range: selected } : item
  );
  return (
    <section className="preview-section">
      <h2>Date picker library</h2>
      {dateSources
        .filter((family) =>
          ["1150:62", "1150:1925", "1150:16803", "1547:269867", "7365:57922"].includes(family.id)
        )
        .map((family) => (
          <section key={family.id}>
            <h3>{family.name}</h3>
            <div className="date-source-scroll">
              <div className="date-source-grid" data-family={family.id}>
                {family.variants.map((source) => {
                  const mode = source.name.includes("Dual dates") ? "range" : "single";
                  const breakpoint = source.name.includes("Mobile") ? "mobile" : "desktop";
                  const sourceRange =
                    mode === "range" ? selected : { start: selected.start, end: null };
                  const active = source.name.includes("State=Active");
                  const props = {
                    mode,
                    breakpoint,
                    today: "2025-01-30",
                    initialMonth: "2025-01-01",
                    activeDates: dots,
                    disableOutsideMonth: true,
                    referenceHoverDate: "2025-01-28",
                    referencePreset: "last-week",
                    presets,
                    onApply: (value: DateRange) => setAction(JSON.stringify(value)),
                    onCancel: () => setAction("Cancel"),
                  } as const;
                  return (
                    <div
                      key={source.id}
                      data-date-source-id={source.id}
                      style={{ width: source.width }}
                    >
                      {family.id === "1150:62" ? (
                        <DatePickerListItem
                          selected={source.name.includes("Selected=True")}
                          referenceState={
                            source.name.includes("Focused")
                              ? "focused"
                              : source.name.includes("Hover")
                                ? "hover"
                                : "default"
                          }
                          onClick={() => setAction("List item")}
                        >
                          List item
                        </DatePickerListItem>
                      ) : family.id === "7365:57922" ? (
                        <DatePickerDay
                          appearance={
                            source.name.includes("Selected")
                              ? "selected"
                              : source.name.includes("Today's date")
                                ? "today"
                                : source.name.includes("Active")
                                  ? "active"
                                  : "default"
                          }
                          referenceState={
                            source.name.includes("Disabled")
                              ? "disabled"
                              : source.name.includes("Hover")
                                ? "hover"
                                : "default"
                          }
                          dot
                          leftConnector
                          rightConnector
                          onClick={() => setAction("Day selected")}
                        >
                          1
                        </DatePickerDay>
                      ) : family.id === "1150:1925" ? (
                        <DatePickerMenu {...props} defaultValue={sourceRange} />
                      ) : family.id === "1150:16803" ? (
                        <DatePickerDropdown
                          {...props}
                          defaultValue={active ? sourceRange : undefined}
                          open={source.name.includes("Opened=True")}
                          reference
                          onOpenChange={(value) =>
                            setAction(value ? "Open picker" : "Close picker")
                          }
                        />
                      ) : (
                        <DatePickerModal {...props} defaultValue={sourceRange} reference open />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      <h2>Live date selection</h2>
      <div className="date-live-examples">
        <div data-testid="live-date-range">
          <DatePickerDropdown
            label="Choose study dates"
            mode="range"
            breakpoint="mobile"
            today="2025-01-30"
            initialMonth="2025-01-01"
            value={range}
            onValueChange={setRange}
          />
        </div>
        <DatePickerModal
          title="Choose review date"
          today="2025-01-30"
          initialMonth="2025-01-01"
          breakpoint="mobile"
          trigger={
            <Button leadingIcon={null} trailingIcon={null}>
              Open date modal
            </Button>
          }
          onApply={(value) => setAction(JSON.stringify(value))}
        />
        <div data-testid="live-bounded-calendar">
          <DatePickerMenu
            today="2025-01-30"
            initialMonth="2025-01-01"
            defaultValue={{ start: "2025-01-10", end: null }}
            minimum="2025-01-05"
            maximum="2025-02-20"
            isDateDisabled={(date) => date === "2025-01-11"}
            onApply={(value) => setAction(JSON.stringify(value))}
          />
        </div>
      </div>
      <output data-testid="date-value">{JSON.stringify(range)}</output>
      <output data-testid="date-action">{action}</output>
    </section>
  );
}
