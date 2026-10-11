import type { ComponentProps } from "react";
import { cn } from "../utils";
import incompleteSm from "../../assets/step-icon-imgTypeCheckStatusIncompleteSizeSm.svg";
import incompleteMd from "../../assets/step-icon-imgTypeCheckStatusIncompleteSizeMd.svg";
import currentSm from "../../assets/step-icon-current-sm.png";
import currentMd from "../../assets/step-icon-current-md.png";
import checkSm from "../../assets/step-icon-imgCheck.svg";
import checkMd from "../../assets/step-icon-imgCheck1.svg";

const artwork = {
  sm: { incomplete: incompleteSm, current: currentSm, complete: checkSm },
  md: { incomplete: incompleteMd, current: currentMd, complete: checkMd },
};
export const stepStatuses = ["incomplete", "current", "complete"] as const;
export type StepStatus = (typeof stepStatuses)[number];
export type StepIconProps = ComponentProps<"span"> & {
  size?: "sm" | "md";
  status?: StepStatus;
  variant?: "check" | "number";
  number?: number;
};
export function StepIcon({
  size = "sm",
  status = "incomplete",
  variant = "check",
  number = 1,
  className,
  "aria-label": label,
  ...props
}: StepIconProps): React.ReactElement {
  const asset = artwork[size][status];
  return (
    <span
      {...props}
      className={cn("p-step-icon", className)}
      data-step-size={size}
      data-step-status={status}
      data-step-variant={variant}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {variant === "number" && status !== "complete" ? (
        <span className="p-step-number">{number}</span>
      ) : (
        <img
          src={typeof asset === "string" ? asset : asset.src}
          alt=""
          className="p-step-icon-artwork"
        />
      )}
    </span>
  );
}
