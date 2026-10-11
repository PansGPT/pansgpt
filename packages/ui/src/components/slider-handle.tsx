import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { TooltipSurface } from "./tooltip-surface";

export const sliderLabelPositions = ["none", "bottom", "top-floating"] as const;
export type SliderLabelPosition = (typeof sliderLabelPositions)[number];
export function SliderValueLabel({
  position,
  value,
}: {
  position: SliderLabelPosition;
  value: ReactNode;
}): React.ReactElement | null {
  if (position === "none") return null;
  return (
    <span className="p-slider-value" data-position={position} aria-hidden="true">
      {position === "top-floating" ? <TooltipSurface tone="light" content={value} /> : value}
    </span>
  );
}
/** Noninteractive original handle artwork for inspecting source states; use Slider for value input. */
export function SliderHandleReference({
  state = "default",
  labelPosition = "none",
  value = "0%",
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  state?: "default" | "hover" | "focused";
  labelPosition?: SliderLabelPosition;
  value?: ReactNode;
}): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-slider-handle-reference", className)}
      data-state={state}
      data-label-position={labelPosition}
    >
      <span className="p-slider-thumb" />
      <SliderValueLabel position={labelPosition} value={value} />
    </div>
  );
}
