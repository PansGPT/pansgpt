"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { Typography } from "./typography";
import { ProgressStep, type ProgressStepVariant } from "./progress-step";
import { StepIcon, type StepStatus } from "./step-icon";
import { StepCompositionAsset, type StepCompositionAssetName } from "./step-composition-asset";
import checkComplete from "../../assets/step-connector-check-complete.png";
import checkIncomplete from "../../assets/step-connector-check-incomplete.png";
import numberComplete from "../../assets/step-connector-number-complete.png";
import numberIncomplete from "../../assets/step-connector-number-incomplete.png";
import featuredComplete from "../../assets/step-connector-featured-complete.png";
import featuredIncomplete from "../../assets/step-connector-featured-incomplete.png";
const connectorArt = {
  check: { complete: checkComplete, incomplete: checkIncomplete },
  number: { complete: numberComplete, incomplete: numberIncomplete },
  featured: { complete: featuredComplete, incomplete: featuredIncomplete },
};

export const progressStepsVariants = [
  "minimal",
  "minimal-connected",
  "text-line",
  "centered",
  "vertical",
] as const;
export type ProgressStepsVariant = (typeof progressStepsVariants)[number];
export interface ProgressStepsItem {
  value: string;
  title: ReactNode;
  supportingText?: ReactNode;
  mobileSupportingText?: ReactNode;
  icon?: ReactNode;
  mobileIcon?: ReactNode;
  disabled?: boolean;
  status?: StepStatus;
}
export type ProgressStepsProps = Omit<ComponentProps<"nav">, "onChange"> & {
  items: readonly ProgressStepsItem[];
  label: string;
  variant?: ProgressStepsVariant;
  marker?: "check" | "number" | "featured";
  size?: "sm" | "md";
  breakpoint?: "auto" | "desktop" | "mobile";
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  interactive?: boolean;
  showCounter?: boolean;
};
function connectedLineKey(
  size: "sm" | "md",
  marker: "check" | "number" | "featured",
  mobile: boolean,
  complete: boolean
): StepCompositionAssetName {
  const index =
    marker === "number"
      ? mobile
        ? size === "sm"
          ? 15
          : 12
        : size === "sm"
          ? complete
            ? 8
            : 9
          : complete
            ? 3
            : 4
      : mobile
        ? size === "sm"
          ? complete
            ? 13
            : 14
          : complete
            ? 10
            : 11
        : size === "sm"
          ? complete
            ? 5
            : 7
          : complete
            ? 0
            : 2;
  return `1139-79128_imgLine${index || ""}` as StepCompositionAssetName;
}
function ProgressStepsBase({
  items,
  label,
  variant = "vertical",
  marker = "check",
  size = "sm",
  breakpoint = "auto",
  value,
  defaultValue,
  onValueChange,
  interactive = onValueChange !== undefined,
  showCounter = true,
  className,
  referenceArtwork = false,
  ...props
}: ProgressStepsProps & { referenceArtwork?: boolean }): React.ReactElement {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items.find((item) => !item.disabled)?.value
  );
  if (items.length === 0) throw new RangeError("Progress steps need at least one item");
  if (new Set(items.map((item) => item.value)).size !== items.length)
    throw new RangeError("Progress step values must be unique");
  const selected = value ?? internalValue;
  const current = Math.max(
    0,
    items.findIndex((item) => item.value === selected)
  );
  const status = (item: ProgressStepsItem, index: number): StepStatus =>
    item.status ?? (index < current ? "complete" : index === current ? "current" : "incomplete");
  const change = (item: ProgressStepsItem): void => {
    if (item.disabled || item.value === selected) return;
    if (value === undefined) setInternalValue(item.value);
    onValueChange?.(item.value);
  };
  const step = (item: ProgressStepsItem, index: number, mobile: boolean): ReactNode => {
    const state = status(item, index);
    if (variant === "minimal" || variant === "minimal-connected")
      return (
        <StepIcon
          size={size}
          status={state}
          variant={marker === "number" ? "number" : "check"}
          number={index + 1}
        />
      );
    const type: ProgressStepVariant =
      variant === "text-line"
        ? "text-line"
        : `${marker === "featured" ? "featured-icon" : marker === "number" ? "number" : "icon"}-${variant === "centered" && !mobile ? "top" : "left"}`;
    return (
      <ProgressStep
        title={item.title}
        supportingText={
          mobile ? (item.mobileSupportingText ?? item.supportingText) : item.supportingText
        }
        icon={mobile ? (item.mobileIcon ?? item.icon) : item.icon}
        variant={type}
        size={size}
        status={state}
        number={index + 1}
        connector={index !== items.length - 1}
      />
    );
  };
  const render = (mobile: boolean): React.ReactElement => {
    const minimal = variant === "minimal";
    const connected = variant === "minimal-connected";
    const centered = variant === "centered" && !mobile;
    const line =
      marker === "number"
        ? "imgLines1"
        : marker === "featured"
          ? size === "sm"
            ? "imgLines2"
            : "imgLines3"
          : "imgLines";
    return (
      <div className="p-steps-layout" data-layout={mobile ? "mobile" : "desktop"}>
        {minimal && showCounter && (
          <Typography variant="text-sm-medium" className="p-steps-counter">
            Step {current + 1} of {items.length}
          </Typography>
        )}
        <ol className="p-steps-list">
          {centered && referenceArtwork && (
            <li className="p-steps-centered-line" aria-hidden="true">
              <StepCompositionAsset name={`1141-76669_${line}`} />
            </li>
          )}
          {items.map((item, index) => (
            <li
              className="p-steps-item"
              key={item.value}
              aria-current={status(item, index) === "current" ? "step" : undefined}
            >
              {interactive ? (
                <Button
                  variant="tertiary"
                  leadingIcon={null}
                  trailingIcon={null}
                  className="p-steps-action"
                  disabled={item.disabled}
                  onClick={() => change(item)}
                  aria-label={typeof item.title === "string" ? item.title : `Step ${index + 1}`}
                  aria-current={status(item, index) === "current" ? "step" : undefined}
                >
                  {step(item, index, mobile)}
                </Button>
              ) : (
                step(item, index, mobile)
              )}
              <span className="p-steps-status">
                {status(item, index) === "complete"
                  ? "Completed"
                  : status(item, index) === "current"
                    ? "Current step"
                    : "Upcoming step"}
              </span>
              {centered &&
                !referenceArtwork &&
                index < items.length - 1 &&
                (() => {
                  const art =
                    connectorArt[marker][
                      status(item, index) === "complete" ? "complete" : "incomplete"
                    ];
                  return (
                    <span className="p-steps-live-line" aria-hidden="true">
                      <img src={typeof art === "string" ? art : art.src} alt="" />
                    </span>
                  );
                })()}
              {connected && index < items.length - 1 && (
                <StepCompositionAsset
                  name={connectedLineKey(size, marker, mobile, status(item, index) === "complete")}
                  className="p-steps-connected-line"
                />
              )}
            </li>
          ))}
        </ol>
      </div>
    );
  };
  return (
    <nav
      {...props}
      aria-label={label}
      className={cn("p-progress-steps", className)}
      data-steps-variant={variant}
      data-step-size={size}
      data-steps-marker={marker}
      data-breakpoint={breakpoint}
    >
      {render(false)}
      {render(true)}
    </nav>
  );
}
export function ProgressSteps(props: ProgressStepsProps): React.ReactElement {
  return <ProgressStepsBase {...props} />;
}
export function ProgressStepsReference(props: ProgressStepsProps): React.ReactElement {
  return <ProgressStepsBase {...props} referenceArtwork />;
}
