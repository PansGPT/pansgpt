import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { MetricAsset, type MetricAssetName } from "./metric-assets";

export type MetricChangeProps = ComponentProps<"span"> & {
  value: ReactNode;
  trend?: "positive" | "negative";
  variant?: "arrow" | "trend" | "badge";
  label?: string;
};
export function MetricChange({
  value,
  trend = "positive",
  variant = "arrow",
  label,
  className,
  ...props
}: MetricChangeProps): React.ReactElement {
  const asset: MetricAssetName =
    variant === "badge"
      ? trend === "positive"
        ? "change_imgArrowUpRight"
        : "change_imgArrowDownRight"
      : variant === "trend"
        ? trend === "positive"
          ? "change_imgTrendUp01"
          : "change_imgTrendDown01"
        : trend === "positive"
          ? "change_imgArrowUp"
          : "change_imgArrowDown";
  return (
    <span
      {...props}
      className={cn("p-metric-change", className)}
      data-variant={variant}
      data-trend={trend}
      aria-label={label}
    >
      <MetricAsset name={asset} />
      {!label && (
        <span className="p-sr-only">{trend === "positive" ? "Increase " : "Decrease "}</span>
      )}
      <span>{value}</span>
    </span>
  );
}

export type MetricItemType =
  | "simple"
  | "icon01"
  | "icon02"
  | "icon03"
  | "icon04"
  | "chart01"
  | "chart02"
  | "chart03"
  | "chart04";
export type MetricItemProps = Omit<ComponentProps<"article">, "title"> & {
  title: ReactNode;
  value: ReactNode;
  change?: ReactNode;
  comparison?: ReactNode;
  type?: MetricItemType;
  breakpoint?: "auto" | "desktop" | "mobile";
  icon?: ReactNode;
  chart?: ReactNode;
  menu?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};
export function MetricItem({
  title,
  value,
  change,
  comparison,
  type = "simple",
  breakpoint = "auto",
  icon,
  chart,
  menu,
  action,
  headingLevel = 3,
  className,
  ...props
}: MetricItemProps): React.ReactElement {
  const titleId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
  const heading = (
    <Heading id={titleId} className="p-metric-heading">
      {title}
    </Heading>
  );
  const featured = icon != null && (
    <span className="p-metric-featured" aria-hidden="true">
      {icon}
    </span>
  );
  const delta =
    change != null || comparison != null ? (
      <span className="p-metric-delta">
        {change}
        {comparison != null && <span className="p-metric-comparison">{comparison}</span>}
      </span>
    ) : null;
  const number = (
    <div className="p-metric-number-row">
      <strong className="p-metric-value">{value}</strong>
      {delta}
    </div>
  );
  const copy = (
    <div className="p-metric-copy">
      {heading}
      {number}
    </div>
  );
  const topIcon = type === "icon01" || type === "icon03" || type === "icon04";
  const iconHeading = type === "icon02" || type === "chart02";
  const sideChart = type === "chart01" || type === "chart02";
  return (
    <article
      {...props}
      className={cn("p-metric", className)}
      data-metric-type={type}
      data-metric-breakpoint={breakpoint}
      data-metric-action={action != null}
      aria-labelledby={props["aria-labelledby"] ?? titleId}
    >
      {type === "chart04" && <div className="p-metric-top-heading">{heading}</div>}
      <div className="p-metric-content">
        {topIcon && featured}
        {iconHeading && (
          <div className="p-metric-icon-heading">
            {featured}
            {heading}
          </div>
        )}
        {sideChart ? (
          <>
            {!iconHeading && heading}
            <div className="p-metric-chart-row">
              {number}
              {chart != null && <span className="p-metric-chart">{chart}</span>}
            </div>
          </>
        ) : type === "icon02" || type === "chart04" ? (
          number
        ) : (
          copy
        )}
        {(type === "chart03" || type === "chart04") && chart != null && (
          <div className="p-metric-chart-wide">{chart}</div>
        )}
      </div>
      {menu != null && <div className="p-metric-menu">{menu}</div>}
      {action != null && <div className="p-metric-action">{action}</div>}
    </article>
  );
}
