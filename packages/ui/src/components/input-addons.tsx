import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { FieldNativeAsset } from "./field-native-assets";
export type InputAddonSelectProps = Omit<ComponentProps<"select">, "children"> & {
  options: readonly { value: string; label: string }[];
  "aria-label": string;
};
export function InputAddonSelect({
  options,
  className,
  ...props
}: InputAddonSelectProps): React.ReactElement {
  return (
    <span className={cn("p-input-addon-select", className)}>
      <select {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldNativeAsset name="source16_imgChevronDown" />
    </span>
  );
}
export function PaymentMethodIcon({
  children,
  className,
  ...props
}: ComponentProps<"span"> & { children?: ReactNode }): React.ReactElement {
  return (
    <span {...props} className={cn("p-payment-method-icon", className)}>
      {children ?? <FieldNativeAsset name="source1_imgMastercard" />}
    </span>
  );
}
