import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../utils";
import { IndicatorAsset, type IndicatorAssetName } from "./indicator-assets";
import { TooltipSurface } from "./tooltip-surface";

export const progressLabelPositions = [
  "none",
  "right",
  "bottom",
  "top-floating",
  "bottom-floating",
] as const;
export type ProgressLabelPosition = (typeof progressLabelPositions)[number];

export type ProgressBarProps = Omit<ComponentProps<"div">, "children"> & {
  value: number;
  max?: number;
  showValue?: boolean;
  valueLabel?: ReactNode;
  labelPosition?: ProgressLabelPosition;
  labelOffset?: number;
};
export function ProgressBar({
  value,
  max = 100,
  showValue,
  valueLabel,
  labelPosition,
  labelOffset = -5.5,
  className,
  ...props
}: ProgressBarProps): React.ReactElement {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(value, safeMax)) : 0;
  const percent = (safeValue / safeMax) * 100;
  const position = labelPosition ?? (showValue ? "right" : "none");
  const label = valueLabel ?? `${Math.round(percent)}%`;
  const floating = position === "top-floating" || position === "bottom-floating";
  return (
    <div className={cn("p-progress", className)} data-label-position={position}>
      <div
        {...props}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        className="p-progress-track"
      >
        <span
          className="p-progress-fill"
          style={{ "--progress": percent + "%" } as CSSProperties}
        />
      </div>
      {position !== "none" && (
        <span
          className={cn("p-progress-label", floating && "p-progress-bubble")}
          style={floating ? { left: `calc(${percent}% + ${labelOffset}px)` } : undefined}
        >
          {floating ? <TooltipSurface tone="light" content={label} /> : label}
        </span>
      )}
    </div>
  );
}

export type SpinnerProps = Omit<ComponentProps<"div">, "children"> & {
  label?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "line-simple" | "line-spinner" | "dot-circle";
  animated?: boolean;
};
export const spinnerSizes = ["sm", "md", "lg", "xl"] as const;
export const spinnerVariants = ["line-simple", "line-spinner", "dot-circle"] as const;
const spinnerAssets: Record<
  (typeof spinnerVariants)[number],
  Record<(typeof spinnerSizes)[number], IndicatorAssetName>
> = {
  "line-simple": {
    sm: "spinnerimgLoadingCircle1",
    md: "spinnerimgLoadingCircle",
    lg: "spinnerimgLoadingCircle4",
    xl: "spinnerimgLoadingCircle6",
  },
  "line-spinner": {
    sm: "spinnerimgLoadingCircle3",
    md: "spinnerimgLoadingCircle2",
    lg: "spinnerimgLoadingCircle5",
    xl: "spinnerimgLoadingCircle7",
  },
  "dot-circle": {
    sm: "dotSm",
    md: "dotMd",
    lg: "dotLg",
    xl: "dotXl",
  },
};
export function Spinner({
  label = "Loading...",
  showLabel = true,
  className,
  size = "sm",
  variant = "line-simple",
  animated = true,
  ...props
}: SpinnerProps): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-spinner", className)}
      data-size={size}
      data-variant={variant}
      role="status"
      aria-label={showLabel ? undefined : label}
    >
      <span className={cn("p-spinner-graphic", animated && "p-spin")}>
        <IndicatorAsset name={spinnerAssets[variant][size]} />
      </span>
      {showLabel && <span>{label}</span>}
    </div>
  );
}
