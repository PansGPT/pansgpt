"use client";

import { cn } from "../utils";
import { Avatar } from "./avatar";
import { SectionHeader, type SectionHeaderProps } from "./section-header";
import divider from "../../assets/section-header-divider.svg";
import mobileDivider from "../../assets/card-header-divider-mobile.svg";

export type CardHeaderProps = Omit<SectionHeaderProps, "leading" | "control" | "tabs"> & {
  avatar?: { label: string; src?: string; initials?: string };
};
export function CardHeader({
  avatar,
  title,
  supportingText,
  headingLevel,
  actions,
  mobileActions,
  menu,
  badge,
  breakpoint = "auto",
  divider: showDivider = true,
  className,
  ...props
}: CardHeaderProps): React.ReactElement {
  return (
    <div
      {...props}
      className={cn("p-card-header", className)}
      data-card-breakpoint={breakpoint}
      data-avatar={avatar != null}
    >
      <SectionHeader
        title={title}
        supportingText={supportingText}
        headingLevel={headingLevel}
        actions={actions}
        mobileActions={mobileActions}
        menu={menu}
        badge={badge}
        breakpoint={breakpoint}
        divider={false}
        leading={avatar ? <Avatar {...avatar} size="xl" /> : undefined}
      />
      {showDivider && (
        <div className="p-card-header-divider" aria-hidden="true">
          <img
            className="p-card-header-divider-desktop"
            src={typeof divider === "string" ? divider : divider.src}
            alt=""
          />
          <img
            className="p-card-header-divider-mobile"
            src={typeof mobileDivider === "string" ? mobileDivider : mobileDivider.src}
            alt=""
          />
        </div>
      )}
    </div>
  );
}
