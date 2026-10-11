import { type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { ChartAsset, type ChartAssetName } from "./chart-assets";
import { ChartLegend, type ChartLegendItem } from "./chart-primitives";

export type ChartSize = "xs" | "sm" | "md" | "lg";
const dimensions = { xs: 160, sm: 200, md: 240, lg: 280 } as const;
export type GaugeProps = Omit<ComponentProps<"div">, "children"> & {
  size?: ChartSize;
  label: string;
  value: ReactNode;
  legend?: "none" | "right" | "bottom";
  items?: readonly ChartLegendItem[];
};
function GaugeFrame({
  size = "xs",
  label,
  value,
  legend = "none",
  items = [],
  className,
  children,
  ...props
}: GaugeProps & { children: ReactNode }): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-activity-gauge", className)}
      data-size={size}
      data-legend={legend}
    >
      <div
        className="p-activity-gauge-plot"
        style={{ width: dimensions[size], height: dimensions[size] }}
      >
        {children}
        <div className="p-activity-gauge-copy">
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      </div>
      {legend !== "none" && (
        <ChartLegend orientation={legend === "bottom" ? "horizontal" : "vertical"} items={items} />
      )}
    </div>
  );
}
/** Fixed original Figma artwork. Use ActivityGauge for changing percentages. */
export function ActivityGaugeReference({ size = "xs", ...props }: GaugeProps): React.ReactElement {
  const suffix = size === "xs" ? "3" : size === "sm" ? "2" : size === "lg" ? "1" : "";
  return (
    <GaugeFrame {...props} size={size}>
      {["Outer", "Middle", "Inner"].map((ring) => (
        <ChartAsset
          key={ring}
          className="p-activity-gauge-ring"
          data-ring={ring.toLowerCase()}
          name={`source8_imgRing${ring}${suffix}` as ChartAssetName}
        />
      ))}
    </GaugeFrame>
  );
}
export function ActivityGauge({
  percentages,
  size = "xs",
  ...props
}: GaugeProps & { percentages: readonly number[] }): React.ReactElement {
  const side = dimensions[size];
  const stroke = size === "xs" ? 8 : size === "sm" ? 12 : size === "md" ? 16 : 18;
  const diameter =
    size === "xs"
      ? [152, 128, 104]
      : size === "sm"
        ? [188, 154, 122]
        : size === "md"
          ? [224, 184, 144]
          : [262, 214, 166];
  return (
    <GaugeFrame {...props} size={size}>
      <svg
        width={side}
        height={side}
        viewBox={`0 0 ${side} ${side}`}
        role="img"
        aria-label={`${props.label}: ${percentages
          .slice(0, 3)
          .map((value) => `${Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0}%`)
          .join(", ")}`}
      >
        <title>{props.label}</title>
        {diameter.map((value, index) => {
          const radius = value / 2;
          const circumference = 2 * Math.PI * radius;
          const percentage = percentages[index] ?? 0;
          const progress = Number.isFinite(percentage) ? Math.min(100, Math.max(0, percentage)) : 0;
          const center = side / 2 + (size === "sm" && index > 0 ? 1 : 0);
          return (
            <g key={index} fill="none" strokeWidth={stroke}>
              <circle cx={center} cy={center} r={radius} stroke="var(--bg-secondary)" />
              <circle
                cx={center}
                cy={center}
                r={radius}
                stroke={`var(--utility-brand-${[700, 600, 400][index]})`}
                strokeDasharray={`${(circumference * progress) / 100} ${circumference}`}
                strokeLinecap={progress > 0 && progress < 100 ? "round" : "butt"}
                transform={`rotate(-90 ${center} ${center})`}
              />
            </g>
          );
        })}
      </svg>
    </GaugeFrame>
  );
}

