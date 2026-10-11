"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { cn } from "../utils";
import { ChartAsset } from "./chart-assets";
import { ChartLegend, type ChartLegendItem } from "./chart-primitives";

export interface ChartSeries extends ChartLegendItem {
  values: readonly number[];
}
function seriesColor(series: ChartSeries, index: number): string {
  return series.color ?? `var(--utility-brand-${[700, 500, 300, 600, 400, 200][index % 6]})`;
}
function DataTable({
  label,
  labels,
  series,
}: {
  label: string;
  labels: readonly string[];
  series: readonly ChartSeries[];
}): React.ReactElement {
  return (
    <table className="p-sr-only">
      <caption>{label}</caption>
      <thead>
        <tr>
          <th scope="col">Period</th>
          {series.map((item) => (
            <th scope="col" key={item.id}>
              {item.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labels.map((period, index) => (
          <tr key={`${period}-${index}`}>
            <th scope="row">{period}</th>
            {series.map((item) => (
              <td key={item.id}>
                {Number.isFinite(item.values[index]) ? item.values[index] : "Unavailable"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
export type LineBarChartProps = ComponentProps<"figure"> & {
  label: string;
  labels: readonly string[];
  series: readonly ChartSeries[];
  type?: "line" | "bar";
  legend?: "none" | "top" | "right";
  axisLabels?: { x: string; y: string };
  onToggleSeries?: (id: string) => void;
  onInspect?: (index: number) => void;
};
export function LineBarChart({
  label,
  labels,
  series,
  type = "line",
  legend = "top",
  axisLabels,
  onToggleSeries,
  onInspect,
  className,
  ...props
}: LineBarChartProps): React.ReactElement {
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1216);
  const [selected, setSelected] = useState(0);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry && entry.contentRect.width > 0) setWidth(Math.max(120, entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const visible = series.filter((item) => !item.hidden);
  const finite = visible.flatMap((item) => item.values.filter(Number.isFinite));
  const low = finite.reduce((minimum, value) => Math.min(minimum, value), 0);
  const high = finite.reduce((maximum, value) => Math.max(maximum, value), 0);
  const scale = Math.max(Math.abs(low), Math.abs(high), 1);
  const minimum = low / scale;
  const range = high / scale - minimum || 1;
  const height = 240;
  const left = axisLabels ? 70 : 48;
  const bottom = axisLabels ? 44 : 26;
  const top = 8;
  const plotHeight = height - bottom - top;
  const plotWidth = Math.max(1, width - left - 8);
  const count = Math.max(labels.length, ...series.map((item) => item.values.length), 0);
  const actualLabels = Array.from(
    { length: count },
    (_, index) => labels[index] ?? String(index + 1)
  );
  const current = Math.min(Math.max(0, count - 1), selected);
  const y = (value: number): number => top + (1 - (value / scale - minimum) / range) * plotHeight;
  const x = (index: number): number =>
    left +
    (count <= 1
      ? plotWidth / 2
      : (type === "bar" ? (index + 0.5) / count : index / (count - 1)) * plotWidth);
  const legendNode = (
    <ChartLegend
      orientation={legend === "right" ? "vertical" : "horizontal"}
      items={series.map((item, index) => ({ ...item, color: seriesColor(item, index) }))}
      onToggle={onToggleSeries}
    />
  );
  return (
    <figure
      {...props}
      className={cn("p-data-chart", className)}
      data-type={type}
      data-legend={legend}
      aria-label={label}
    >
      {legend === "top" && legendNode}
      <div className="p-data-chart-row">
        <div ref={root} className="p-data-chart-viewport">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
            {Array.from({ length: 6 }, (_, index) => {
              const ratio = index / 5;
              const coordinate = top + ratio * plotHeight;
              const value = (minimum + (1 - ratio) * range) * scale;
              return (
                <g key={index}>
                  <line
                    x1={left}
                    x2={width - 8}
                    y1={coordinate}
                    y2={coordinate}
                    stroke="var(--border-secondary)"
                    strokeWidth="1"
                  />
                  <text
                    x={left - 8}
                    y={coordinate + 4}
                    textAnchor="end"
                    className="p-data-chart-axis-text"
                  >
                    {Number.isFinite(value)
                      ? value.toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                          notation: Math.abs(value) >= 10000 ? "compact" : "standard",
                        })
                      : ""}
                  </text>
                </g>
              );
            })}
            {visible.map((item, seriesIndex) => {
              const originalIndex = series.findIndex((candidate) => candidate.id === item.id);
              const color = seriesColor(item, originalIndex);
              if (type === "bar") {
                const slot = plotWidth / Math.max(1, count);
                const barWidth = (slot * 0.7) / Math.max(1, visible.length);
                return (
                  <g key={item.id} fill={color}>
                    {item.values.map((value, index) =>
                      Number.isFinite(value) ? (
                        <rect
                          key={index}
                          x={x(index) - slot * 0.35 + seriesIndex * barWidth}
                          y={Math.min(y(value), y(0))}
                          width={Math.max(0, barWidth - 1)}
                          height={Math.abs(y(value) - y(0))}
                          rx="2"
                        >
                          <title>
                            {item.label}: {value}
                          </title>
                        </rect>
                      ) : null
                    )}
                  </g>
                );
              }
              let connected = false;
              const path = item.values
                .map((value, index) => {
                  if (!Number.isFinite(value)) {
                    connected = false;
                    return "";
                  }
                  const command = connected ? "L" : "M";
                  connected = true;
                  return `${command}${x(index)},${y(value)}`;
                })
                .join(" ");
              return (
                <g key={item.id}>
                  <path
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {item.values.length === 1 && Number.isFinite(item.values[0]) && (
                    <circle cx={x(0)} cy={y(item.values[0])} r="3" fill={color} />
                  )}
                  {Number.isFinite(item.values[current]) && (
                    <circle
                      cx={x(current)}
                      cy={y(item.values[current] ?? 0)}
                      r="4"
                      fill="var(--bg-primary)"
                      stroke={color}
                      strokeWidth="2"
                    />
                  )}
                </g>
              );
            })}
            {actualLabels.map((period, index) =>
              index % Math.max(1, Math.ceil(count / Math.max(2, Math.floor(plotWidth / 44)))) ===
                0 || index === count - 1 ? (
                <text
                  key={`${period}-${index}`}
                  x={x(index)}
                  y={height - bottom + 18}
                  textAnchor="middle"
                  className="p-data-chart-axis-text"
                >
                  {period}
                </text>
              ) : null
            )}
            {axisLabels && (
              <>
                <text
                  x={left + plotWidth / 2}
                  y={height - 2}
                  textAnchor="middle"
                  className="p-data-chart-axis-label"
                >
                  {axisLabels.x}
                </text>
                <text
                  transform={`translate(14 ${top + plotHeight / 2}) rotate(-90)`}
                  textAnchor="middle"
                  className="p-data-chart-axis-label"
                >
                  {axisLabels.y}
                </text>
              </>
            )}
          </svg>
        </div>
        {legend === "right" && legendNode}
      </div>
      <div className="p-data-chart-inspection">
        <input
          type="range"
          min={0}
          max={Math.max(0, count - 1)}
          step={1}
          value={current}
          disabled={count === 0}
          aria-label={`Inspect ${label}`}
          aria-valuetext={count > 0 ? actualLabels[current] : "No data"}
          onChange={(event) => {
            const index = Number(event.currentTarget.value);
            setSelected(index);
            onInspect?.(index);
          }}
        />
        <output aria-live="polite">
          {count > 0
            ? `${actualLabels[current]}: ${visible.map((item) => `${item.label} ${Number.isFinite(item.values[current]) ? item.values[current] : "Unavailable"}`).join(", ")}`
            : "No data"}
        </output>
      </div>
      <DataTable label={label} labels={actualLabels} series={series} />
    </figure>
  );
}

export function RadarChartReference({
  legend = "none",
  items = [],
  label,
  className,
  ...props
}: ComponentProps<"div"> & {
  label: string;
  legend?: "none" | "right" | "bottom";
  items?: readonly ChartLegendItem[];
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-radar-chart", className)} data-legend={legend}>
      <ChartAsset name="radarNative" role="img" aria-label={label} />
      {legend !== "none" && (
        <ChartLegend items={items} orientation={legend === "bottom" ? "horizontal" : "vertical"} />
      )}
    </div>
  );
}
export function RadarChart({
  label,
  labels,
  series,
  maximum,
  legend = "right",
  onToggleSeries,
  className,
  ...props
}: ComponentProps<"figure"> & {
  label: string;
  labels: readonly string[];
  series: readonly ChartSeries[];
  maximum?: number;
  legend?: "none" | "right" | "bottom";
  onToggleSeries?: (id: string) => void;
}): React.ReactElement {
  const visible = series.filter((item) => !item.hidden);
  const auto = visible.reduce(
    (max, item) =>
      item.values.reduce(
        (value, current) => (Number.isFinite(current) ? Math.max(value, current) : value),
        max
      ),
    1
  );
  const bound = maximum !== undefined && Number.isFinite(maximum) && maximum > 0 ? maximum : auto;
  const count = labels.length;
  const point = (index: number, ratio: number): { x: number; y: number } => {
    const angle = -Math.PI / 2 + (index / Math.max(count, 1)) * 2 * Math.PI;
    return { x: 196 + 156 * ratio * Math.cos(angle), y: 186 + 156 * ratio * Math.sin(angle) };
  };
  const polygon = (ratio: number): string =>
    labels
      .map((_, index) => {
        const p = point(index, ratio);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  return (
    <figure
      {...props}
      className={cn("p-radar-chart", className)}
      data-legend={legend}
      aria-label={label}
    >
      <svg width={392} height={372} viewBox="0 0 392 372" role="img" aria-label={label}>
        <title>{label}</title>
        {count >= 3 && (
          <>
            {[0.2, 0.4, 0.6, 0.8, 1].map((ratio) => (
              <polygon
                key={ratio}
                points={polygon(ratio)}
                fill="none"
                stroke="var(--border-secondary)"
              />
            ))}
            {labels.map((text, index) => {
              const edge = point(index, 1);
              const textPoint = point(index, 1.12);
              return (
                <g key={`${text}-${index}`}>
                  <line
                    x1={196}
                    y1={186}
                    x2={edge.x}
                    y2={edge.y}
                    stroke="var(--border-secondary)"
                  />
                  <text
                    x={textPoint.x}
                    y={textPoint.y + 4}
                    textAnchor="middle"
                    className="p-data-chart-axis-text"
                  >
                    {text}
                  </text>
                </g>
              );
            })}
            {visible.map((item) => (
              <polygon
                key={item.id}
                points={labels
                  .map((_, position) => {
                    const value = item.values[position] ?? 0;
                    const p = point(
                      position,
                      Number.isFinite(value) ? Math.max(0, Math.min(1, value / bound)) : 0
                    );
                    return `${p.x},${p.y}`;
                  })
                  .join(" ")}
                fill={seriesColor(
                  item,
                  series.findIndex((candidate) => candidate.id === item.id)
                )}
                fillOpacity={0.15}
                stroke={seriesColor(
                  item,
                  series.findIndex((candidate) => candidate.id === item.id)
                )}
                strokeWidth={2}
              />
            ))}
          </>
        )}
      </svg>
      {legend !== "none" && (
        <ChartLegend
          items={series.map((item, index) => ({ ...item, color: seriesColor(item, index) }))}
          onToggle={onToggleSeries}
          orientation={legend === "bottom" ? "horizontal" : "vertical"}
        />
      )}
      <DataTable label={label} labels={labels} series={series} />
    </figure>
  );
}
