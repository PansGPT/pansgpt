"use client";

import { useId, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";
import { Input } from "./field";
import { Button } from "./button";
import { FileTypeIcon } from "./file-upload";
import { InlineCTAAsset } from "./inline-cta-assets";

export type InlineCTAType =
  "image" | "actions" | "email" | "change-plan" | "upgrade-plan" | "payment" | "receipt";
export type InlineCTAProps = Omit<ComponentProps<"section">, "title"> & {
  title: ReactNode;
  supportingText?: ReactNode;
  type?: InlineCTAType;
  breakpoint?: "auto" | "desktop" | "mobile";
  image?: ReactNode;
  actions?: ReactNode;
  headingLevel?: 2 | 3 | 4 | 5 | 6;
};

/** Content and actions are caller-owned; this surface does not start billing or email requests. */
export function InlineCTA({
  title,
  supportingText,
  type = "actions",
  breakpoint = "auto",
  image,
  actions,
  headingLevel = 3,
  children,
  className,
  ...props
}: InlineCTAProps): React.ReactElement {
  const titleId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <section
      {...props}
      className={cn("p-inline-cta", className)}
      data-cta-type={type}
      data-cta-breakpoint={breakpoint}
      aria-labelledby={props["aria-labelledby"] ?? titleId}
    >
      {type === "image" && image != null && <div className="p-inline-cta-image">{image}</div>}
      <div className="p-inline-cta-content">
        <div className="p-inline-cta-heading">
          <Heading id={titleId}>{title}</Heading>
          {supportingText != null && <p>{supportingText}</p>}
        </div>
        {children}
        {actions}
      </div>
    </section>
  );
}

export function InlineCTAActions({
  secondary,
  primary,
  className,
  ...props
}: ComponentProps<"div"> & { secondary?: ReactNode; primary?: ReactNode }): React.ReactElement {
  return (
    <div {...props} className={cn("p-inline-cta-actions", className)}>
      {secondary}
      {primary}
    </div>
  );
}

export type InlineCTAEmailCaptureProps = Omit<ComponentProps<"form">, "onSubmit" | "children"> & {
  onSubscribe: (email: string) => void;
  email?: string;
  defaultEmail?: string;
  onEmailChange?: (email: string) => void;
  label?: string;
  placeholder?: string;
  submitLabel?: string;
  disabled?: boolean;
  pending?: boolean;
  error?: ReactNode;
};
export function InlineCTAEmailCapture({
  onSubscribe,
  email,
  defaultEmail = "",
  onEmailChange,
  label = "Subscribe to updates",
  placeholder = "you@example.com",
  submitLabel = "Subscribe",
  disabled = false,
  pending = false,
  error,
  className,
  ...props
}: InlineCTAEmailCaptureProps): React.ReactElement {
  const [internalEmail, setEmail] = useState(defaultEmail);
  const value = email ?? internalEmail;
  return (
    <form
      {...props}
      className={cn("p-inline-cta-email", className)}
      aria-busy={pending || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        if (!disabled && !pending) onSubscribe(value.trim());
      }}
    >
      <Input
        type="email"
        name="email"
        autoComplete="email"
        required
        label={label}
        placeholder={placeholder}
        size="md"
        value={value}
        disabled={disabled || pending}
        error={error}
        leadingIcon={<InlineCTAAsset name="imgMail01" />}
        onChange={(event) => {
          if (email === undefined) setEmail(event.target.value);
          onEmailChange?.(event.target.value);
        }}
      />
      <Button
        type="submit"
        size="lg"
        disabled={disabled || pending}
        loading={pending}
        leadingIcon={null}
        trailingIcon={null}
      >
        {submitLabel}
      </Button>
    </form>
  );
}

export function InlineCTAPlan({
  label,
  price,
  period,
  supportingText,
  leading = <InlineCTAAsset name="imgLayersTwo02" />,
  actions,
  className,
  ...props
}: ComponentProps<"div"> & {
  label: ReactNode;
  price: ReactNode;
  period?: ReactNode;
  supportingText?: ReactNode;
  leading?: ReactNode;
  actions?: ReactNode;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-inline-cta-plan", className)}>
      <div className="p-inline-cta-plan-header">
        <span className="p-inline-cta-plan-icon" aria-hidden="true">
          {leading}
        </span>
        <span>{label}</span>
      </div>
      <div className="p-inline-cta-plan-body">
        <div>
          <div className="p-inline-cta-price">
            <strong>{price}</strong>
            {period != null && <span>{period}</span>}
          </div>
          {supportingText != null && <p>{supportingText}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}

export interface InlineCTAFeature {
  id: string;
  title: ReactNode;
  supportingText?: ReactNode;
  icon?: ReactNode;
}
export function InlineCTAFeatures({
  items,
  className,
  ...props
}: ComponentProps<"ul"> & { items: readonly InlineCTAFeature[] }): React.ReactElement {
  return (
    <ul {...props} className={cn("p-inline-cta-features", className)}>
      {items.map((item) => (
        <li key={item.id}>
          <span aria-hidden="true">
            {item.icon ?? <InlineCTAAsset name="imgTypeLineSizeSmColorSuccess" />}
          </span>
          <div>
            <strong>{item.title}</strong>
            {item.supportingText != null && <p>{item.supportingText}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function InlineCTAPaymentMethod({
  title,
  expiry,
  billingEmail,
  icon = <InlineCTAAsset name="imgPaymentMethodIcon" />,
  mobileIcon = <InlineCTAAsset name="imgPaymentMethodIcon1" />,
  action,
  className,
  ...props
}: Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  expiry?: ReactNode;
  billingEmail?: ReactNode;
  icon?: ReactNode;
  mobileIcon?: ReactNode;
  action?: ReactNode;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-inline-cta-payment", className)}>
      <span className="p-inline-cta-payment-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="p-inline-cta-payment-icon-mobile" aria-hidden="true">
        {mobileIcon}
      </span>
      <div className="p-inline-cta-payment-copy">
        <div className="p-inline-cta-payment-row">
          <div>
            <strong>{title}</strong>
            {expiry != null && <p>{expiry}</p>}
          </div>
          {action}
        </div>
        {billingEmail != null && (
          <p className="p-inline-cta-billing-email">
            <InlineCTAAsset name="imgMail2" />
            {billingEmail}
          </p>
        )}
      </div>
    </div>
  );
}

export function InlineCTAReceipt({
  fileName,
  sizeLabel,
  icon = <FileTypeIcon type="pdf" solid={false} />,
  actions,
  className,
  ...props
}: ComponentProps<"div"> & {
  fileName: ReactNode;
  sizeLabel?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}): React.ReactElement {
  return (
    <div {...props} className={cn("p-inline-cta-receipt", className)}>
      <div className="p-inline-cta-receipt-file">
        <span aria-hidden="true">{icon}</span>
        <div>
          <strong>{fileName}</strong>
          {sizeLabel != null && <p>{sizeLabel}</p>}
        </div>
      </div>
      {actions}
    </div>
  );
}
