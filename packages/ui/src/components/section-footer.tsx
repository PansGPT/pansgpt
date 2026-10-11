import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import divider from "../../assets/section-header-divider.svg";
import mobileDivider from "../../assets/section-footer-divider-mobile.svg";

export type SectionFooterProps = ComponentProps<"div"> & {
  variant?: "section" | "card";
  breakpoint?: "auto" | "desktop" | "mobile";
  control?: ReactNode;
  mobileControl?: ReactNode;
  secondaryAction?: ReactNode;
  actions?: ReactNode;
  divider?: boolean;
};
/** Footer layout; compose shared buttons/groups with caller-owned actions and selection. */
export function SectionFooter({
  variant = "section",
  breakpoint = "auto",
  control,
  mobileControl = control,
  secondaryAction,
  actions,
  divider: showDivider = true,
  className,
  children,
  ...props
}: SectionFooterProps): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-section-footer", className)}
      data-footer-variant={variant}
      data-footer-breakpoint={breakpoint}
    >
      {showDivider && (
        <div className="p-section-footer-divider" aria-hidden="true">
          <img
            className="p-section-footer-divider-desktop"
            src={typeof divider === "string" ? divider : divider.src}
            alt=""
          />
          <img
            className="p-section-footer-divider-mobile"
            src={typeof mobileDivider === "string" ? mobileDivider : mobileDivider.src}
            alt=""
          />
        </div>
      )}
      <div className="p-section-footer-content">
        {control != null && <div className="p-section-footer-desktop-control">{control}</div>}
        {mobileControl != null && (
          <div className="p-section-footer-mobile-control">{mobileControl}</div>
        )}
        {secondaryAction}
        {actions != null && <div className="p-section-footer-actions">{actions}</div>}
        {children}
      </div>
    </div>
  );
}
