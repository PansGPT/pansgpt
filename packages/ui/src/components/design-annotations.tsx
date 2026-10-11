import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { FoundationAsset, type FoundationAssetName } from "./foundation-assets";
import { Badge } from "./badge";
export function Keycap({
  square = false,
  children,
  className,
  ...props
}: ComponentProps<"kbd"> & { square?: boolean }): React.ReactElement {
  return (
    <kbd {...props} className={cn("p-keycap", className)} data-square={square}>
      <span className="p-keycap-background" />
      {children}
    </kbd>
  );
}
export type NumericKeyType =
  | "command"
  | "shift"
  | "option"
  | "control"
  | "delete"
  | "return"
  | "escape"
  | "space"
  | "tab"
  | "left"
  | "right"
  | "up"
  | "down"
  | "simple"
  | "template";
const symbols: Partial<Record<NumericKeyType, FoundationAssetName>> = {
  delete: "source10_imgSymbol",
  command: "source10_imgSymbol1",
  shift: "source10_imgSymbol2",
  option: "source10_imgSymbol3",
  control: "source10_imgSymbol4",
  return: "source10_imgSymbol5",
  escape: "source10_imgSymbol6",
  space: "source10_imgSymbol7",
  left: "source10_imgCharacter",
  right: "source10_imgCharacter1",
  up: "source10_imgCharacter2",
  down: "source10_imgCharacter3",
};
export function NumericKey({
  keyType = "command",
  children = "C",
  symbol,
  className,
  ...props
}: ComponentProps<"kbd"> & { keyType?: NumericKeyType; symbol?: ReactNode }): React.ReactElement {
  const square = ["simple", "left", "right", "up", "down"].includes(keyType);
  const arrow = ["left", "right", "up", "down"].includes(keyType);
  const asset = symbols[keyType];
  return (
    <Keycap
      {...props}
      square={square}
      className={cn("p-numeric-key", className)}
      data-key-type={keyType}
    >
      {(symbol || asset) && (
        <span className={arrow ? "p-numeric-key-arrow" : "p-numeric-key-symbol"}>
          {symbol ?? (asset && <FoundationAsset name={asset} />)}
        </span>
      )}
      {keyType === "simple" ? (
        <span className="p-numeric-key-letter">{children}</span>
      ) : !arrow && keyType !== "template" ? (
        <span className="p-numeric-key-label">{keyType}</span>
      ) : null}
    </Keycap>
  );
}
export function NumericKeyCombo({
  children,
  className,
  ...props
}: ComponentProps<"div">): React.ReactElement {
  return (
    <div {...props} className={cn("p-numeric-key-combo", className)}>
      {children}
    </div>
  );
}
export function DesignNote({
  heading,
  badge,
  size = "md",
  children,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  heading: ReactNode;
  badge?: ReactNode;
  size?: "sm" | "md";
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-design-note", className)} data-size={size}>
      <div>
        <strong>{heading}</strong>
        {badge && (
          <Badge color="success" size={size === "md" ? "md" : "sm"}>
            {badge}
          </Badge>
        )}
      </div>
      {children && <p>{children}</p>}
    </div>
  );
}
export function VariablesIcon({
  single = false,
  className,
  ...props
}: ComponentProps<"span"> & { single?: boolean }): React.ReactElement {
  return (
    <span {...props} className={cn("p-variables-icon", className)}>
      <FoundationAsset name={single ? "source18_imgSingleTrue" : "source18_imgSingleFalse"} />
    </span>
  );
}
export function FigmaVariablesNote({
  heading = "Figma Variables note",
  hint = "You can delete this",
  children,
  className,
  ...props
}: ComponentProps<"div"> & { heading?: ReactNode; hint?: ReactNode }): React.ReactElement {
  return (
    <div {...props} className={cn("p-variables-note", className)}>
      <div>
        <FoundationAsset name="source14_imgVariablesIcon" />
        <strong>{heading}</strong>
        {hint && <span>{hint}</span>}
      </div>
      {children && <p>{children}</p>}
    </div>
  );
}
export function DesignSystemFooter({
  children = "PansGPT Kit and Design system",
  brand,
  className,
  ...props
}: ComponentProps<"footer"> & { brand?: ReactNode }): React.ReactElement {
  return (
    <footer {...props} className={cn("p-design-system-footer", className)}>
      <div>
        <strong>{children}</strong>
        {brand}
      </div>
    </footer>
  );
}
export function DesignSystemHeader({
  heading,
  description,
  sectionLabel,
  pageLabel,
  mark,
  resources,
  className,
  ...props
}: ComponentProps<"header"> & {
  heading: ReactNode;
  description?: ReactNode;
  sectionLabel: ReactNode;
  pageLabel: ReactNode;
  mark?: ReactNode;
  resources?: ReactNode;
}): React.ReactElement {
  return (
    <header {...props} className={cn("p-design-system-header", className)}>
      <div>
        <div className="p-design-system-breadcrumb">
          {mark}
          <span>{sectionLabel}</span>
          <FoundationAsset name="source15_imgArrowRight" />
          <span>{pageLabel}</span>
        </div>
        <div className="p-design-system-header-main">
          <div>
            <h2>{heading}</h2>
            {description && <p>{description}</p>}
          </div>
          {resources}
        </div>
      </div>
    </header>
  );
}
const cursorAssets: Record<string, FoundationAssetName> = {
  "Resize single up": "source20_imgTypeResizeSingleUp",
  "Resize single top-right": "source20_imgTypeResizeSingleTopRight",
  "Resize single right": "source20_imgTypeResizeSingleRight",
  "Resize single bottom-right": "source20_imgTypeResizeSingleBottomRight",
  "Resize single down": "source20_imgTypeResizeSingleDown",
  "Resize single bottom-left": "source20_imgTypeResizeSingleBottomLeft",
  "Resize single left": "source20_imgTypeResizeSingleLeft",
  "Resize single top-left": "source20_imgTypeResizeSingleTopLeft",
  "Resize vertical": "source20_imgTypeResizeVertical",
  "Resize horizontal": "source20_imgTypeResizeHorizontal",
  "Resize diagonal 02": "source20_imgTypeResizeDiagonal02",
  "Resize diagonal 01": "source20_imgTypeResizeDiagonal01",
  "Resize up-down": "source20_imgTypeResizeUpDown",
  "Resize left-right": "source20_imgTypeResizeLeftRight",
  "Resize up": "source20_imgTypeResizeUp",
  "Resize right": "source20_imgTypeResizeRight",
  "Resize down": "source20_imgTypeResizeDown",
  "Resize left": "source20_imgTypeResizeLeft",
  Help: "source20_imgTypeHelp",
  Move: "source20_imgTypeMove",
  "Hand open": "source20_imgTypeHandOpen",
  "Hand grab": "source20_imgTypeHandGrab",
  "Hand point": "source20_imgTypeHandPoint",
  "Zoom in": "source20_imgTypeZoomIn",
  "Zoom out": "source20_imgTypeZoomOut",
  Plus: "source20_imgTypePlus",
  "Text cursor": "source20_imgTypeTextCursor",
  "Text cursor custom": "source20_imgTypeTextCursorCustom",
  Default: "source20_imgTypeDefault",
};
function MeasurementRail(): React.ReactElement {
  return (
    <span className="p-measure-rail">
      {Array.from({ length: 9 }, (_, index) => (
        <span key={index}>
          <FoundationAsset name="source16_imgEndpoint1" />
        </span>
      ))}
    </span>
  );
}
export type DesignCursorType =
  | "Resize single up"
  | "Resize single top-right"
  | "Resize single right"
  | "Resize single bottom-right"
  | "Resize single down"
  | "Resize single bottom-left"
  | "Resize single left"
  | "Resize single top-left"
  | "Resize vertical"
  | "Resize horizontal"
  | "Resize diagonal 02"
  | "Resize diagonal 01"
  | "Resize up-down"
  | "Resize left-right"
  | "Resize up"
  | "Resize right"
  | "Resize down"
  | "Resize left"
  | "Help"
  | "Move"
  | "Hand open"
  | "Hand grab"
  | "Hand point"
  | "Zoom in"
  | "Zoom out"
  | "Plus"
  | "Text cursor"
  | "Text cursor custom"
  | "Default";
