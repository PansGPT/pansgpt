"use client";
import { useId, type ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, isThemeName, useTheme } from "@pansgpt/ui/auth";

export function AuthFrame({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}): React.ReactElement {
  const titleId = useId();
  const { theme, setTheme } = useTheme();
  return (
    <div className="auth-root">
      <a className="auth-skip" href="#auth-content">
        Skip to form
      </a>
      <aside className="auth-story" aria-label="About PansGPT">
        <Link href="/" className="auth-wordmark">
          PansGPT<span>PHARMACY STUDY COMPANION</span>
        </Link>
        <div className="auth-story-copy">
          <span className="auth-eyebrow">A LITTLE FOCUS. A LITTLE PROGRESS.</span>
          <h2>
            Your next
            <br />
            study session
            <br />
            starts here.
          </h2>
          <p>A calmer space to build your understanding of pharmacy, one session at a time.</p>
          <div className="auth-story-rule" aria-hidden="true" />
          <span className="auth-story-note">Made for pharmacy students.</span>
        </div>
        <span className="auth-story-bottom">Learn with intention.</span>
      </aside>
      <div className="auth-workspace">
        <header className="auth-toolbar">
          <Link href="/" className="auth-mobile-brand">
            PansGPT
          </Link>
          <label className="auth-appearance">
            Appearance
            <select
              value={theme}
              onChange={(event) => {
                if (isThemeName(event.target.value)) setTheme(event.target.value);
              }}
            >
              <option value="light">Light</option>
              <option value="dark">OLED Dark</option>
              <option value="sepia">Sepia</option>
            </select>
          </label>
        </header>
        <main className="auth-main" id="auth-content" tabIndex={-1}>
          <Card className="auth-card">
            <CardContent>
              <header className="auth-heading">
                <span className="auth-eyebrow">WELCOME TO PANSGPT</span>
                <h1 id={titleId}>{title}</h1>
                <p>{description}</p>
              </header>
              <section aria-labelledby={titleId} className="auth-body">
                {children}
              </section>
              {footer && <footer className="auth-footer">{footer}</footer>}
            </CardContent>
          </Card>
          <p className="auth-fine-print">A little progress, every study session.</p>
        </main>
      </div>
    </div>
  );
}

export function AuthAlert({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="auth-alert" role="alert">
      {children}
    </div>
  );
}

export function AuthStatus({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="auth-status" role="status">
      {children}
    </div>
  );
}
