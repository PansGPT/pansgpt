"use client";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";
import { Tooltip, TooltipSurface } from "./tooltip";
import { cn } from "../utils";
import imgPlaceholder from "../../assets/utility-button-imgPlaceholder.svg";
import imgPlaceholder1 from "../../assets/utility-button-imgPlaceholder1.svg";
import imgPlaceholder2 from "../../assets/utility-button-imgPlaceholder2.svg";
import imgPlaceholder3 from "../../assets/utility-button-imgPlaceholder3.svg";
import imgPlaceholder4 from "../../assets/utility-button-imgPlaceholder4.svg";
import imgCursor from "../../assets/utility-button-imgCursor.svg";
import imgPlaceholder5 from "../../assets/utility-button-imgPlaceholder5.svg";
const artwork = [
  imgPlaceholder,
  imgPlaceholder1,
  imgPlaceholder2,
  imgPlaceholder3,
  imgPlaceholder4,
  imgPlaceholder5,
];
function assetUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
export type UtilityButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  "aria-label": string;
  size?: "xs" | "sm";
  variant?: "secondary" | "tertiary";
  icon?: ReactNode;
  tooltip?: ReactNode;
};
type State = "default" | "hover" | "focused" | "disabled";
function UtilityButtonBase({
  size = "xs",
  variant = "secondary",
  icon,
  tooltip,
  className,
  state,
  disabled,
  ...props
}: UtilityButtonProps & { state?: State }): React.ReactElement {
  const unavailable = disabled || state === "disabled";
  const normal = (size === "xs" ? 2 : 0) + (unavailable ? 1 : 0);
  const button = (
    <Button
      {...props}
      iconOnly
      variant={variant}
      disabled={unavailable}
      className={cn("p-utility-button", className)}
      data-utility-size={size}
      data-reference-state={state}
      leadingIcon={
        icon ?? (
          <>
            <img className="p-utility-normal" src={assetUrl(artwork[normal])} alt="" />
            {!unavailable && (
              <img
                className="p-utility-hover"
                src={assetUrl(artwork[size === "xs" ? 5 : 4])}
                alt=""
              />
            )}
          </>
        )
      }
    />
  );
  return tooltip != null && !unavailable && !state ? (
    <Tooltip content={tooltip} sideOffset={size === "sm" ? 6 : 4}>
      {button}
    </Tooltip>
  ) : (
    button
  );
}
export function UtilityButton(props: UtilityButtonProps): React.ReactElement {
  return <UtilityButtonBase {...props} />;
}
export function UtilityButtonReference({
  size = "xs",
  variant = "secondary",
  state,
  ...props
}: UtilityButtonProps & { state: State }): React.ReactElement {
  return (
    <span className="p-utility-reference" data-size={size} data-variant={variant}>
      <UtilityButtonBase {...props} size={size} variant={variant} state={state} />
      {state === "hover" && (
        <>
          <TooltipSurface
            content="Tooltip"
            contentWidth={65}
            className="p-utility-reference-tooltip"
          />
          <span className="p-utility-reference-cursor" aria-hidden="true">
            <img src={assetUrl(imgCursor)} alt="" />
          </span>
        </>
      )}
    </span>
  );
}