export function DesignCursor({
  type = "Default",
  className,
  ...props
}: ComponentProps<"span"> & { type?: DesignCursorType }): React.ReactElement {
  return (
    <span {...props} className={cn("p-design-cursor", className)} aria-hidden="true">
      <FoundationAsset name={cursorAssets[type]} />
    </span>
  );
}
export function MeasureLine({
  spacer = false,
  className,
  ...props
}: ComponentProps<"span"> & { spacer?: boolean }): React.ReactElement {
  return (
    <span {...props} className={cn("p-measure-line", className)} data-spacer={spacer}>
      <FoundationAsset
        className="p-measure-endpoint p-measure-endpoint-first"
        name={spacer ? "source17_imgEndpoint1" : "source17_imgEndpoint"}
      />
      <FoundationAsset
        className="p-measure-line-artwork"
        name={spacer ? "source17_imgLine1" : "source17_imgLine"}
      />
      <FoundationAsset
        className="p-measure-endpoint p-measure-endpoint-last"
        name={spacer ? "source17_imgEndpoint1" : "source17_imgEndpoint"}
      />
    </span>
  );
}
export function MeasureSpacingGuide({
  position = "left",
  children = "80px",
  className,
  ...props
}: ComponentProps<"div"> & { position?: "left" | "right" | "top" | "bottom" }): React.ReactElement {
  const horizontal = position === "top" || position === "bottom";
  return (
    <div {...props} className={cn("p-measure-guide", className)} data-position={position}>
      <span className="p-measure-guide-label">{children}</span>
      <span className="p-measure-guide-solid">
        <MeasureLine />
      </span>
      <span className="p-measure-guide-spacer p-measure-guide-spacer-first">
        <MeasurementRail />
      </span>
      <span className="p-measure-guide-spacer p-measure-guide-spacer-last">
        <MeasurementRail />
      </span>
      <span className="p-measure-guide-orientation" data-horizontal={horizontal} />
    </div>
  );
}
export type DocumentationCellType =
  | "primary"
  | "secondary"
  | "tertiary"
  | "default"
  | "swatch-light"
  | "swatch-dark"
  | "divider"
  | "header";
