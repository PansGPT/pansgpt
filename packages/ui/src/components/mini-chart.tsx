import type { ComponentProps, CSSProperties } from "react";
import { cn } from "../utils";
import {
  MetricAsset,
  miniChartReferences,
  metricWideChartReferences,
  type MetricAssetName,
} from "./metric-assets";

export type MiniChartType =
  | "wavy01"
  | "wavy02"
  | "wavy03"
  | "wavy04"
  | "wavy05"
  | "wavy06"
  | "wavy07"
  | "realistic01"
  | "realistic02"
  | "realistic03"
  | "straight"
  | "layers";
interface ChartLayer {
  readonly asset: MetricAssetName;
  readonly name: string;
  readonly x: number;
  readonly y: number;
}
interface ChartReference {
  readonly width: number;
  readonly height: number;
  readonly layers: readonly ChartLayer[];
}
function OriginalChartLayers({
  chart,
  background,
  markers,
}: {
  chart: ChartReference;
  background: boolean;
  markers: boolean;
}): React.ReactElement {
  return (
    <>
      {chart.layers
        .filter(
          (layer) =>
            (background || layer.name !== "Background") && (markers || layer.name !== "Marker")
        )
        .map((layer) => (
          <MetricAsset
            key={layer.asset}
            name={layer.asset}
            style={{ position: "absolute", left: layer.x, top: layer.y }}
          />
        ))}
    </>
  );
}
/** Original source artwork; supply Sparkline or a full chart for actual changing data. */
export function MiniChart({
  type = "wavy01",
  trend = "positive",
  background = true,
  markers = true,
  label,
  className,
  style,
  ...props
}: ComponentProps<"span"> & {
  type?: MiniChartType;
  trend?: "positive" | "negative";
  background?: boolean;
  markers?: boolean;
  label?: string;
}): React.ReactElement {
  const chart = miniChartReferences[`${type}_${trend}`];
  return (
    <span
      {...props}
      className={cn("p-mini-chart", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ ...style, width: chart.width, height: chart.height }}
    >
      <OriginalChartLayers chart={chart} background={background} markers={markers} />
    </span>
  );
}
export function MetricChartReference({
  type,
  breakpoint = "desktop",
  label,
  className,
  ...props
}: ComponentProps<"span"> & {
  type: "chart03" | "chart04";
  breakpoint?: "desktop" | "mobile";
  label?: string;
}): React.ReactElement {
  const key =
    type === "chart03"
      ? breakpoint === "desktop"
        ? "5002_371330"
        : "5002_371353"
      : breakpoint === "desktop"
        ? "7947_105588"
        : "7947_105605";
  const chart = metricWideChartReferences[key];
  return (
    <span
      {...props}
      className={cn("p-mini-chart", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: chart.width, height: chart.height }}
    >
      <OriginalChartLayers chart={chart} background markers={false} />
    </span>
  );
}

export type SparklineProps = Omit<
  ComponentProps<"svg">,
  "children" | "width" | "height" | "fill" | "values"
> & {
  values: readonly number[];
  label: string;
  width?: number;
  height?: number;
  trend?: "positive" | "negative";
  fill?: boolean;
  marker?: boolean;
};
export function Sparkline({
  values,
  label,
  width = 112,
  height = 56,
  trend = "positive",
  fill = true,
  marker = true,
  className,
  style,
  ...props
}: SparklineProps): React.ReactElement {
  const points = values.filter(Number.isFinite);
  const safeWidth = Number.isFinite(width) ? Math.max(8, width) : 112;
  const safeHeight = Number.isFinite(height) ? Math.max(8, height) : 56;
  const low = points.reduce((minimum, value) => Math.min(minimum, value), Infinity);
  const high = points.reduce((maximum, value) => Math.max(maximum, value), -Infinity);
  const scale = Math.max(Math.abs(low), Math.abs(high), 1);
  const normalizedLow = low / scale;
  const normalizedRange = high / scale - normalizedLow;
  const coords = points.map((value, index) => ({
    x: points.length === 1 ? safeWidth / 2 : 4 + (index / (points.length - 1)) * (safeWidth - 8),
    y:
      high === low
        ? safeHeight / 2
        : 4 + (1 - (value / scale - normalizedLow) / normalizedRange) * (safeHeight - 8),
  }));
  const line = coords.map((point, index) => `${index ? "L" : "M"}${point.x},${point.y}`).join(" ");
  const first = coords[0];
  const last = coords.at(-1);
  const area = first && last ? `${line} L${last.x},${safeHeight} L${first.x},${safeHeight} Z` : "";
  const chartStyle: CSSProperties = {
    ...style,
    color: trend === "positive" ? "var(--fg-success-secondary)" : "var(--fg-error-secondary)",
  };
  return (
    <svg
      {...props}
      className={cn("p-sparkline", className)}
      width={safeWidth}
      height={safeHeight}
      viewBox={`0 0 ${safeWidth} ${safeHeight}`}
      role="img"
      aria-label={label}
      style={chartStyle}
    >
      <title>{label}</title>
      {fill && coords.length > 1 && <path d={area} fill="currentColor" opacity=".1" />}
      {coords.length > 1 && (
        <path
          d={line}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />
      )}
      {(marker || coords.length === 1) && last && (
        <circle
          cx={last.x}
          cy={last.y}
          r="3"
          fill="var(--bg-primary)"
          stroke="currentColor"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}
