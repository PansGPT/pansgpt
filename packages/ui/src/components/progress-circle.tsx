import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../utils";
import { IndicatorAsset, type IndicatorAssetName } from "./indicator-assets";

export const progressCircleSizes = ["xxs", "xs", "sm", "md", "lg"] as const;
export const progressCircleShapes = ["circle", "half-circle"] as const;
export type ProgressCircleSize = (typeof progressCircleSizes)[number];
export type ProgressCircleShape = (typeof progressCircleShapes)[number];
const dimensions = { xxs: 64, xs: 160, sm: 200, md: 240, lg: 280 } as const;
const rings: Record<
  Exclude<ProgressCircleSize, "xxs">,
  Record<ProgressCircleShape, IndicatorAssetName>
> = {
  xs: { circle: "circleimgRing3", "half-circle": "circleimgRing7" },
  sm: { circle: "circleimgRing2", "half-circle": "circleimgRing6" },
  md: { circle: "circleimgRing", "half-circle": "circleimgRing4" },
  lg: { circle: "circleimgRing1", "half-circle": "circleimgRing5" },
};
type CircleLayoutProps = Omit<ComponentProps<"div">, "children" | "role"> & {
  size?: ProgressCircleSize;
  shape?: ProgressCircleShape;
  label?: ReactNode;
  showLabel?: boolean;
};
export type ProgressCircleProps = CircleLayoutProps & {
  value: number;
  max?: number;
  valueLabel?: ReactNode;
};
function CircleContent({
  size,
  showLabel,
  label,
  valueLabel,
}: {
  size: ProgressCircleSize;
  showLabel: boolean;
  label: ReactNode;
  valueLabel: ReactNode;
}): React.ReactElement {
  return (
    <>
      <div className="p-progress-circle-number">
        {size !== "xxs" && showLabel && <span className="p-progress-circle-label">{label}</span>}
        <span className="p-progress-circle-value">{valueLabel}</span>
      </div>
      {size === "xxs" && showLabel && <span className="p-progress-circle-label">{label}</span>}
    </>
  );
}
export function ProgressCircle({
  value,
  max = 100,
  size = "xxs",
  shape = "circle",
  showLabel = true,
  label = size === "xxs" ? "Users" : "Active users",
  valueLabel,
  className,
  style,
  ...props
}: ProgressCircleProps): React.ReactElement {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const safeValue = Number.isFinite(value) ? Math.min(safeMax, Math.max(0, value)) : 0;
  const percent = (safeValue / safeMax) * 100;
  const diameter = dimensions[size];
  const stroke = size === "xxs" ? 6 : diameter / 10;
  const radius = (diameter - stroke) / 2;
  const starting = shape === "half-circle" ? Math.PI : -Math.PI / 2;
  const ending = starting + ((shape === "half-circle" ? Math.PI : Math.PI * 2) * percent) / 100;
  const capStyle = (angle: number): CSSProperties => ({
    left: diameter / 2 + radius * Math.cos(angle),
    top: diameter / 2 + radius * Math.sin(angle),
  });
  return (
    <div
      {...props}
      className={cn("p-progress-circle", className)}
      data-size={size}
      data-shape={shape}
      data-show-label={showLabel}
      role="progressbar"
      aria-label={props["aria-label"] ?? (typeof label === "string" ? label : "Progress")}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      aria-valuetext={
        props["aria-valuetext"] ??
        (typeof valueLabel === "string" ? valueLabel : `${Math.round(percent)}%`)
      }
      style={
        {
          ...style,
          "--circle-angle": `${percent * (shape === "half-circle" ? 1.8 : 3.6)}deg`,
        } as CSSProperties
      }
    >
      <div className="p-progress-circle-graphic" aria-hidden="true">
        <span className="p-circle-track" />
        {shape === "half-circle" && (
          <>
            <span className="p-circle-track-cap" style={capStyle(Math.PI)} />
            <span className="p-circle-track-cap" style={capStyle(Math.PI * 2)} />
          </>
        )}
        <span className="p-circle-fill" />
        {percent > 0 && (
          <>
            <span className="p-circle-fill-cap" style={capStyle(starting)} />
            <span className="p-circle-fill-cap" style={capStyle(ending)} />
          </>
        )}
      </div>
      <CircleContent
        size={size}
        showLabel={showLabel}
        label={label}
        valueLabel={valueLabel ?? `${Math.round(percent)}%`}
      />
    </div>
  );
}
/** Original fixed 40% artwork for inspecting the Figma templates and their inconsistent half-circle scaling. */
export function ProgressCircleReference({
  size = "xxs",
  shape = "circle",
  showLabel = true,
  label = size === "xxs" ? "Users" : "Active users",
  className,
  ...props
}: CircleLayoutProps): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-progress-circle", className)}
      data-reference="true"
      data-size={size}
      data-shape={shape}
      data-show-label={showLabel}
    >
      <div className="p-progress-circle-graphic" aria-hidden="true">
        {size === "xxs" ? (
          <>
            <span className="p-circle-reference-background">
              <IndicatorAsset
                name={shape === "circle" ? "circleimgBackground" : "circleimgBackground1"}
              />
            </span>
            <span className="p-circle-reference-line">
              <IndicatorAsset name={shape === "circle" ? "circleimgLine" : "circleimgLine1"} />
            </span>
          </>
        ) : (
          <span className="p-circle-reference-ring">
            <IndicatorAsset name={rings[size][shape]} />
          </span>
        )}
      </div>
      <CircleContent size={size} showLabel={showLabel} label={label} valueLabel="40%" />
    </div>
  );
}
