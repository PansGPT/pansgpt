"use client";
import { useState, type ComponentProps, type HTMLAttributes, type ReactNode } from "react";
import { Tabs as Primitive } from "radix-ui";
import { Button } from "./button";
import { UtilityButton } from "./utility-button";
import { cn } from "../utils";
import copyGlyph from "../../assets/code-snippet-imgCopy01.svg";

export type CodeSnippetTabButtonProps = Omit<ComponentProps<"button">, "children"> & {
  children: ReactNode;
  current?: boolean;
};
export function CodeSnippetTabButton({
  children,
  current = false,
  className,
  role,
  ...props
}: CodeSnippetTabButtonProps): React.ReactElement {
  return (
    <Button
      {...props}
      role={role}
      aria-pressed={role === "tab" ? undefined : current}
      variant="tertiary"
      leadingIcon={null}
      trailingIcon={null}
      className={cn("p-code-tab", className)}
      data-code-current={current}
    >
      {children}
    </Button>
  );
}
export function CodeSnippetTabReference({
  state,
  ...props
}: CodeSnippetTabButtonProps & { state: "default" | "hover" | "focus" }): React.ReactElement {
  return <CodeSnippetTabButton {...props} data-code-state={state} />;
}
export type CodeSnippetEntry = {
  value: string;
  label: ReactNode;
  code: string;
  disabled?: boolean;
  formatLine?: (line: string, index: number) => ReactNode;
};
type Common = Omit<HTMLAttributes<HTMLDivElement>, "onCopy" | "dir"> & {
  dir?: "ltr" | "rtl";
  label: string;
  showCopy?: boolean;
  onCopy?: (code: string) => void;
  onCopyError?: (error: unknown) => void;
  collapseAfterLines?: number;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};
export type CodeSnippetProps = Common &
  (
    | {
        variant?: "simple";
        code: string;
        formatLine?: CodeSnippetEntry["formatLine"];
        items?: never;
        value?: never;
        defaultValue?: never;
        onValueChange?: never;
      }
    | {
        variant: "tabs";
        items: readonly CodeSnippetEntry[];
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
        code?: never;
        formatLine?: never;
      }
  );
type InternalProps = CodeSnippetProps & { sourceLineCount?: number; sourceMask?: boolean };
function CodeSnippetBase({
  variant = "simple",
  code,
  formatLine,
  items,
  value,
  defaultValue,
  onValueChange,
  label,
  showCopy = variant === "tabs",
  onCopy,
  onCopyError,
  collapseAfterLines,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  className,
  sourceLineCount,
  sourceMask,
  ...props
}: InternalProps): React.ReactElement {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items?.find((item) => !item.disabled)?.value ?? items?.[0]?.value
  );
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const [copyStatus, setCopyStatus] = useState("");
  const [copying, setCopying] = useState(false);
  if (
    variant === "tabs" &&
    (!items?.length || new Set(items.map((item) => item.value)).size !== items.length)
  )
    throw new Error("CodeSnippet tabs require unique, nonempty entries.");
  const selected =
    items?.find((item) => item.value === (value ?? internalValue)) ??
    items?.find((item) => !item.disabled) ??
    items?.[0];
  const text = variant === "tabs" ? (selected?.code ?? "") : (code ?? "");
  const formatter = variant === "tabs" ? selected?.formatLine : formatLine;
  const lines = text.split("\n");
  const limit = collapseAfterLines ?? (variant === "tabs" ? 23 : undefined);
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1))
    throw new Error("collapseAfterLines must be a positive integer.");
  const canExpand = limit !== undefined && lines.length >= limit;
  const isExpanded = expanded ?? internalExpanded;
  const collapsed = canExpand && !isExpanded;
  const visibleLines = collapsed ? lines.slice(0, limit) : lines;
  const changeValue = (next: string): void => {
    if (value === undefined) setInternalValue(next);
    setCopyStatus("");
    onValueChange?.(next);
  };
  const toggleExpanded = (): void => {
    if (expanded === undefined) setInternalExpanded(!isExpanded);
    onExpandedChange?.(!isExpanded);
  };
  const copy = async (): Promise<void> => {
    setCopying(true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable.");
      await navigator.clipboard.writeText(text);
      setCopyStatus("Code copied");
      onCopy?.(text);
    } catch (error: unknown) {
      setCopyStatus("Unable to copy code");
      onCopyError?.(error);
    } finally {
      setCopying(false);
    }
  };
  const content = (
    <div
      className="p-code-content"
      data-code-collapsed={collapsed || undefined}
      data-source-mask={(sourceMask && collapsed) || undefined}
    >
      {variant === "simple" && (
        <div
          className="p-code-sidebar"
          data-source-numbers={sourceLineCount ? true : undefined}
          aria-hidden="true"
        >
          {Array.from({ length: sourceLineCount ?? visibleLines.length }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
      )}
      <pre role="region" className="p-code-pre" aria-label={label} tabIndex={0}>
        <code>
          {visibleLines.map((line, i) => (
            <span className="p-code-line" key={i}>
              {formatter ? formatter(line, i) : line || "\u200b"}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
  const copyButton = showCopy && (
    <UtilityButton
      variant="tertiary"
      size="xs"
      aria-label="Copy code"
      disabled={copying}
      onClick={() => {
        void copy();
      }}
      icon={<img alt="" src={typeof copyGlyph === "string" ? copyGlyph : copyGlyph.src} />}
    />
  );
  const overlay = canExpand && (
    <div className={cn("p-code-expand", !collapsed && "p-code-expand-open")}>
      <Button
        variant="secondary"
        size="sm"
        leadingIcon={null}
        trailingIcon={null}
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        {collapsed ? "Show more" : "Show less"}
      </Button>
    </div>
  );
  const status = (
    <span className="p-sr-only" role="status">
      {copyStatus}
    </span>
  );
  return variant === "tabs" ? (
    <Primitive.Root
      {...props}
      value={selected?.value}
      onValueChange={changeValue}
      className={cn("p-code-snippet", className)}
      data-code-variant="tabs"
    >
      <div className="p-code-header">
        <Primitive.List className="p-code-tabs" aria-label={label + " examples"}>
          {items?.map((item) => (
            <Primitive.Trigger key={item.value} value={item.value} disabled={item.disabled} asChild>
              <CodeSnippetTabButton current={item.value === selected?.value}>
                {item.label}
              </CodeSnippetTabButton>
            </Primitive.Trigger>
          ))}
        </Primitive.List>
        {copyButton}
      </div>
      <Primitive.Content value={selected?.value ?? ""} className="p-code-panel">
        {content}
        {overlay}
      </Primitive.Content>
      {status}
    </Primitive.Root>
  ) : (
    <div {...props} className={cn("p-code-snippet", className)} data-code-variant="simple">
      {copyButton && <div className="p-code-simple-copy">{copyButton}</div>}
      {content}
      {overlay}
      {status}
    </div>
  );
}
export function CodeSnippet(props: CodeSnippetProps): React.ReactElement {
  return <CodeSnippetBase {...props} />;
}
export function CodeSnippetReference(props: CodeSnippetProps): React.ReactElement {
  return (
    <CodeSnippetBase
      {...props}
      sourceLineCount={props.variant !== "tabs" ? 21 : undefined}
      sourceMask={props.variant === "tabs"}
    />
  );
}
