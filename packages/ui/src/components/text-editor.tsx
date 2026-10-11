"use client";
import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { TextEditorToolbar } from "./text-editor-toolbar";
import type { TextEditorCommand } from "./text-editor-icon";
import { TextEditorAsset } from "./text-editor-assets";
import { ScrollbarReference } from "./scrollbar";

const nativeCommands: Partial<Record<TextEditorCommand, string>> = {
  Bold: "bold",
  Italic: "italic",
  Underline: "underline",
  "Dot points": "insertUnorderedList",
  "Left align": "justifyLeft",
  "Center align": "justifyCenter",
  "Right align": "justifyRight",
  Justify: "justifyFull",
  "Color picker": "foreColor",
};
export interface TextEditorSnapshot {
  text: string;
  html: string;
}
export type TextEditorProps = Omit<
  ComponentProps<"div">,
  "children" | "onChange" | "defaultValue"
> & {
  label: string;
  size?: "sm" | "md";
  variant?: "default" | "floating";
  defaultValue?: string;
  initialContent?: ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  hint?: ReactNode;
  maxLength?: number;
  resizable?: boolean;
  referenceScrollBar?: boolean;
  onValueChange?: (snapshot: TextEditorSnapshot) => void;
  onRequest?: (
    command: TextEditorCommand,
    selection: string
  ) => string | void | Promise<string | void>;
  onRequestError?: (error: unknown) => void;
};
/** Native editing preserves selection and browser undo. Reset using React's key; snapshots are output, never HTML input. */
export function TextEditor({
  label,
  size = "sm",
  variant = "default",
  defaultValue = "",
  initialContent,
  disabled = false,
  readOnly = false,
  hint,
  maxLength,
  resizable = true,
  referenceScrollBar = false,
  onValueChange,
  onRequest,
  onRequestError,
  className,
  ...props
}: TextEditorProps): React.ReactElement {
  const editor = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const initial = useRef(initialContent ?? defaultValue);
  const [active, setActive] = useState<TextEditorCommand[]>([]);
  const [length, setLength] = useState(defaultValue.length);
  const [font, setFont] = useState("Inter");
  const [fontSize, setFontSize] = useState("16px");
  const hintId = useId();
  const unavailable: TextEditorCommand[] = onRequest
    ? []
    : ["Link", "Insert image", "Insert video", "Generate", "Attach file", "Insert code"];
  useEffect(() => {
    const node = editor.current;
    if (!node || maxLength == null) return;
    const guard = (event: InputEvent): void => {
      if (!event.inputType.startsWith("insert")) return;
      const insertion =
        event.data?.length ??
        (["insertParagraph", "insertLineBreak"].includes(event.inputType) ? 1 : 0);
      if (
        node.innerText.length - (window.getSelection()?.toString().length ?? 0) + insertion >
        maxLength
      )
        event.preventDefault();
    };
    node.addEventListener("beforeinput", guard);
    return () => node.removeEventListener("beforeinput", guard);
  }, [maxLength]);
  useEffect(() => {
    const track = (): void => {
      const selection = window.getSelection();
      if (
        !editor.current ||
        !selection?.rangeCount ||
        !editor.current.contains(selection.anchorNode)
      )
        return;
      savedRange.current = selection.getRangeAt(0).cloneRange();
      setActive(
        Object.entries(nativeCommands)
          .filter(([, command]) => document.queryCommandState(command))
          .map(([command]) => command as TextEditorCommand)
      );
    };
    document.addEventListener("selectionchange", track);
    setLength(editor.current?.innerText.length ?? 0);
    return () => document.removeEventListener("selectionchange", track);
  }, []);
  const emit = (): void => {
    if (!editor.current) return;
    const text = editor.current.innerText;
    setLength(text.length);
    onValueChange?.({ text, html: editor.current.innerHTML });
  };
  const apply = (command: string, value?: string, notify = true): void => {
    if (!editor.current || disabled || readOnly) return;
    editor.current.focus();
    const selection = window.getSelection();
    if (
      selection &&
      savedRange.current &&
      editor.current.contains(savedRange.current.commonAncestorContainer)
    ) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    const insertion =
      command === "insertText" && maxLength != null
        ? value?.slice(
            0,
            Math.max(
              0,
              maxLength - editor.current.innerText.length + (selection?.toString().length ?? 0)
            )
          )
        : value;
    document.execCommand(command, false, insertion);
    if (selection?.rangeCount) savedRange.current = selection.getRangeAt(0).cloneRange();
    setActive(
      Object.entries(nativeCommands)
        .filter(([, native]) => document.queryCommandState(native))
        .map(([name]) => name as TextEditorCommand)
    );
    if (notify) emit();
  };
  const run = async (command: TextEditorCommand, value?: string): Promise<void> => {
    if (disabled || readOnly) return;
    const native = nativeCommands[command];
    if (native) {
      apply(native, value);
      return;
    }
    if (command === "More options" && value?.startsWith("font:")) {
      apply("fontName", value.slice(5));
      return;
    }
    if (command === "More options" && value?.startsWith("size:")) {
      const pixels = value.slice(5);
      if (!["12px", "14px", "16px", "18px", "24px", "32px"].includes(pixels)) return;
      apply("fontSize", "7", false);
      editor.current?.querySelectorAll<HTMLFontElement>('font[size="7"]').forEach((element) => {
        element.removeAttribute("size");
        element.style.fontSize = pixels;
      });
      emit();
      return;
    }
    const requestRange = savedRange.current?.cloneRange();
    let result: string | void;
    try {
      result = await onRequest?.(command, requestRange?.toString() ?? "");
    } catch (error: unknown) {
      onRequestError?.(error);
      return;
    }
    if (typeof result !== "string") return;
    if (requestRange && editor.current?.contains(requestRange.commonAncestorContainer))
      savedRange.current = requestRange;
    else if (requestRange) return;
    if (command === "Link" || command === "Insert image") {
      let url: URL;
      try {
        url = new URL(result);
      } catch {
        return;
      }
      if (!["https:", "http:", ...(command === "Link" ? ["mailto:"] : [])].includes(url.protocol))
        return;
      apply(command === "Link" ? "createLink" : "insertImage", url.href);
    } else {
      apply("insertText", result);
    }
  };
  return (
    <div
      {...props}
      className={cn("p-text-editor", className)}
      data-size={size}
      data-editor-variant={variant}
      data-disabled={disabled}
    >
      <TextEditorToolbar
        size={size}
        variant={variant}
        activeCommands={active}
        disabled={disabled || readOnly}
        unavailableCommands={unavailable}
        onCommand={(command, value) => {
          void run(command, value);
        }}
        fontFamily={font}
        onFontFamilyChange={setFont}
        fontSize={fontSize}
        onFontSizeChange={setFontSize}
      />
      <div className="p-text-editor-input-and-hint">
        <div className="p-text-editor-input" data-resizable={resizable}>
          <div
            ref={editor}
            className="p-text-editor-content"
            role="textbox"
            aria-label={label}
            aria-multiline="true"
            aria-readonly={readOnly}
            aria-disabled={disabled}
            aria-describedby={hint != null || maxLength != null ? hintId : undefined}
            contentEditable={!disabled && !readOnly}
            suppressContentEditableWarning
            tabIndex={disabled ? -1 : 0}
            onInput={emit}
            onPaste={(event) => {
              if (disabled || readOnly) return;
              event.preventDefault();
              const text = event.clipboardData.getData("text/plain");
              apply(
                "insertText",
                maxLength == null
                  ? text
                  : text.slice(
                      0,
                      Math.max(0, maxLength - length + (savedRange.current?.toString().length ?? 0))
                    )
              );
            }}
          >
            {initial.current}
          </div>
          {resizable && (
            <span className="p-text-editor-resize" aria-hidden="true">
              <TextEditorAsset name="editor_imgResizeHandle" />
            </span>
          )}
          {referenceScrollBar && <ScrollbarReference />}
        </div>
        {(hint != null || maxLength != null) && (
          <div id={hintId} className="p-text-editor-hint">
            {hint ?? `${Math.max(0, (maxLength ?? 0) - length)} characters left`}
          </div>
        )}
      </div>
    </div>
  );
}
