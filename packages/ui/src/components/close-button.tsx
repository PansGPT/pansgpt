"use client";
import type { ComponentProps } from "react";
import { Button } from "./button";
import { cn } from "../utils";
import imgXClose from "../../assets/close-button-imgXClose.svg";
import imgXClose1 from "../../assets/close-button-imgXClose1.svg";
import imgXClose2 from "../../assets/close-button-imgXClose2.svg";
import imgXClose3 from "../../assets/close-button-imgXClose3.svg";
import imgXClose4 from "../../assets/close-button-imgXClose4.svg";
import imgXClose5 from "../../assets/close-button-imgXClose5.svg";
import imgXClose6 from "../../assets/close-button-imgXClose6.svg";
import imgXClose7 from "../../assets/close-button-imgXClose7.svg";

const assets = [
  imgXClose,
  imgXClose1,
  imgXClose2,
  imgXClose3,
  imgXClose4,
  imgXClose5,
  imgXClose6,
  imgXClose7,
];
function url(index: number): string {
  const asset = assets[index];
  return typeof asset === "string" ? asset : asset.src;
}
export type CloseButtonProps = Omit<ComponentProps<"button">, "children" | "aria-label"> & {
  "aria-label": string;
  size?: "sm" | "md" | "lg";
  darkBackground?: boolean;
};
type State = "default" | "hover" | "focused";
function CloseButtonBase({
  size = "sm",
  darkBackground = false,
  className,
  state,
  ...props
}: CloseButtonProps & { state?: State }): React.ReactElement {
  const large = size === "lg";
  const normal = (darkBackground ? 4 : 0) + (large ? 0 : 1);
  return (
    <Button
      {...props}
      iconOnly
      size={size}
      variant="tertiary"
      className={cn("p-close-button", className)}
      data-dark-background={darkBackground || undefined}
      data-reference-state={state}
      leadingIcon={
        <>
          <img className="p-close-button-normal" src={url(normal)} alt="" />
          <img className="p-close-button-hover" src={url(normal + 2)} alt="" />
        </>
      }
    />
  );
}
export function CloseButton(props: CloseButtonProps): React.ReactElement {
  return <CloseButtonBase {...props} />;
}
export function CloseButtonReference(
  props: CloseButtonProps & { state: State }
): React.ReactElement {
  return <CloseButtonBase {...props} />;
}
