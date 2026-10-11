"use client";
import { useId, useState, type ComponentProps, type CSSProperties } from "react";
import { cn } from "../utils";
import { FieldLabel, FieldMessage, type FieldOptions } from "./field";

export const verificationCodeSizes = ["sm", "md", "lg"] as const;
export type VerificationCodeSize = (typeof verificationCodeSizes)[number];
export type VerificationCodeSlotState = "placeholder" | "filled" | "focused" | "disabled";
/** Visual digit primitive. VerificationCodeInput supplies the actual native input and its keyboard behavior. */
export function VerificationCodeSlot({
  size = "sm",
  state = "placeholder",
  children = "0",
  className,
  ...props
}: ComponentProps<"div"> & {
  size?: VerificationCodeSize;
  state?: VerificationCodeSlotState;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-code-slot", className)} data-size={size} data-state={state}>
      <span className="p-code-digit">{children}</span>
    </div>
  );
}
export type VerificationCodeInputProps = Omit<
  ComponentProps<"input">,
  "size" | "value" | "defaultValue" | "onChange" | "children" | "type" | "maxLength" | "pattern"
> &
  FieldOptions & {
    size?: VerificationCodeSize;
    digits?: 4 | 6;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    onComplete?: (value: string) => void;
    responsive?: boolean;
  };
export function VerificationCodeInput({
  id,
  label,
  hint,
  error,
  help,
  className,
  size = "sm",
  digits = 4,
  value,
  defaultValue = "",
  onValueChange,
  onComplete,
  responsive = true,
  required,
  "aria-describedby": describedBy,
  onFocus,
  onBlur,
  onClick,
  onKeyUp,
  onPaste,
  onSelect,
  style,
  ...props
}: VerificationCodeInputProps): React.ReactElement {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = inputId + "-message";
  const sanitize = (text: string): string => text.replace(/[^0-9]/g, "").slice(0, digits);
  const [internal, setInternal] = useState(defaultValue);
  const text = sanitize(value ?? internal);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const update = (next: string): void => {
    if (props.disabled || props.readOnly) return;
    const clean = sanitize(next);
    setInternal(clean);
    onValueChange?.(clean);
    setActive(Math.min(clean.length, digits - 1));
    if (clean.length === digits && clean !== text) onComplete?.(clean);
  };
  const selectSlot = (input: HTMLInputElement): void =>
    setActive(Math.min(input.selectionStart ?? text.length, digits - 1));
  const widths = {
    sm: { 4: 280, 6: 460 },
    md: { 4: 356, 6: 584 },
    lg: { 4: 420, 6: 680 },
  } as const;
  return (
    <div
      className={cn("p-code-field", className)}
      data-size={size}
      data-digits={digits}
      data-responsive={responsive}
      data-error={error != null || undefined}
      data-disabled={props.disabled || undefined}
      style={{ "--code-width": `${widths[size][digits]}px` } as CSSProperties}
    >
      <FieldLabel id={inputId} label={label} required={required} help={help} />
      <div className="p-code-row">
        <div className="p-code-slots" aria-hidden="true">
          {Array.from({ length: digits }, (_, index) => (
            <span className="p-code-slot-group" key={index}>
              {digits === 6 && index === 3 && <span className="p-code-separator">-</span>}
              <VerificationCodeSlot
                size={size}
                state={
                  props.disabled
                    ? "disabled"
                    : focused && active === index
                      ? "focused"
                      : text[index]
                        ? "filled"
                        : "placeholder"
                }
              >
                {text[index] ?? "0"}
              </VerificationCodeSlot>
            </span>
          ))}
        </div>
        <input
          {...props}
          id={inputId}
          className="p-code-input"
          style={style}
          type="text"
          inputMode={props.inputMode ?? "numeric"}
          autoComplete={props.autoComplete ?? "one-time-code"}
          value={text}
          maxLength={digits}
          pattern={`[0-9]{${digits}}`}
          required={required}
          aria-label={props["aria-label"] ?? (label ? undefined : "Verification code")}
          aria-invalid={error != null || props["aria-invalid"]}
          aria-describedby={
            [describedBy, error != null || hint != null ? messageId : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          onChange={(event) => update(event.currentTarget.value)}
          onFocus={(event) => {
            setFocused(true);
            selectSlot(event.currentTarget);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onSelect={(event) => {
            selectSlot(event.currentTarget);
            onSelect?.(event);
          }}
          onKeyUp={(event) => {
            selectSlot(event.currentTarget);
            onKeyUp?.(event);
          }}
          onClick={(event) => {
            onClick?.(event);
            if (event.defaultPrevented) return;
            const row = event.currentTarget.parentElement;
            const cells = row?.querySelectorAll<HTMLElement>(".p-code-slot");
            if (!cells) return;
            let closest = 0,
              distance = Infinity;
            cells.forEach((cell, index) => {
              const b = cell.getBoundingClientRect();
              const delta = Math.abs(event.clientX - (b.left + b.width / 2));
              if (delta < distance) {
                distance = delta;
                closest = index;
              }
            });
            const caret = Math.min(closest, text.length);
            event.currentTarget.setSelectionRange(caret, Math.min(caret + 1, text.length));
            setActive(closest);
          }}
          onPaste={(event) => {
            onPaste?.(event);
            if (event.defaultPrevented) return;
            event.preventDefault();
            update(event.clipboardData.getData("text"));
          }}
        />
      </div>
      <FieldMessage id={messageId} hint={hint} error={error} />
    </div>
  );
}
