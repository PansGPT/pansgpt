import { type ComponentProps, type ReactNode } from "react";
import { cn } from "../utils";

export type CreditCardPreviewProps = ComponentProps<"figure"> & {
  background: string;
  label: string;
  brand: ReactNode;
  holder: string;
  number: string;
  expiry: string;
  paymentIcon: ReactNode;
  contactlessIcon?: ReactNode;
  size?: "desktop" | "mobile";
};
/** Display caller-supplied masked card details. Payment collection stays with the caller's payment provider. */
export function CreditCardPreview({
  background,
  label,
  brand,
  holder,
  number,
  expiry,
  paymentIcon,
  contactlessIcon,
  size = "desktop",
  className,
  ...props
}: CreditCardPreviewProps): React.ReactElement {
  return (
    <figure
      {...props}
      className={cn("p-credit-card-preview", className)}
      aria-label={label}
      data-size={size}
    >
      <img className="p-credit-card-background" src={background} alt="" />
      <div className="p-credit-card-glass">
        <span className="p-credit-card-brand">{brand}</span>
        <span className="p-credit-card-contactless" aria-hidden="true">
          {contactlessIcon}
        </span>
        <span className="p-credit-card-holder">{holder}</span>
        <span className="p-credit-card-expiry">{expiry}</span>
        <span className="p-credit-card-number">{number}</span>
        <span className="p-credit-card-payment" aria-hidden="true">
          {paymentIcon}
        </span>
      </div>
    </figure>
  );
}
