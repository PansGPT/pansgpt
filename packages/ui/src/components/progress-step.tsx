import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { Typography } from "./typography";
import { StepIcon, type StepStatus } from "./step-icon";
import connector0 from "../../assets/step-base-imgConnector.svg";
import connector1 from "../../assets/step-base-imgConnector1.svg";
import connector2 from "../../assets/step-base-imgConnector2.svg";
import connector3 from "../../assets/step-base-imgConnector3.svg";
import connector4 from "../../assets/step-base-imgConnector4.svg";
import connector5 from "../../assets/step-base-imgConnector5.svg";
import connector6 from "../../assets/step-base-imgConnector6.svg";
import connector7 from "../../assets/step-base-imgConnector7.svg";
import connector8 from "../../assets/step-base-imgConnector8.svg";
import connector9 from "../../assets/step-base-imgConnector9.svg";
import connector10 from "../../assets/step-base-imgConnector10.svg";
import connector11 from "../../assets/step-base-imgConnector11.svg";
import userMd from "../../assets/step-base-imgUser01.svg";
import userSm from "../../assets/step-base-imgUser2.svg";

const connectors = {
  check: {
    sm: { incomplete: connector0, current: connector0, complete: connector6 },
    md: { incomplete: connector3, current: connector3, complete: connector7 },
  },
  number: {
    sm: { incomplete: connector1, current: connector8, complete: connector1 },
    md: { incomplete: connector4, current: connector10, complete: connector4 },
  },
  featured: {
    sm: { incomplete: connector2, current: connector9, complete: connector2 },
    md: { incomplete: connector5, current: connector11, complete: connector5 },
  },
};
export const progressStepVariants = [
  "icon-left",
  "icon-top",
  "number-left",
  "number-top",
  "featured-icon-left",
  "featured-icon-top",
  "text-line",
] as const;
export type ProgressStepVariant = (typeof progressStepVariants)[number];
export type ProgressStepProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  supportingText?: ReactNode;
  variant?: ProgressStepVariant;
  size?: "sm" | "md";
  status?: StepStatus;
  number?: number;
  icon?: ReactNode;
  connector?: boolean;
};
export function ProgressStep({
  title,
  supportingText,
  variant = "icon-left",
  size = "sm",
  status = "incomplete",
  number = 1,
  icon,
  connector = true,
  className,
  ...props
}: ProgressStepProps): React.ReactElement {
  const top = variant.endsWith("top");
  const line = variant === "text-line";
  const featured = variant.startsWith("featured");
  const kind = featured ? "featured" : variant.startsWith("number") ? "number" : "check";
  const asset = connectors[kind][size][status];
  const user = top && size === "sm" ? userSm : userMd;
  const marker = featured ? (
    <span className="p-step-featured-icon" aria-hidden="true">
      {icon ?? <img src={typeof user === "string" ? user : user.src} alt="" />}
    </span>
  ) : (
    <StepIcon
      size={size}
      status={status}
      variant={kind === "number" ? "number" : "check"}
      number={number}
    />
  );
  return (
    <div
      {...props}
      className={cn("p-progress-step", className)}
      data-step-size={size}
      data-step-status={status}
      data-step-variant={variant}
      aria-current={status === "current" ? "step" : undefined}
    >
      {!line &&
        (top ? (
          marker
        ) : (
          <div className="p-step-connector-wrap">
            {marker}
            {connector && (
              <div className="p-step-connector-slot" aria-hidden="true">
                <img src={typeof asset === "string" ? asset : asset.src} alt="" />
              </div>
            )}
          </div>
        ))}
      <div className="p-step-content">
        <Typography
          variant={size === "sm" ? "text-sm-semibold" : "text-md-semibold"}
          className="p-step-title"
        >
          {title}
        </Typography>
        {supportingText != null && (
          <Typography
            variant={size === "sm" ? "text-sm-regular" : "text-md-regular"}
            className="p-step-supporting"
          >
            {supportingText}
          </Typography>
        )}
      </div>
    </div>
  );
}
