"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Button } from "@pansgpt/ui/auth";
import { BrandArt, BrandMark, MobileLines } from "./brand-art";
import { LegacyWelcomeCopy } from "./legacy-welcome-copy";

export function AuthBrand(): React.ReactElement {
  return (
    <Link href="/" className="auth-wordmark" aria-label="PansGPT home">
      <BrandMark />
      <span>PansGPT</span>
    </Link>
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
        </div>
        <div className="auth-desktop-art">
          <BrandArt />
        </div>
        <LegacyWelcomeCopy />
      </aside>
      <div className="auth-workspace">
        <header className="auth-toolbar">
          <div className="auth-mobile-brand">
            <AuthBrand />
          </div>
        </header>
        {mobileEntry && (
          <section
            className="auth-mobile-welcome"
            aria-label="Welcome to PansGPT"
            inert={mobileOpen}
          >
            <div className="auth-mobile-art">
              <MobileLines />
            </div>
            <LegacyWelcomeCopy mobile />
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
