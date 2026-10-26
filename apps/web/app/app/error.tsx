"use client";
import Link from "next/link";
import { Button } from "@pansgpt/ui/shell";
export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <section className="shell-empty" role="alert">
      <span className="shell-eyebrow">Let&apos;s try that again</span>
      <h1>This page couldn&apos;t be opened</h1>
      <p>Your workspace is still here. Retry this page or return home.</p>
      <div className="shell-empty-actions">
        <Button onClick={reset} leadingIcon={null} trailingIcon={null}>
          Try again
        </Button>
        <Link href="/app">Back to home</Link>
      </div>
    </section>
  );
}
