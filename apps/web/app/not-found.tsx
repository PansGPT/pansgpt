import Link from "next/link";
import "@pansgpt/ui/styles.css";
import "@/components/shell/shell.css";
import { ThemeProvider } from "@pansgpt/ui/shell";
export default function NotFound(): React.ReactElement {
  return (
    <ThemeProvider>
      <main className="shell-verification">
        <span className="shell-eyebrow">404</span>
        <h1>We couldn&apos;t find that page</h1>
        <p>Let&apos;s get you back to your study space.</p>
        <Link className="shell-primary-link" href="/app">
          Back to your workspace
        </Link>
      </main>
    </ThemeProvider>
  );
}
