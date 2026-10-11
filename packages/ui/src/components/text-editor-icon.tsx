"use client";
import type { ComponentProps } from "react";
import { cn } from "../utils";
import { Tooltip, TooltipSurface } from "./tooltip";
import { TextEditorAsset, type TextEditorAssetName } from "./text-editor-assets";
export const textEditorCommands = [
  "Generate",
  "More options",
  "Bold",
  "Italic",
  "Underline",
  "Dot points",
  "Left align",
  "Center align",
  "Right align",
  "Justify",
  "Link",
  "Insert image",
  "Insert video",
  "Attach file",
  "Insert code",
  "Color picker",
] as const;
export type TextEditorCommand = (typeof textEditorCommands)[number];
export type TextEditorState = "default" | "hover" | "current";
const sourceAssets: Partial<
  Record<TextEditorCommand, Partial<Record<TextEditorState, TextEditorAssetName>>>
> = {
  Generate: {
    default: "imgStars02",
    current: "imgStars3",
    hover: "imgStars4",
  },
  "More options": {
    default: "imgDotsHorizontal",
    current: "imgDotsHorizontal1",
    hover: "imgDotsHorizontal2",
  },
  Bold: {
    current: "imgBold2",
    hover: "imgBold3",
    default: "imgBold01",
  },
  Italic: {
    default: "imgItalic01",
    current: "imgItalic2",
    hover: "imgItalic3",
  },
  Underline: {
    default: "imgUnderline01",
    current: "imgUnderline2",
    hover: "imgUnderline3",
  },
  "Dot points": {
    default: "imgDotpoints01",
    current: "imgDotpoints2",
    hover: "imgDotpoints3",
  },
  "Left align": {
    default: "imgAlignLeft",
    current: "imgAlignLeft1",
    hover: "imgAlignLeft2",
  },
  "Center align": {
    default: "imgAlignCenter",
    current: "imgAlignCenter1",
    hover: "imgAlignCenter2",
  },
  "Right align": {
    default: "imgAlignRight",
    current: "imgAlignRight1",
    hover: "imgAlignRight2",
  },
  Justify: {
    default: "imgAlignJustify",
    current: "imgAlignJustify1",
    hover: "imgAlignJustify2",
  },
  Link: {
    default: "imgLink01",
    current: "imgLink2",
    hover: "imgLink3",
  },
  "Insert image": {
    default: "imgImage01",
    current: "imgImage2",
    hover: "imgImage3",
  },
  "Insert video": {
    default: "imgPlaySquare",
    current: "imgPlaySquare1",
    hover: "imgPlaySquare2",
  },
  "Attach file": {
    default: "imgAttachment01",
    current: "imgAttachment2",
    hover: "imgAttachment3",
  },
  "Insert code": {
    default: "imgCodeSnippet02",
    current: "imgCodeSnippet3",
    hover: "imgCodeSnippet4",
  },
  "Color picker": {},
};
const inverseAssets: Partial<Record<TextEditorCommand, TextEditorAssetName>> = {
  Bold: "tooltip_imgBold2",
  Italic: "tooltip_imgItalic2",
  Underline: "tooltip_imgUnderline2",
  "Left align": "tooltip_imgAlignLeft1",
  "Center align": "tooltip_imgAlignCenter1",
  Link: "tooltip_imgLink2",
};
export type TextEditorIconProps = Omit<ComponentProps<"button">, "children"> & {
  command: TextEditorCommand;
  selected?: boolean;
  referenceState?: TextEditorState;
  tooltip?: boolean;
  inverse?: boolean;
};
export function TextEditorIcon({
  command,
  selected = false,
  referenceState,
  tooltip = true,
  inverse = false,
  className,
  ...props
}: TextEditorIconProps): React.ReactElement {
  const state = referenceState ?? (selected ? "current" : "default");
  const artwork = sourceAssets[command];
  const button = (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn("p-text-editor-icon", className)}
      data-editor-command={command}
      data-reference-state={referenceState}
      data-selected={selected || state === "current"}
      aria-label={props["aria-label"] ?? command}
      aria-pressed={selected || state === "current"}
    >
      {command === "Color picker" ? (
        <span className="p-text-editor-color-dot" />
      ) : inverse ? (
        <TextEditorAsset name={inverseAssets[command] ?? "tooltip_imgBold2"} />
      ) : referenceState ? (
        <TextEditorAsset name={artwork?.[state] ?? artwork?.default ?? "imgBold01"} />
      ) : (
        <>
          <TextEditorAsset
            className="p-text-editor-icon-default"
            name={artwork?.default ?? "imgBold01"}
          />
          <TextEditorAsset
            className="p-text-editor-icon-hover"
            name={artwork?.hover ?? artwork?.default ?? "imgBold01"}
          />
          <TextEditorAsset
            className="p-text-editor-icon-current"
            name={artwork?.current ?? artwork?.default ?? "imgBold01"}
          />
        </>
      )}
      {referenceState === "hover" && tooltip && (
        <TooltipSurface
          className="p-text-editor-reference-tooltip"
          content={command}
          arrow="none"
        />
      )}
    </button>
  );
  return tooltip && !referenceState ? <Tooltip content={command}>{button}</Tooltip> : button;
}
