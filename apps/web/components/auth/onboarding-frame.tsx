"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AuthBrand } from "./frame";
export const ONBOARDING_STEPS = ["Your name", "University", "Academic level", "Review"] as const;
export function OnboardingFrame({
  step,
  title,
  description,
  busy,
  back,
  children,
  footer,
}: {
  step: number;
  title: string;
  description: string;
  busy: boolean;
  back: () => void;
  children: ReactNode;
  footer?: ReactNode;
}): React.ReactElement {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <div className="auth-root auth-onboarding-root">
      <a className="auth-skip" href="#onboarding-content">
        Skip to setup
      </a>
      <header className="onboarding-toolbar">
        <button
          className="onboarding-back"
          type="button"
          onClick={back}
          disabled={step === 0 || busy}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back
        </button>
        <AuthBrand />
        <span aria-hidden="true" />
      </header>
      <main id="onboarding-content" className="onboarding-main" tabIndex={-1}>
        <div className="onboarding-content">
          <nav className="onboarding-progress" aria-label="Setup progress">
            <ol>
              {ONBOARDING_STEPS.map((name, index) => (
                <li
                  key={name}
                  aria-current={index === step ? "step" : undefined}
                  data-complete={index < step}
                >
                  <span className="onboarding-step-marker" aria-hidden="true" />
                  <span className="onboarding-step-label">{name}</span>
                </li>
              ))}
            </ol>
            <p>
              Step {step + 1} of {ONBOARDING_STEPS.length}
            </p>
          </nav>
          <header className="onboarding-heading">
            <h1 tabIndex={-1} ref={heading}>
              {title}
            </h1>
            <p>{description}</p>
          </header>
          {children}
        </div>
      </main>
      <footer className="onboarding-footer">{footer}</footer>
    </div>
  );
}
