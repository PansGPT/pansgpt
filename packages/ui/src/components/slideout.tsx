"use client";

import { Dialog as Primitive } from "radix-ui";
import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { CommandFeaturedIcon } from "./command-primitives";
import { SlideoutAsset } from "./slideout-assets";
const SlideoutDialogContext = createContext(false);

export type SlideoutHeaderProps = Omit<ComponentProps<"header">, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  tabs?: ReactNode;
  breakpoint?: "desktop" | "mobile" | "auto";
  onClose?: () => void;
  closeLabel?: string;
  closeIcon?: ReactNode;
};
export function SlideoutHeader({
  title,
  description,
  icon,
  tabs,
  breakpoint = "auto",
  onClose,
  closeLabel = "Close panel",
  closeIcon,
  className,
  ...props
}: SlideoutHeaderProps): React.ReactElement {
  const dialog = useContext(SlideoutDialogContext);
  const close = (
    <Button
      iconOnly
      variant="tertiary"
      leadingIcon={closeIcon ?? <SlideoutAsset name="source0_imgXClose" />}
      aria-label={closeLabel}
      className="p-slideout-close"
      disabled={!dialog && !onClose}
      onClick={onClose}
    />
  );
  return (
    <header
      {...props}
      className={cn("p-slideout-header", className)}
      data-breakpoint={breakpoint}
      data-tabs={Boolean(tabs)}
    >
      <div className="p-slideout-header-inner">
        <div className="p-slideout-heading">
          {icon && <CommandFeaturedIcon>{icon}</CommandFeaturedIcon>}
          <div className="p-slideout-header-copy">
            <h2>{title}</h2>
            {description && <p>{description}</p>}
          </div>
        </div>
        {tabs && <div className="p-slideout-header-tabs">{tabs}</div>}
        {dialog ? <Primitive.Close asChild>{close}</Primitive.Close> : close}
      </div>
    </header>
  );
}
export function SlideoutBody({ className, ...props }: ComponentProps<"div">): React.ReactElement {
  return <div {...props} className={cn("p-slideout-body", className)} />;
}
export function SlideoutFooter({
  className,
  ...props
}: ComponentProps<"footer">): React.ReactElement {
  return <footer {...props} className={cn("p-slideout-footer", className)} />;
}
export function SlideoutSection({
  title,
  description,
  children,
  className,
  ...props
}: Omit<ComponentProps<"section">, "title"> & {
  title?: ReactNode;
  description?: ReactNode;
}): React.ReactElement {
  return (
    <section {...props} className={cn("p-slideout-section", className)}>
      {(title || description) && (
        <div className="p-slideout-section-copy">
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
export type SlideoutSurfaceProps = ComponentProps<"aside"> & {
  header: ReactNode;
  footer?: ReactNode;
  breakpoint?: "desktop" | "mobile";
  label: string;
};
export function SlideoutSurface({
  header,
  footer,
  breakpoint = "desktop",
  label,
  children,
  className,
  ...props
}: SlideoutSurfaceProps): React.ReactElement {
  return (
    <aside
      {...props}
      className={cn("p-slideout-surface", className)}
      aria-label={label}
      data-breakpoint={breakpoint}
    >
      <div className="p-slideout-panel">
        {header}
        <SlideoutBody>{children}</SlideoutBody>
        {footer}
      </div>
    </aside>
  );
}
export type SlideoutProps = ComponentProps<typeof Primitive.Root> & {
  trigger?: ReactElement;
  title: string;
  description: string;
  header?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
  side?: "left" | "right";
};
export function Slideout({
  trigger,
  title,
  description,
  header,
  footer,
  children,
  className,
  side = "right",
  ...props
}: SlideoutProps): React.ReactElement {
  return (
    <Primitive.Root {...props}>
      {trigger && <Primitive.Trigger asChild>{trigger}</Primitive.Trigger>}
      <Primitive.Portal>
        <Primitive.Overlay className="p-slideout-overlay" />
        <Primitive.Content className={cn("p-slideout-dialog", className)} data-side={side}>
          <Primitive.Title className="p-sr-only">{title}</Primitive.Title>
          <Primitive.Description className="p-sr-only">{description}</Primitive.Description>
          <SlideoutDialogContext.Provider value>
            {header ?? <SlideoutHeader title={title} description={description} />}
          </SlideoutDialogContext.Provider>
          <SlideoutBody>{children}</SlideoutBody>
          {footer}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
export const SlideoutClose = Primitive.Close;