export function DocumentationTableCell({
  type = "default",
  children = "Content",
  modifier = "_modifier",
  followOn = true,
  cursor = false,
  swatch = "var(--bg-primary-solid)",
  className,
  ...props
}: ComponentProps<"div"> & {
  type?: DocumentationCellType;
  modifier?: ReactNode;
  followOn?: boolean;
  cursor?: boolean;
  swatch?: string;
}): React.ReactElement {
  const lead = ["primary", "secondary", "tertiary"].includes(type);
  const colored = type === "swatch-light" || type === "swatch-dark";
  return (
    <div {...props} className={cn("p-documentation-cell", className)} data-type={type}>
      {lead || colored ? (
        <div className="p-documentation-cell-badge">
          {colored && (
            <span className="p-documentation-swatch">
              <i style={{ background: swatch }} />
              {cursor && <FoundationAsset name="source19_imgCursor" />}
            </span>
          )}
          <strong>{children}</strong>
          {lead && type !== "primary" && modifier && <span>{modifier}</span>}
        </div>
      ) : type !== "divider" ? (
        <span>{children}</span>
      ) : null}
      {(type === "secondary" || type === "tertiary") && (
        <FoundationAsset className="p-documentation-connector-short" name="source19_imgConnector" />
      )}
      {followOn && type === "secondary" && (
        <FoundationAsset className="p-documentation-connector" name="source19_imgConnector1" />
      )}
      {followOn && type === "tertiary" && (
        <FoundationAsset className="p-documentation-connector" name="source19_imgConnector2" />
      )}
    </div>
  );
}
