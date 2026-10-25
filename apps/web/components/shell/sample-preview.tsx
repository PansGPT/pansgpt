"use client";
import { useRef, type ReactNode } from "react";
import { Slideout } from "@pansgpt/ui/shell";

export function SamplePreview({
  title,
  children,
  onClose,
}: {
  title: string | null;
  children: ReactNode;
  onClose: () => void;
}): React.ReactElement {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Slideout
      open={Boolean(title)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title ?? "Sample preview"}
      description="Sample content · for design preview"
      onOpenAutoFocus={() => {
        opener.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }}
      onCloseAutoFocus={(event) => {
        if (opener.current?.isConnected) {
          event.preventDefault();
          opener.current.focus();
        }
      }}
    >
      <div className="dashboard-sample-preview">{children}</div>
    </Slideout>
  );
}
