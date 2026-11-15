"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";

function ReaderDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  returnFocus: string;
}): React.ReactElement {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="reader-dialog-overlay" />
        <DialogPrimitive.Content
          className="reader-dialog"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.querySelector<HTMLElement>(returnFocus)?.focus();
          }}
        >
          <header>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={`Close ${title}`}>
              <X size={18} />
            </DialogPrimitive.Close>
          </header>
          <DialogPrimitive.Description className="p-sr-only">
            {description}
          </DialogPrimitive.Description>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ReaderGoToPage({
  open,
  onOpenChange,
  page,
  total,
  onPage,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  page: number;
  total: number;
  onPage: (page: number) => void;
}): React.ReactElement {
  return (
    <ReaderDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Go to page"
      returnFocus={'[aria-label="Go to page"]'}
      description={`Page 1 to ${total}`}
    >
      <form
        className="reader-go-to-form"
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(new FormData(event.currentTarget).get("page"));
          if (Number.isInteger(value) && value >= 1 && value <= total) {
            onPage(value);
            onOpenChange(false);
          }
        }}
      >
        <label className="reader-go-to-label">
          <span className="p-sr-only">Page number</span>
          <input
            name="page"
            aria-label="Go to page number"
            type="number"
            inputMode="numeric"
            min={1}
            max={total}
            defaultValue={page}
            required
            autoFocus
          />
        </label>
        <span className="reader-go-to-total">/ {total}</span>
        <button className="reader-dialog-primary" type="submit">
          Go
        </button>
      </form>
    </ReaderDialog>
  );
}
