"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronLeft } from "lucide-react";
import { Button, DialogPrimitive } from "@pansgpt/ui/shell";

export const SettingsDetailBackContext = createContext<RefObject<(() => void) | null> | null>(null);
function subscribe(notify: () => void): () => void {
  const media = window.matchMedia("(max-width: 860px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}
export function useMobileSettings(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(max-width: 860px)").matches,
    () => false
  );
}
/** Desktop dialog and mobile Settings page share their content and operations. */
export function SettingsDetailView({
  open,
  onOpenChange,
  title,
  description,
  icon,
  children,
  maxWidth = 520,
  closeLabel = "Close",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  maxWidth?: number;
  closeLabel?: string | false;
}): React.ReactElement | null {
  const mobile = useMobileSettings();
  const navigationRef = useContext(SettingsDetailBackContext);
  const heading = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => {
    if (!mobile || !open) return;
    const back = (): void => {
      onOpenChange(false);
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLElement>(".settings-content-pane")
          ?.focus({ preventScroll: true })
      );
    };
    if (navigationRef) navigationRef.current = back;
    heading.current?.focus({ preventScroll: true });
    return () => {
      if (navigationRef?.current === back) navigationRef.current = null;
    };
  }, [mobile, open, navigationRef, onOpenChange]);
  if (!open) return null;
  if (mobile)
    return (
      <section
        className="settings-mobile-subpage settings-detail-page"
        aria-labelledby={`${id}-title`}
      >
        <div className="settings-subpage-header">
          <button
            type="button"
            className="settings-subpage-back-btn"
            aria-label="Back"
            onClick={() => {
              onOpenChange(false);
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLElement>(".settings-content-pane")
                  ?.focus({ preventScroll: true })
              );
            }}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <h2 ref={heading} tabIndex={-1} id={`${id}-title`} className="settings-subpage-title">
            {title}
          </h2>
          <span className="settings-detail-header-spacer" aria-hidden="true" />
        </div>
        <div className="settings-subpage-body">
          {description && <div className="settings-confirm-description">{description}</div>}
          {children}
        </div>
      </section>
    );
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-confirm-overlay" />
        <DialogPrimitive.Content
          className="settings-confirm-dialog"
          style={{ maxWidth, width: "92vw" }}
          aria-describedby={description ? `${id}-description` : undefined}
        >
          {icon && (
            <div className="settings-confirm-icon-wrap" aria-hidden="true">
              {icon}
            </div>
          )}
          <DialogPrimitive.Title className="settings-confirm-title">{title}</DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description
              id={`${id}-description`}
              className="settings-confirm-description"
            >
              {description}
            </DialogPrimitive.Description>
          )}
          {children}
          {closeLabel && (
            <div className="settings-confirm-actions">
              <Button
                variant="secondary"
                leadingIcon={null}
                trailingIcon={null}
                onClick={() => onOpenChange(false)}
              >
                {closeLabel}
              </Button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
