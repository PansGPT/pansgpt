"use client";
import { useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import type { ArtifactItem, ChartContent } from "@pansgpt/types";
import { chartContentSchema, diagramContentSchema } from "@/lib/study-artifacts";
import { RichCard, RichDisclosure, UnavailableArtifact } from "./RichCard";
import { DiagramView } from "./DiagramView";
const colors = [
  "var(--fg-brand-primary-600)",
  "#5287cd",
  "#c78b43",
  "#a879b9",
  "#bf6267",
  "#5b9996",
  "#888b49",
  "#9d7d65",
];
const fmt = (n: number) =>
  new Intl.NumberFormat(undefined, { maximumSignificantDigits: 5 }).format(n);
export function GraphCard({ artifact }: { artifact: ArtifactItem }) {
  const diagram = diagramContentSchema.safeParse(artifact.content);
  if (diagram.success)
    return (
      <RichCard title={artifact.title} label="Diagram" icon={<ChartNoAxesCombined size={20} />}>
        <DiagramView code={diagram.data.data.code} />
      </RichCard>
    );
  const chart = chartContentSchema.safeParse(artifact.content);
  return chart.success ? (
    <Chart key={JSON.stringify(chart.data)} chart={chart.data} />
  ) : (
    <UnavailableArtifact title={artifact.title} />
  );
}
function Chart({ chart }: { chart: ChartContent }) {
  const [hidden, setHidden] = useState<Set<number>>(() => new Set());
  const series = chart.data.datasets.map((set, index) => ({
    ...set,
    index,
    points: set.data.map((point, i) => (typeof point === "number" ? { x: i, y: point } : point)),
  }));
  const active = series.filter((set) => !hidden.has(set.index));
  const points = active.flatMap((set) => set.points);
  const xs = points.map((point) => point.x),
    ys = points.map((point) => point.y);
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(0, ...ys),
    maxY = Math.max(0, ...ys);
  const x = (value: number) => 60 + ((value - minX) / (maxX - minX || 1)) * 490;
  const y = (value: number) => 235 - ((value - minY) / (maxY - minY || 1)) * 210;
  const categorical = series.every((set) => set.data.every((point) => typeof point === "number"));
  const barWidth = Math.min(40, 440 / (chart.data.labels?.length || 1) / active.length);
  return (
    <RichCard
      title={chart.title}
      label={`${chart.type} chart`}
      icon={<ChartNoAxesCombined size={20} />}
    >
      <div className="chat-chart-legend" aria-label="Chart series">
        {series.map((set) => (
          <button
            key={set.index}
            type="button"
            aria-pressed={!hidden.has(set.index)}
            disabled={!hidden.has(set.index) && active.length === 1}
            onClick={() =>
              setHidden((old) => {
                const next = new Set(old);
                if (next.has(set.index)) next.delete(set.index);
                else next.add(set.index);
                return next;
              })
            }
          >
            <i style={{ background: colors[set.index] }} />
            {set.label || `Series ${set.index + 1}`}
          </button>
        ))}
      </div>
      <svg
        className="chat-chart"
        viewBox="0 0 600 285"
        role="img"
        aria-label={`${chart.title}. Values available in the data table below.`}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const value = minY + ((maxY - minY || 1) * i) / 4;
          return (
            <g key={i}>
              <line x1="60" x2="550" y1={y(value)} y2={y(value)} className="chat-chart-grid" />
              <text x="50" y={y(value) + 4} textAnchor="end">
                {fmt(value)}
              </text>
            </g>
          );
        })}
        {active.map((set, group) => (
          <g key={set.index} style={{ color: colors[set.index] }}>
            {chart.type === "line" && (
              <polyline
                points={set.points.map((point) => `${x(point.x)},${y(point.y)}`).join(" ")}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              />
            )}
            {set.points.map((point, i) =>
              chart.type === "bar" ? (
                <rect
                  key={i}
                  x={
                    60 +
                    ((i + 0.5) * 490) / set.points.length +
                    (group - active.length / 2) * barWidth
                  }
                  y={Math.min(y(point.y), y(0))}
                  width={barWidth - 2}
                  height={Math.max(1, Math.abs(y(point.y) - y(0)))}
                  rx="2"
                  fill="currentColor"
                >
                  <title>
                    {chart.data.labels?.[i]}: {fmt(point.y)}
                  </title>
                </rect>
              ) : (
                <circle key={i} cx={x(point.x)} cy={y(point.y)} r="3.5" fill="currentColor">
                  <title>
                    {set.label}: {categorical ? chart.data.labels?.[i] : fmt(point.x)},{" "}
                    {fmt(point.y)}
                  </title>
                </circle>
              )
            )}
          </g>
        ))}
        {(categorical
          ? (chart.data.labels || [])
              .map((label, i) => ({
                label,
                x:
                  chart.type === "bar"
                    ? 60 + ((i + 0.5) * 490) / (chart.data.labels?.length || 1)
                    : x(i),
              }))
              .filter(
                (_, i) => i % Math.max(1, Math.ceil((chart.data.labels?.length || 1) / 6)) === 0
              )
          : [minX, (minX + maxX) / 2, maxX].map((value) => ({ label: fmt(value), x: x(value) }))
        ).map((tick, i) => (
          <text key={i} x={tick.x} y="256" textAnchor="middle">
            {tick.label.length > 16 ? tick.label.slice(0, 14) + "…" : tick.label}
          </text>
        ))}
        <text x="300" y="280" textAnchor="middle">
          {chart.data.x_label || ""}
        </text>
        {chart.data.y_label && (
          <text x="60" y="14">
            {chart.data.y_label}
          </text>
        )}
      </svg>
      <RichDisclosure label="View data">
        <div className="chat-chart-table" tabIndex={0}>
          <table>
            <caption>{chart.title}</caption>
            <thead>
              <tr>
                <th>Series</th>
                <th>{chart.data.x_label || "X"}</th>
                <th>{chart.data.y_label || "Value"}</th>
              </tr>
            </thead>
            <tbody>
              {series.flatMap((set) =>
                set.points.map((point, i) => (
                  <tr key={`${set.index}:${i}`}>
                    <td>{set.label}</td>
                    <td>{categorical ? chart.data.labels?.[i] : fmt(point.x)}</td>
                    <td>{fmt(point.y)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </RichDisclosure>
    </RichCard>
  );
}
