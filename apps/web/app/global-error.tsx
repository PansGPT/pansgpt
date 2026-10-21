"use client";
import "@pansgpt/ui/styles.css";
import Link from "next/link";
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "var(--bg-primary, white)",
          color: "var(--text-primary-900, #101828)",
          fontFamily: "var(--font-body, sans-serif)",
        }}
      >
        <main
          style={{
            minHeight: "100svh",
            display: "grid",
            placeContent: "center",
            gap: 20,
            padding: 28,
            textAlign: "center",
          }}
        >
          <h1>Something interrupted your session</h1>
          <p>Please try again, or return to your workspace.</p>
          <button onClick={reset} style={{ padding: 14, cursor: "pointer" }}>
            Try again
          </button>
          <Link href="/app">Back to your workspace</Link>
        </main>
      </body>
    </html>
  );
}
