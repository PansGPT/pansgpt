"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { Popover } from "radix-ui";
import { cn } from "../utils";
import { TextEditorIcon, type TextEditorCommand } from "./text-editor-icon";
import { TextEditorAsset } from "./text-editor-assets";

const colors = [
  "#181d27",
  "#414651",
  "#535862",
  "#717680",
  "#a4a7ae",
  "#d5d7da",
  "#e9eaeb",
  "#fafafa",
  "#079455",
  "#1570ef",
  "#444ce7",
  "#6938ef",
  "#9e77ed",
  "#dd2590",
  "#d92d20",
  "#e04f16",
];
export type EditorColorSelectProps = ComponentProps<"button"> & {
  color?: string;
  selected?: boolean;
};
export function EditorColorSelect({
  color = "#181d27",
  selected = false,
  className,
  style,
  ...props
}: EditorColorSelectProps): React.ReactElement {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      className={cn("p-editor-color-select", className)}
      data-selected={selected}
      aria-label={props["aria-label"] ?? `Text color ${color}`}
      aria-pressed={selected}
      style={{ ...style, color }}
    >
      <span />
    </button>
  );
}
export type TextEditorToolbarProps = Omit<ComponentProps<"div">, "onChange"> & {
  size?: "sm" | "md";
  variant?: "default" | "floating" | "simple";
  activeCommands?: readonly TextEditorCommand[];
  disabled?: boolean;
  unavailableCommands?: readonly TextEditorCommand[];
  onCommand?: (command: TextEditorCommand, value?: string) => void;
  fontFamily?: string;
  onFontFamilyChange?: (value: string) => void;
  fontSize?: string;
  onFontSizeChange?: (value: string) => void;
  before?: ReactNode;
};
export function TextEditorToolbar({
  size = "sm",
  variant = "default",
  activeCommands = [],
  disabled = false,
  unavailableCommands = [],
  onCommand,
  fontFamily = "Inter",
  onFontFamilyChange,
  fontSize = "16px",
  onFontSizeChange,
  before,
  className,
  ...props
}: TextEditorToolbarProps): React.ReactElement {
  const [color, setColor] = useState("#181d27");
  const commands: Array<TextEditorCommand | "divider"> =
    variant === "simple"
      ? ["Bold", "Italic", "Underline", "Left align", "Center align", "Link"]
      : size === "sm"
        ? [
            "Bold",
            "Italic",
            "Underline",
            "divider",
            "Color picker",
            "divider",
            "Left align",
            "Center align",
            "Dot points",
          ]
        : [
            "Bold",
            "Italic",
            "Underline",
            "divider",
            "Color picker",
            "divider",
            "Left align",
            "Center align",
            "Dot points",
            "divider",
            "Link",
            "Insert image",
            "divider",
            "Generate",
          ];
  return (
    <div
      {...props}
      className={cn("p-text-editor-toolbar", className)}
      data-size={size}
      data-toolbar-variant={variant}
      role="toolbar"
      aria-label={props["aria-label"] ?? "Text formatting"}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          !(event.target instanceof HTMLButtonElement) ||
          !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)
        )
          return;
        const buttons = Array.from(
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
        );
        const index = buttons.indexOf(event.target);
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
        event.preventDefault();
        buttons[next]?.focus();
      }}
    >
      {before}
      {size === "md" && variant === "default" && (
        <div className="p-text-editor-selects">
          <label className="p-text-editor-font">
            <TextEditorAsset name="editor_imgType01" />
            <select
              aria-label="Font family"
              disabled={disabled}
              value={fontFamily}
              onChange={(event) => {
                onFontFamilyChange?.(event.target.value);
                onCommand?.("More options", `font:${event.target.value}`);
              }}
            >
              {["Inter", "Plus Jakarta Sans", "Arial", "Georgia"].map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
            <TextEditorAsset name="editor_imgChevronDown" />
          </label>
          <label className="p-text-editor-font-size">
            <select
              aria-label="Font size"
              disabled={disabled}
              value={fontSize}
              onChange={(event) => {
                onFontSizeChange?.(event.target.value);
                onCommand?.("More options", `size:${event.target.value}`);
              }}
            >
              {["12px", "14px", "16px", "18px", "24px", "32px"].map((font) => (
                <option key={font}>{font}</option>
              ))}
            </select>
            <TextEditorAsset name="editor_imgChevronDown" />
          </label>
        </div>
      )}
      <div className="p-text-editor-tools">
        {commands.map((command, index) =>
          command === "divider" ? (
            <span
              key={`divider-${index}`}
              className="p-text-editor-tool-divider"
              aria-hidden="true"
            >
              <TextEditorAsset
                name={
                  variant === "default" ? "editor_imgDividerWrapper" : "editor_imgDividerWrapper1"
                }
              />
            </span>
          ) : command === "Color picker" ? (
            <Popover.Root key={command}>
              <Popover.Trigger asChild>
                <TextEditorIcon
                  command={command}
                  disabled={disabled}
                  selected={activeCommands.includes(command)}
                />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="p-text-editor-color-menu"
                  sideOffset={8}
                  aria-label="Text colors"
                >
                  <div className="p-text-editor-color-grid">
                    {colors.map((value) => (
                      <EditorColorSelect
                        key={value}
                        color={value}
                        selected={color === value}
                        onClick={() => {
                          setColor(value);
                          onCommand?.("Color picker", value);
                        }}
                      />
                    ))}
                  </div>
                  <label className="p-text-editor-custom-color">
                    Custom
                    <input
                      type="color"
                      aria-label="Custom text color"
                      value={color}
                      onChange={(event) => {
                        setColor(event.target.value);
                        onCommand?.("Color picker", event.target.value);
                      }}
                    />
                    <span>{color.toUpperCase()}</span>
                  </label>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          ) : (
            <TextEditorIcon
              key={command}
              command={command}
              inverse={variant === "simple"}
              disabled={disabled || unavailableCommands.includes(command)}
              selected={activeCommands.includes(command)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onCommand?.(command)}
            />
          )
        )}
      </div>
    </div>
  );
}
export function TextEditorTooltip(
  props: Omit<TextEditorToolbarProps, "variant"> & { advanced?: boolean }
): React.ReactElement {
  const { advanced = false, ...rest } = props;
  return <TextEditorToolbar {...rest} variant={advanced ? "floating" : "simple"} size="md" />;
}
export function TextHighlight({
  className,
  children,
  toolbar,
  ...props
}: ComponentProps<"mark"> & { toolbar?: ReactNode }): React.ReactElement {
  return (
    <mark {...props} className={cn("p-text-highlight", className)}>
      {children}
      {toolbar != null && <span className="p-text-highlight-toolbar">{toolbar}</span>}
    </mark>
  );
}
export function TextHighlightReference({
  tooltip = true,
  className,
  onCommand,
  ...props
}: ComponentProps<"div"> & {
  tooltip?: boolean;
  onCommand?: TextEditorToolbarProps["onCommand"];
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-text-highlight", "p-text-highlight-reference", className)}>
      {tooltip && (
        <div className="p-text-highlight-toolbar">
          <TextEditorTooltip activeCommands={["Bold"]} onCommand={onCommand} />
        </div>
      )}
    </div>
  );
}
