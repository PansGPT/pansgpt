"use client";
import { useRef, useState } from "react";
import { SettingsRow } from "../settings-row";
import { ReportBugDialog } from "../../report-bug-dialog";

export function HelpSection(): React.ReactElement {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  return (
    <>
      <SettingsRow
        title="Send feedback"
        description="Share an idea or report a problem."
        chevron
        onClick={() => {
          opener.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          setOpen(true);
        }}
      />
      <ReportBugDialog
        open={open}
        onOpenChange={setOpen}
        returnFocus={() => opener.current?.focus()}
      />
    </>
  );
}
