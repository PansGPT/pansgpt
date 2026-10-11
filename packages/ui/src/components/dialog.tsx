"use client";

import type { ComponentProps, ReactElement, ReactNode } from "react";
import { Dialog as Primitive } from "radix-ui";
import { cn } from "../utils";
import { FigmaAsset, assetUrl } from "./asset";

export type DialogProps = ComponentProps<typeof Primitive.Root> & {
  trigger?: ReactElement;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  featuredIcon?: ReactNode;
  decorative?: boolean;
  className?: string;
};
export function Dialog({
  trigger,
  title,
  description,
  children,
  actions,
  featuredIcon,
  decorative = false,
  className,
  ...props
}: DialogProps): ReactElement {
  return (
    <Primitive.Root {...props}>
      {trigger && <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>}
      <Primitive.Portal>
        <Primitive.Overlay className="p-dialog-overlay" />
        <Primitive.Content className={cn("p-dialog", className)}>
          {decorative && (
            <span
              className="p-dialog-pattern"
              aria-hidden="true"
              style={{ maskImage: 'url("' + assetUrl("patternMask") + '")' }}
            >
              <FigmaAsset name="pattern" />
            </span>
          )}
          <div className="p-dialog-header">
            {featuredIcon && <div className="p-featured-icon">{featuredIcon}</div>}
            <div className="p-dialog-copy">
              <Primitive.Title className="p-dialog-title">{title}</Primitive.Title>
              <Primitive.Description className="p-dialog-description">
                {description}
              </Primitive.Description>
            </div>
          </div>
          <Primitive.Close className="p-dialog-close" aria-label="Close dialog">
            <FigmaAsset name="close" />
          </Primitive.Close>
          {children && <div className="p-dialog-body">{children}</div>}
          {actions && <div className="p-dialog-actions">{actions}</div>}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export const DialogClose = Primitive.Close;
