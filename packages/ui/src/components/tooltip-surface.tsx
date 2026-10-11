import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import center from "../../assets/tooltip-imgTooltip.svg";
import top from "../../assets/tooltip-imgTooltip1.svg";
import bottomLeft from "../../assets/tooltip-imgTooltip2.svg";
import left from "../../assets/tooltip-imgTooltip3.svg";
import right from "../../assets/tooltip-imgTooltip4.svg";
import bottomRight from "../../assets/tooltip-imgTooltip5.svg";
import closedHelp from "../../assets/help-imgOpenFalseSupportingTextFalseTooltipTopNoArrow.svg";
import openHelp from "../../assets/help-imgOpenTrueSupportingTextFalseTooltipTopNoArrow.svg";
import cursor from "../../assets/help-imgCursor.svg";

export const tooltipArrows = [
  "none",
  "bottom-center",
  "bottom-left",
  "bottom-right",
  "top-center",
  "left",
  "right",
] as const;
export type TooltipArrow = (typeof tooltipArrows)[number];
const assets = {
  "bottom-center": center,
  "top-center": top,
  "bottom-left": bottomLeft,
  left,
  right,
  "bottom-right": bottomRight,
};
function assetUrl(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}
export type TooltipSurfaceProps = Omit<ComponentProps<"div">, "children" | "content"> & {
  content: ReactNode;
  supportingText?: ReactNode;
  arrow?: TooltipArrow;
  contentWidth?: number;
  tone?: "dark" | "light";
};
export function TooltipSurface({
  content,
  supportingText,
  arrow = "none",
  contentWidth,
  tone = "dark",
  className,
  ...props
}: TooltipSurfaceProps): React.ReactElement {
  const hasDetail =
    supportingText !== undefined && supportingText !== null && supportingText !== false;
  return (
    <div
      {...props}
      className={cn("p-tooltip", className)}
      data-arrow={arrow}
      data-supporting={hasDetail}
      data-tone={tone}
    >
      <div
        className="p-tooltip-body"
        style={contentWidth === undefined ? undefined : { width: contentWidth }}
      >
        <span className="p-tooltip-title">{content}</span>
        {hasDetail && <span className="p-tooltip-detail">{supportingText}</span>}
      </div>
      {tooltipArrows
        .filter((value) => value !== "none")
        .map((value) => (
          <span key={value} className="p-tooltip-arrow" data-arrow={value} aria-hidden="true">
            <span className="p-tooltip-arrow-rotation">
              <img src={assetUrl(assets[value])} alt="" />
            </span>
          </span>
        ))}
    </div>
  );
}
export function HelpIconGlyph({ open = false }: { open?: boolean }): React.ReactElement {
  return <img src={assetUrl(open ? openHelp : closedHelp)} alt="" aria-hidden="true" />;
}
/** Decorative source cursor, used only in the component reference workbench. */
export function HelpIconReferenceCursor(): React.ReactElement {
  return (
    <img className="p-help-reference-cursor" src={assetUrl(cursor)} alt="" aria-hidden="true" />
  );
}