export type PieChartReferenceProps = ComponentProps<"div"> & {
  size?: ChartSize | "xxs";
  hole?: 0 | 25 | 50 | 75;
  legend?: boolean;
  items?: readonly ChartLegendItem[];
  label: string;
};
export function PieChartReference({
  size = "xs",
  hole = 50,
  legend = false,
  items = [],
  label,
  className,
  ...props
}: PieChartReferenceProps): React.ReactElement {
  const side = size === "xxs" ? 120 : dimensions[size];
  const graphic: ChartAssetName =
    hole === 50
      ? (`pieNative${side}` as ChartAssetName)
      : hole === 0
        ? "source10_imgHoleFalse"
        : hole === 25
          ? "source10_imgHole25"
          : "source10_imgHole75";
  return (
    <div {...props} className={cn("p-pie-chart", className)}>
      <span className="p-pie-chart-plot" role="img" aria-label={label}>
        <ChartAsset name={graphic} />
      </span>
      {legend && <ChartLegend items={items} />}
    </div>
  );
}

export interface PieSeries extends ChartLegendItem {
  value: number;
}
export function PieChart({
  series,
  size = "xs",
  hole = 50,
  legend = true,
  label,
  onToggle,
  className,
  ...props
}: Omit<PieChartReferenceProps, "items" | "onToggle"> & {
  series: readonly PieSeries[];
  onToggle?: (id: string) => void;
}): React.ReactElement {
  const side = size === "xxs" ? 120 : dimensions[size];
  const radius = side / 2;
  const inner = (radius * hole) / 100;
  const visible = series.filter(
    (item) => !item.hidden && Number.isFinite(item.value) && item.value > 0
  );
  const scale = visible.reduce((maximum, item) => Math.max(maximum, item.value), 0);
  const total = visible.reduce((sum, item) => sum + item.value / scale, 0);
  let angle = -Math.PI / 2;
  return (
    <div {...props} className={cn("p-pie-chart", className)}>
      <svg width={side} height={side} viewBox={`0 0 ${side} ${side}`} role="img" aria-label={label}>
        <title>{label}</title>
        {visible.map((item) => {
          const fraction = total > 0 ? item.value / scale / total : 0;
          const start = angle;
          angle += fraction * 2 * Math.PI;
          const color =
            item.color ??
            `var(--utility-brand-${[600, 500, 400, 300, 200, 100][series.findIndex((candidate) => candidate.id === item.id) % 6]})`;
          if (fraction >= 1 - 1e-10)
            return (
              <circle
                key={item.id}
                cx={radius}
                cy={radius}
                r={(radius + inner) / 2}
                stroke={color}
                strokeWidth={radius - inner}
                fill="none"
              >
                <title>
                  {item.label}: {item.value}
                </title>
              </circle>
            );
          const point = (r: number, a: number): string =>
            `${radius + r * Math.cos(a)},${radius + r * Math.sin(a)}`;
          const large = fraction > 0.5 ? 1 : 0;
          const path = `M${point(radius, start)} A${radius},${radius} 0 ${large} 1 ${point(radius, angle)} ${inner > 0 ? `L${point(inner, angle)} A${inner},${inner} 0 ${large} 0 ${point(inner, start)}` : `L${radius},${radius}`} Z`;
          return (
            <path key={item.id} d={path} fill={color}>
              <title>
                {item.label}: {item.value}
              </title>
            </path>
          );
        })}
        {visible.length === 0 && (
          <circle
            cx={radius}
            cy={radius}
            r={(radius + inner) / 2}
            stroke="var(--bg-secondary)"
            strokeWidth={radius - inner}
            fill="none"
          />
        )}
      </svg>
      {legend && <ChartLegend items={series} onToggle={onToggle} />}
      <table className="p-sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Series</th>
            <th scope="col">Value</th>
          </tr>
        </thead>
        <tbody>
          {series.map((item) => (
            <tr key={item.id}>
              <th scope="row">{item.label}</th>
              <td>{Number.isFinite(item.value) ? item.value : "Unavailable"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
