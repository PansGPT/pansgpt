"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Button as SharedButton, DialogPrimitive } from "@pansgpt/ui/shell";
import { label } from "./config";

export function Button(props: ComponentProps<typeof SharedButton>): React.ReactElement {
  return <SharedButton leadingIcon={null} trailingIcon={null} {...props} />;
}
export function Status({ value }: { value: string }): React.ReactElement {
  return (
    <span className="gov-status" data-status={value}>
      <span aria-hidden="true" />
      {label(value)}
    </span>
  );
}
export function Dialog({
  title,
  description,
  children,
  close,
  busy = false,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  close: () => void;
  busy?: boolean;
  wide?: boolean;
}): React.ReactElement {
  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="gov-overlay" />
        <DialogPrimitive.Content
          className="gov-dialog"
          data-wide={wide || undefined}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <div className="gov-dialog-heading">
            <div>
              <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
              <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
            </div>
            <button className="gov-close" aria-label="Close dialog" disabled={busy} onClick={close}>
              ×
            </button>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
export function Select({
  label: caption,
  children,
  ...props
}: ComponentProps<"select"> & { label: string }): React.ReactElement {
  const id = useId();
  return (
    <label className="gov-field" htmlFor={id}>
      <span>{caption}</span>
      <select id={id} aria-label={caption} {...props}>
        {children}
      </select>
    </label>
  );
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}): React.ReactElement {
  return (
    <div className="gov-empty">
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Failure({
  error,
  retry,
}: {
  error: string;
  retry: () => void;
}): React.ReactElement {
  return (
    <div className="gov-error" role="alert">
      <strong>We couldn’t load this workspace.</strong>
      <p>{error}</p>
      <Button variant="secondary" onClick={retry}>
        Try again
      </Button>
    </div>
  );
}
