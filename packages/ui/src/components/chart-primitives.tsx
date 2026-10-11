"use client";

import { type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { ChartAsset } from "./chart-assets";

export function ChartAxisLabel({
  axis = "x",
  children,
  className,
  ...props
}: ComponentProps<"div"> & { axis?: "x" | "y" }): React.ReactElement {
  return (
    <div {...props} className={cn("p-chart-axis-label", className)} data-axis={axis}>
      <span>{children}</span>
    </div>
  );
}
export type ChartPeriod = "12 months" | "30 days" | "7 days";
export function ChartXAxis({
  period = "12 months",
  breakpoint = "desktop",
  labels,
  className,
  ...props
}: ComponentProps<"div"> & {
  period?: ChartPeriod;
  breakpoint?: "desktop" | "mobile";
  labels?: readonly string[];
}): React.ReactElement {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const values =
    labels ??
    (period === "12 months"
      ? breakpoint === "mobile"
        ? months.filter((_, index) => index % 2 === 0 || index === 11)
        : months
      : period === "7 days"
        ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        : Array.from({ length: breakpoint === "mobile" ? 8 : 15 }, (_, index) =>
            String(2 + index * (breakpoint === "mobile" ? 4 : 2))
          ));
  return (
    <div
      {...props}
      className={cn("p-chart-x-axis", className)}
      data-period={period}
      data-breakpoint={breakpoint}
    >
      {values.map((value, index) => (
        <span key={`${value}-${index}`}>{value}</span>
      ))}
    </div>
  );
}
export interface ChartLegendItem {
  id: string;
  label: string;
  marker?: ReactNode;
  color?: string;
  hidden?: boolean;
}
export function ChartLegend({
  items,
  orientation = "vertical",
  onToggle,
  className,
  ...props
}: Omit<ComponentProps<"ul">, "onToggle"> & {
  items: readonly ChartLegendItem[];
  orientation?: "horizontal" | "vertical";
  onToggle?: (id: string) => void;
}): React.ReactElement {
  return (
    <ul {...props} className={cn("p-chart-legend", className)} data-orientation={orientation}>
      {items.map((item, index) => (
        <li key={item.id}>
          {onToggle ? (
            <button type="button" aria-pressed={!item.hidden} onClick={() => onToggle(item.id)}>
              <span className="p-chart-legend-marker" style={{ backgroundColor: item.color }}>
                {item.marker ??
                  (!item.color && (
                    <ChartAsset
                      name={
                        `source6_img${orientation === "vertical" ? "Dot" : "Color"}${index === 0 ? "" : Math.min(index, 5)}` as ComponentProps<
                          typeof ChartAsset
                        >["name"]
                      }
                    />
                  ))}
              </span>
              <span>{item.label}</span>
            </button>
          ) : (
            <>
              <span className="p-chart-legend-marker" style={{ backgroundColor: item.color }}>
                {item.marker ??
                  (!item.color && (
                    <ChartAsset
                      name={
                        `source6_img${orientation === "vertical" ? "Dot" : "Color"}${index === 0 ? "" : Math.min(index, 5)}` as ComponentProps<
                          typeof ChartAsset
                        >["name"]
                      }
                    />
                  ))}
              </span>
              <span>{item.label}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}
export function ChartYAxisLine({
  label,
  className,
  ...props
}: ComponentProps<"div"> & { label?: ReactNode }): React.ReactElement {
  return (
    <div {...props} className={cn("p-chart-y-line", className)} data-label={label !== undefined}>
      {label !== undefined ? (
        <>
          <span>{label}</span>
          <div>
            <ChartAsset name="source5_imgDivider" />
          </div>
        </>
      ) : (
        <ChartAsset name="source5_imgLabelFalse" />
      )}
    </div>
  );
}
export function ChartYAxis({
  labels,
  className,
  ...props
}: ComponentProps<"div"> & { labels?: readonly ReactNode[] }): React.ReactElement {
  return (
    <div {...props} className={cn("p-chart-y-axis", className)}>
      {(labels ?? Array.from({ length: 6 }, () => undefined)).map((label, index) => (
        <ChartYAxisLine key={index} label={label} />
      ))}
    </div>
  );
}
export function ChartMarker({
  type = "line",
  value,
  date,
  tooltip = true,
  cursor = false,
  className,
  ...props
}: ComponentProps<"div"> & {
  type?: "line" | "dash" | "minimal";
  value: ReactNode;
  date?: ReactNode;
  tooltip?: boolean;
  cursor?: boolean;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-chart-marker", className)} data-type={type}>
      {tooltip && (
        <div className="p-chart-marker-tooltip">
          <strong>{value}</strong>
          {date && type !== "minimal" && <span>{date}</span>}
        </div>
      )}
      {cursor && <ChartAsset className="p-chart-marker-cursor" name="source14_imgCursor" />}
      {type !== "minimal" && <span className="p-chart-marker-dot" />}
      <span className="p-chart-marker-line">
        <ChartAsset
          name={
            type === "minimal"
              ? "source14_imgLine1"
              : type === "dash"
                ? "source14_imgLine2"
                : "source14_imgLine"
          }
        />
      </span>
    </div>
  );
}
