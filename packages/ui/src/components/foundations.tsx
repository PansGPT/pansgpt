import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../utils";
import { FoundationAsset } from "./foundation-assets";
import { Button } from "./button";
export type ColorSwatchProps = Omit<ComponentProps<"div">, "color"> & {
  color?: string;
  label: ReactNode;
  value: ReactNode;
  contrast?: ReactNode;
  contrastColor?: string;
};
export function ColorSwatch({
  color = "var(--figma-colors-gray-light-mode-900)",
  label,
  value,
  contrast,
  contrastColor = "var(--figma-colors-base-white)",
  className,
  ...props
}: ColorSwatchProps): React.ReactElement {
  return (
    <div {...props} className={cn("p-color-swatch", className)}>
      <div className="p-color-swatch-fill" style={{ background: color, color: contrastColor }}>
        {contrast}
      </div>
      <div className="p-color-swatch-copy">
        <strong>{label}</strong>
        <span>{value}</span>
      </div>
    </div>
  );
}
export type GradientSwatchProps = ComponentProps<"div"> & {
  startLabel: ReactNode;
  startValue: ReactNode;
  endLabel: ReactNode;
  endValue: ReactNode;
  angle?: ReactNode;
  artwork?: ReactNode;
};
export function GradientSwatch({
  startLabel,
  startValue,
  endLabel,
  endValue,
  angle = "45deg",
  artwork = <FoundationAsset name="source1_imgSwatch" />,
  className,
  ...props
}: GradientSwatchProps): React.ReactElement {
  return (
    <div {...props} className={cn("p-gradient-swatch", className)}>
      <div className="p-gradient-swatch-artwork">{artwork}</div>
      <div className="p-gradient-swatch-copy">
        <div>
          <strong>{startLabel}</strong>
          <span>{startValue}</span>
        </div>
        <span>{angle}</span>
        <div>
          <strong>{endLabel}</strong>
          <span>{endValue}</span>
        </div>
      </div>
    </div>
  );
}
export type TypeScaleSpecimenProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  specification: ReactNode;
  sample?: ReactNode;
  fontSize?: CSSProperties["fontSize"];
  lineHeight?: CSSProperties["lineHeight"];
  letterSpacing?: CSSProperties["letterSpacing"];
  fontFamily?: CSSProperties["fontFamily"];
};
export function TypeScaleSpecimen({
  title,
  specification,
  sample = "Display 2xl",
  fontSize = "var(--figma-font-size-display-xl)",
  lineHeight = "var(--figma-line-height-display-xl)",
  letterSpacing = "-0.02em",
  fontFamily = "var(--font-display)",
  className,
  ...props
}: TypeScaleSpecimenProps): React.ReactElement {
  return (
    <div {...props} className={cn("p-type-specimen", className)}>
      <div className="p-type-specimen-header">
        <strong>{title}</strong>
        <span>{specification}</span>
      </div>
      <div
        className="p-type-specimen-row"
        style={{ fontSize, lineHeight, letterSpacing, fontFamily }}
      >
        {[
          { label: "Regular", weight: 400 },
          { label: "Medium", weight: 500 },
          { label: "Semibold", weight: 600 },
          { label: "Bold", weight: 700 },
        ].map((item) => (
          <div key={item.label} style={{ fontWeight: item.weight }}>
            <div style={{ marginBottom: fontSize }}>{sample}</div>
            <div>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
export type ShadowSize = "xs" | "xs-skeuomorphic" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export function ShadowCard({
  shadow = "xs",
  children,
  className,
  style,
  ...props
}: ComponentProps<"div"> & { shadow?: ShadowSize }): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-foundation-effect-card", "p-shadow-card", className)}
      style={{ ...style, boxShadow: `var(--effect-shadow-${shadow})` }}
    >
      {children ?? `shadow-${shadow}`}
    </div>
  );
}
export function FocusRingCard({
  children,
  tokenLabel = "brand-500",
  className,
  ...props
}: ComponentProps<"div"> & { tokenLabel?: ReactNode }): React.ReactElement {
  return (
    <div {...props} className={cn("p-foundation-effect-card", "p-focus-ring-card", className)}>
      <span>{children ?? "focus-ring"}</span>
      <span>{tokenLabel}</span>
    </div>
  );
}
export function BlurCard({
  children = "backdrop-blur-sm",
  modeLabel = "light",
  blur = 4,
  className,
  style,
  ...props
}: ComponentProps<"div"> & { modeLabel?: ReactNode; blur?: number }): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-blur-card", className)}
      style={{ ...style, backdropFilter: `blur(${Math.max(0, blur)}px)` }}
    >
      <span>{children}</span>
      <span className="p-blur-card-mode">
        <FoundationAsset name="source5_imgVariablesIcon" />
        {modeLabel}
      </span>
    </div>
  );
}
export type RadiusSize =
  "none" | "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full";
export function RadiusCard({
  radius = "none",
  children,
  className,
  style,
  ...props
}: ComponentProps<"div"> & { radius?: RadiusSize }): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-foundation-effect-card", "p-radius-card", className)}
      style={{ ...style, borderRadius: `var(--figma-radius-${radius})` }}
    >
      {children ?? `radius-${radius}`}
    </div>
  );
}
export function RadiusExample({
  radius = "none",
  className,
  ...props
}: ComponentProps<"div"> & { radius?: RadiusSize }): React.ReactElement {
  return (
    <div {...props} className={cn("p-radius-example", className)}>
      <div style={{ borderRadius: `var(--figma-radius-${radius})` }} />
    </div>
  );
}
export function ContainerSpecimen({
  children = "Desktop 1,280px",
  shortcut = (
    <>
      <Button size="md" variant="secondary" leadingIcon={null} trailingIcon={null}>
        ⇧ Shift
      </Button>
      <span>+</span>
      <Button size="md" variant="secondary" leadingIcon={null} trailingIcon={null}>
        G
      </Button>
    </>
  ),
  className,
  ...props
}: ComponentProps<"div"> & { shortcut?: ReactNode }): React.ReactElement {
  return (
    <div {...props} className={cn("p-container-specimen", className)}>
      <div>
        <strong>{children}</strong>
        {shortcut && <div className="p-container-specimen-shortcut">{shortcut}</div>}
      </div>
    </div>
  );
}
