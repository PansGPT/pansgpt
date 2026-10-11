import { type ComponentProps } from "react";
import { cn } from "../utils";
import { ChartAsset, chartAssetDimensions, type ChartAssetName } from "./chart-assets";
import { ChartAxisLabel, ChartLegend, ChartXAxis, ChartYAxis } from "./chart-primitives";
import { chartReferenceLayouts, chartDataLayouts } from "./chart-reference-data";

export type LineBarChartReferenceId = (typeof chartReferenceLayouts)[number]["id"];
export type ChartDataReferenceId = (typeof chartDataLayouts)[number]["id"];
const referenceSeries = ["Series 1", "Series 2", "Series 3"].map((label) => ({ id: label, label }));
/** The fixed original dataset; use LineBarChart with actual application data. */
export function LineBarChartReference({
  variantId = "1061:47355",
  label,
  className,
  ...props
}: ComponentProps<"div"> & {
  variantId?: LineBarChartReferenceId;
  label: string;
}): React.ReactElement {
  const source =
    chartReferenceLayouts.find((item) => item.id === variantId) ?? chartReferenceLayouts[0];
  const mobile = source.name.includes("Mobile");
  const hasLabels = source.name.includes("Axis labels=True");
  return (
    <div
      {...props}
      className={cn("p-chart-reference", className)}
      style={{ ...props.style, width: source.width, height: source.height }}
      role="img"
      aria-label={label}
    >
      {source.slots.map((slot) => {
        const style = { left: slot.x, top: slot.y, width: slot.width, height: slot.height };
        if (slot.name === "_Chart data")
          return (
            <ChartAsset
              key={slot.id}
              style={{ left: slot.x, top: slot.y }}
              name={`plot${variantId.replace(":", "_")}` as ChartAssetName}
            />
          );
        if (slot.name === "_X-axis")
          return (
            <ChartXAxis key={slot.id} style={style} breakpoint={mobile ? "mobile" : "desktop"} />
          );
        if (slot.name === "_Y-axis")
          return (
            <ChartYAxis
              key={slot.id}
              style={style}
              labels={hasLabels ? ["1,000", "800", "600", "400", "200", "0"] : undefined}
            />
          );
        if (slot.name === "_X-axis label" || slot.name === "_Y-axis label")
          return (
            <ChartAxisLabel
              key={slot.id}
              style={style}
              axis={slot.name.startsWith("_X") ? "x" : "y"}
            >
              {slot.name.startsWith("_X") ? "Month" : "Active users"}
            </ChartAxisLabel>
          );
        if (slot.name === "_Legend")
          return (
            <ChartLegend
              key={slot.id}
              style={style}
              items={referenceSeries}
              orientation={slot.height <= 20 ? "horizontal" : "vertical"}
            />
          );
        return null;
      })}
    </div>
  );
}
export function ChartDataReference({
  variantId = "1062:46534",
  label,
  className,
  ...props
}: ComponentProps<"span"> & {
  variantId?: ChartDataReferenceId;
  label: string;
}): React.ReactElement {
  const source = chartDataLayouts.find((item) => item.id === variantId) ?? chartDataLayouts[0];
  const asset = `plot${variantId.replace(":", "_")}` as ChartAssetName;
  const graphic = chartAssetDimensions[asset];
  return (
    <span
      {...props}
      className={cn("p-chart-data-reference", className)}
      style={{ ...props.style, width: source.width, height: source.height }}
      role="img"
      aria-label={label}
    >
      <ChartAsset
        name={asset}
        style={{
          position: "absolute",
          left: (source.width - (graphic?.width ?? source.width)) / 2,
          top: (source.height - (graphic?.height ?? source.height)) / 2,
        }}
      />
    </span>
  );
}
