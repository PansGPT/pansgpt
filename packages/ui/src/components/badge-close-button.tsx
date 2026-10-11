"use client";
import type { ComponentProps } from "react";
import type { BadgeColor } from "./badge";
import { Button } from "./button";
import { cn } from "../utils";
import imgXClose from "../../assets/badge-close-imgXClose.svg";
import imgXClose1 from "../../assets/badge-close-imgXClose1.svg";
import imgXClose2 from "../../assets/badge-close-imgXClose2.svg";
import imgXClose3 from "../../assets/badge-close-imgXClose3.svg";
import imgXClose4 from "../../assets/badge-close-imgXClose4.svg";
import imgXClose5 from "../../assets/badge-close-imgXClose5.svg";
import imgXClose6 from "../../assets/badge-close-imgXClose6.svg";
import imgXClose7 from "../../assets/badge-close-imgXClose7.svg";
import imgXClose8 from "../../assets/badge-close-imgXClose8.svg";
import imgXClose9 from "../../assets/badge-close-imgXClose9.svg";
import imgXClose10 from "../../assets/badge-close-imgXClose10.svg";
import imgXClose11 from "../../assets/badge-close-imgXClose11.svg";
import imgXClose12 from "../../assets/badge-close-imgXClose12.svg";
import imgXClose13 from "../../assets/badge-close-imgXClose13.svg";
import imgXClose14 from "../../assets/badge-close-imgXClose14.svg";
import imgXClose15 from "../../assets/badge-close-imgXClose15.svg";
import imgXClose16 from "../../assets/badge-close-imgXClose16.svg";
import imgXClose17 from "../../assets/badge-close-imgXClose17.svg";
import imgXClose18 from "../../assets/badge-close-imgXClose18.svg";
import imgXClose19 from "../../assets/badge-close-imgXClose19.svg";
import imgXClose20 from "../../assets/badge-close-imgXClose20.svg";
import imgXClose21 from "../../assets/badge-close-imgXClose21.svg";
import imgXClose22 from "../../assets/badge-close-imgXClose22.svg";
import imgXClose23 from "../../assets/badge-close-imgXClose23.svg";
const glyphs = {
  gray: [imgXClose, imgXClose12],
  brand: [imgXClose1, imgXClose13],
  error: [imgXClose2, imgXClose14],
  warning: [imgXClose3, imgXClose15],
  success: [imgXClose4, imgXClose16],
  "gray-blue": [imgXClose5, imgXClose17],
  "blue-light": [imgXClose6, imgXClose18],
  blue: [imgXClose7, imgXClose19],
  indigo: [imgXClose8, imgXClose20],
  purple: [imgXClose9, imgXClose21],
  pink: [imgXClose10, imgXClose22],
  orange: [imgXClose11, imgXClose23],
} as const;
function url(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
export type BadgeCloseButtonProps = Omit<
  ComponentProps<"button">,
  "children" | "color" | "aria-label"
> & {
  "aria-label": string;
  color?: BadgeColor;
  shape?: "square" | "rounded";
};
function BadgeCloseButtonBase({
  color = "gray",
  shape = "square",
  className,
  state,
  ...props
}: BadgeCloseButtonProps & { state?: "default" | "hover" }): React.ReactElement {
  return (
    <Button
      {...props}
      iconOnly
      variant="tertiary"
      className={cn("p-badge-close", className)}
      data-color={color}
      data-shape={shape}
      data-reference-state={state}
      leadingIcon={
        <>
          <img className="p-badge-close-normal" src={url(glyphs[color][0])} alt="" />
          <img className="p-badge-close-hover" src={url(glyphs[color][1])} alt="" />
        </>
      }
    />
  );
}
export function BadgeCloseButton(props: BadgeCloseButtonProps): React.ReactElement {
  return <BadgeCloseButtonBase {...props} />;
}
export function BadgeCloseButtonReference(
  props: BadgeCloseButtonProps & { state: "default" | "hover" }
): React.ReactElement {
  return <BadgeCloseButtonBase {...props} />;
}
