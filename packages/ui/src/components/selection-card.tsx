"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { RadioGroup as Primitive } from "radix-ui";
import { cn } from "../utils";
import { ControlNativeAsset } from "./control-native-assets";
import { Badge } from "./badge";
import { navigateRadioGroup } from "./radio-keyboard";

export type SelectionCardVariant = "radio" | "checkbox" | "icon" | "plan" | "avatar" | "payment";
export interface SelectionCardContent {
  label: ReactNode;
  subtext?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  price?: ReactNode;
  period?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  actionsSpacing?: "sm" | "md";
  checkIcon?: ReactNode;
}
export type SelectionCardProps = Omit<ComponentProps<"input">, "type" | "size" | "children"> &
  SelectionCardContent & {
    size?: "sm" | "md";
    variant?: SelectionCardVariant;
    referenceState?: "default" | "hover" | "focused";
    breakpoint?: "desktop" | "mobile";
  };

function CardContent({
  label,
  subtext,
  description,
  icon,
  price,
  period,
  badge,
  actions,
  actionsSpacing,
  variant,
  labelId,
  descriptionId,
  disabled,
}: SelectionCardContent & {
  variant: SelectionCardVariant;
  labelId: string;
  descriptionId: string;
  disabled?: boolean;
}): React.ReactElement {
  const ornament = icon != null && (
    <span className="p-selection-card-ornament" aria-hidden="true">
      {icon}
    </span>
  );
  const copy = (
    <span className="p-selection-card-copy">
      <span className="p-selection-card-title-row">
        <span className="p-selection-card-title" id={labelId}>
          {label}
        </span>
        {subtext != null && <span className="p-selection-card-subtext">{subtext}</span>}
      </span>
      {description != null && (
        <span className="p-selection-card-description" id={descriptionId}>
          {description}
        </span>
      )}
      {actions != null && (
        <span
          className="p-selection-card-actions"
          data-spacing={actionsSpacing}
          inert={disabled || undefined}
          onClick={(event) => event.stopPropagation()}
        >
          {actions}
        </span>
      )}
    </span>
  );
  if (variant !== "plan")
    return (
      <span className="p-selection-card-content">
        {ornament}
        {copy}
      </span>
    );
  return (
    <>
      <span className="p-selection-card-header">
        {ornament}
        <span className="p-selection-card-title" id={labelId}>
          {label}
        </span>
      </span>
      <span className="p-selection-card-body">
        <span className="p-selection-card-plan-copy">
          <span className="p-selection-card-price">
            {price}
            <span className="p-selection-card-period">{period}</span>
          </span>
          {description != null && (
            <span className="p-selection-card-description" id={descriptionId}>
              {description}
            </span>
          )}
        </span>
        {badge != null && (
          <span className="p-selection-card-badge">
            {typeof badge === "string" ? (
              <Badge variant="modern" color="gray" dot>
                {badge}
              </Badge>
            ) : (
              badge
            )}
          </span>
        )}
      </span>
    </>
  );
}

/** A selectable card with a native form input. Checkbox cards allow multiple selection; other variants share a radio name. */
export function SelectionCard({
  label,
  subtext,
  description,
  icon,
  price,
  period,
  badge,
  actions,
  actionsSpacing,
  checkIcon,
  variant = "icon",
  size = "sm",
  referenceState,
  breakpoint,
  className,
  id,
  ...inputProps
}: SelectionCardProps): React.ReactElement {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  return (
    <div
      className={cn("p-selection-card", className)}
      data-variant={variant}
      data-size={size}
      data-breakpoint={breakpoint}
      data-reference-state={referenceState}
      data-disabled={inputProps.disabled || undefined}
    >
      <input
        {...inputProps}
        id={controlId}
        type={variant === "checkbox" ? "checkbox" : "radio"}
        className="p-selection-card-input"
        aria-labelledby={labelId}
        aria-describedby={
          [inputProps["aria-describedby"], description != null ? descriptionId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
      />
      <CardContent
        {...{
          label,
          subtext,
          description,
          icon,
          price,
          period,
          badge,
          actions,
          actionsSpacing,
          variant,
          labelId,
          descriptionId,
        }}
        disabled={inputProps.disabled}
      />
      <span className="p-selection-card-marker" aria-hidden="true">
        <span className="p-selection-card-check">
          {variant !== "radio" &&
            (checkIcon ?? (
              <ControlNativeAsset
                name={
                  size === "sm"
                    ? inputProps.disabled
                      ? "source4_imgCheck2"
                      : "source4_imgCheck"
                    : inputProps.disabled
                      ? "source4_imgCheck3"
                      : "source4_imgCheck1"
                }
              />
            ))}
        </span>
      </span>
    </div>
  );
}

export interface SelectionCardOption extends SelectionCardContent {
  value: string;
  disabled?: boolean;
}
export type SelectionCardGroupProps = Omit<ComponentProps<typeof Primitive.Root>, "children"> & {
  label: string;
  options: readonly SelectionCardOption[];
  variant?: SelectionCardVariant;
  size?: "sm" | "md";
};

/** Single-choice card group with roving focus, native form values and separate actionable links. */
export function SelectionCardGroup({
  label,
  options,
  variant = "icon",
  size = "sm",
  className,
  ...props
}: SelectionCardGroupProps): React.ReactElement {
  const id = useId();
  return (
    <Primitive.Root
      {...props}
      aria-label={label}
      orientation={props.orientation ?? "vertical"}
      className={cn("p-selection-card-group", className)}
    >
      {options.map((option, index) => {
        const labelId = `${id}-${index}-label`;
        const descriptionId = `${id}-${index}-description`;
        return (
          <div
            key={option.value}
            className="p-selection-card"
            data-variant={variant}
            data-size={size}
            data-disabled={option.disabled || props.disabled || undefined}
          >
            <Primitive.Item
              value={option.value}
              disabled={option.disabled}
              aria-labelledby={labelId}
              aria-describedby={option.description != null ? descriptionId : undefined}
              className="p-selection-card-button"
              onKeyDown={(event) =>
                navigateRadioGroup(event, {
                  orientation: props.orientation ?? "vertical",
                  dir: props.dir,
                  loop: props.loop,
                })
              }
            />
            <CardContent
              {...option}
              disabled={option.disabled || props.disabled}
              variant={variant}
              labelId={labelId}
              descriptionId={descriptionId}
            />
            <span className="p-selection-card-marker" aria-hidden="true">
              <span className="p-selection-card-check">
                {variant !== "radio" &&
                  (option.checkIcon ?? (
                    <ControlNativeAsset
                      name={
                        size === "sm"
                          ? option.disabled || props.disabled
                            ? "source4_imgCheck2"
                            : "source4_imgCheck"
                          : option.disabled || props.disabled
                            ? "source4_imgCheck3"
                            : "source4_imgCheck1"
                      }
                    />
                  ))}
              </span>
            </span>
          </div>
        );
      })}
    </Primitive.Root>
  );
}
