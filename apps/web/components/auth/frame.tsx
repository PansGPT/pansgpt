"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, isThemeName, useTheme } from "@pansgpt/ui/auth";
import { BrandArt, BrandMark } from "./brand-art";

export function AuthBrand(): React.ReactElement {
  return (
    <Link href="/" className="auth-wordmark" aria-label="PansGPT home">
      <BrandMark />
      <span>PansGPT</span>
    </Link>
  );
}
export function AuthAppearance(): React.ReactElement {
  const { theme, setTheme, ready } = useTheme();
  return (
    <label className="auth-appearance">
      Appearance
      <select
        disabled={!ready}
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
  );
}
export function AuthFrame({
  title,
  description,
  children,
  footer,
  mobileEntry,
  mobileInitiallyOpen = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  mobileEntry?: "login" | "signup";
  mobileInitiallyOpen?: boolean;
}): React.ReactElement {
  const titleId = useId();
  const [mobileOpen, setMobileOpen] = useState(mobileInitiallyOpen || mobileEntry !== "login");
  const mainRef = useRef<HTMLElement>(null);
  const welcomeActionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (mobileEntry && mobileOpen && window.matchMedia("(max-width: 860px)").matches)
      mainRef.current?.focus();
  }, [mobileEntry, mobileOpen]);
  return (
    <div className="auth-root" data-mobile-entry={mobileEntry} data-mobile-open={mobileOpen}>
      <a
        className="auth-skip"
        href="#auth-content"
        onClick={(event) => {
          if (mobileEntry && !mobileOpen && window.matchMedia("(max-width: 860px)").matches) {
            event.preventDefault();
            setMobileOpen(true);
          }
        }}
      >
        Skip to form
      </a>
      <aside className="auth-story" aria-label="About PansGPT">
        <div className="auth-story-brand">
          <AuthBrand />
          <span>PHARMACY STUDY COMPANION</span>
        </div>
        <BrandArt />
        <div className="auth-story-copy">
          <span className="auth-eyebrow">A LITTLE FOCUS. A LITTLE PROGRESS.</span>
          <h2>
            Your next study session
            <br />
            starts here.
          </h2>
          <p>A calmer space to build your understanding of pharmacy, one session at a time.</p>
          <div className="auth-story-rule" aria-hidden="true" />
          <span className="auth-story-note">Made for pharmacy students.</span>
        </div>
      </aside>
      <div className="auth-workspace">
        <header className="auth-toolbar">
          <div className="auth-mobile-brand">
            <AuthBrand />
          </div>
          <AuthAppearance />
        </header>
        {mobileEntry && (
          <section
            className="auth-mobile-welcome"
            aria-label="Welcome to PansGPT"
            inert={mobileOpen}
          >
            <div className="auth-mobile-art">
              <BrandArt />
            </div>
            <div className="auth-welcome-copy">
              <span className="auth-pharmacy-badge">Built for Pharmacy School</span>
              <h1>
                Your pharmacy journey.
                <br />A little more connected.
              </h1>
              <p>
                A space for the concepts, the revision,
                <br />
                and everything you are working towards.
              </p>
            </div>
            <div className="auth-welcome-actions">
              {mobileEntry === "signup" ? (
                <Button
                  variant="secondary"
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={() => setMobileOpen(true)}
                  ref={welcomeActionRef}
                >
                  Sign up
                </Button>
              ) : (
                <Link className="auth-welcome-secondary" href="/signup">
                  Sign up
                </Link>
              )}
              {mobileEntry === "login" ? (
                <Button
                  leadingIcon={null}
                  trailingIcon={null}
                  onClick={() => setMobileOpen(true)}
                  ref={welcomeActionRef}
                >
                  Log in
                </Button>
              ) : (
                <Link className="auth-welcome-primary" href="/login?form=login">
                  Log in
                </Link>
              )}
            </div>
          </section>
        )}
        <main className="auth-main" id="auth-content" tabIndex={-1} ref={mainRef}>
          {mobileEntry && (
            <div className="auth-sheet-top">
              <span className="auth-sheet-handle" aria-hidden="true" />
              <button
                type="button"
                className="auth-sheet-dismiss"
                onClick={() => {
                  setMobileOpen(false);
                  window.requestAnimationFrame(() => welcomeActionRef.current?.focus());
                }}
              >
                Cancel
              </button>
            </div>
          )}
          <div className="auth-card">
            <header className="auth-heading">
              <h1 id={titleId}>{title}</h1>
              <p>{description}</p>
            </header>
            <section aria-labelledby={titleId} className="auth-body">
              {children}
            </section>
            {footer && <footer className="auth-footer">{footer}</footer>}
          </div>
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
