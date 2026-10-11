"use client";
import { useState, type ComponentProps, type ReactNode } from "react";
import { DropdownMenu } from "radix-ui";
import { cn } from "../utils";
import { Button } from "./button";
import { ButtonGroup, ButtonGroupButton } from "./button-group";
import { DropdownContent } from "./dropdown";
import { CalendarDateAsset } from "./date-assets";
import { CalendarDateIcon } from "./calendar-primitives";
export type CalendarView = "month" | "week" | "day";
const views: readonly CalendarView[] = ["day", "week", "month"];
const viewLabel = (view: CalendarView): string => `${view[0].toUpperCase()}${view.slice(1)} view`;
export type CalendarViewDropdownProps = Omit<ComponentProps<"div">, "onChange"> & {
  value?: CalendarView;
  defaultValue?: CalendarView;
  onValueChange?: (view: CalendarView) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  reference?: boolean;
};
export function CalendarViewDropdown({
  value,
  defaultValue = "month",
  onValueChange,
  open,
  onOpenChange,
  reference,
  className,
  ...props
}: CalendarViewDropdownProps): React.ReactElement {
  const [internal, setInternal] = useState(defaultValue);
  const current = value ?? internal;
  const choose = (view: CalendarView): void => {
    if (value === undefined) setInternal(view);
    onValueChange?.(view);
  };
  const trigger = (
    <Button
      size="md"
      variant="secondary"
      leadingIcon={null}
      trailingIcon={<CalendarDateAsset name="source32_imgChevronDown" />}
      aria-label="Calendar view"
    >
      {viewLabel(current)}
    </Button>
  );
  return (
    <div {...props} data-view={current} className={cn("p-calendar-view-dropdown", className)}>
      {reference ? (
        <>
          {trigger}
          {open && (
            <div
              className="p-calendar-view-reference p-dropdown-menu"
              role="group"
              aria-label="Calendar views"
            >
              {views.map((view) => (
                <button
                  type="button"
                  key={view}
                  className="p-dropdown-item"
                  aria-pressed={view === current}
                  onClick={() => choose(view)}
                >
                  {viewLabel(view)}
                  <span className="p-dropdown-shortcut">{`⌘${view[0].toUpperCase()}`}</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
          <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
          <DropdownContent className="p-calendar-view-menu" aria-label="Calendar views">
            <DropdownMenu.RadioGroup
              value={current}
              onValueChange={(view) => {
                if (views.includes(view as CalendarView)) choose(view as CalendarView);
              }}
            >
              {views.map((view) => (
                <DropdownMenu.RadioItem key={view} value={view} className="p-dropdown-item">
                  {viewLabel(view)}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownContent>
        </DropdownMenu.Root>
      )}
    </div>
  );
}
export type CalendarHeaderProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  supportingText?: ReactNode;
  badge?: ReactNode;
  month?: ReactNode;
  day?: ReactNode;
  breakpoint?: "desktop" | "mobile";
  view?: CalendarView;
  onViewChange?: (view: CalendarView) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onToday?: () => void;
  onSearch?: () => void;
  onAdd?: () => void;
  showViewDropdown?: boolean;
};
export function CalendarHeader({
  title,
  supportingText,
  badge,
  month = "JAN",
  day = 10,
  breakpoint = "desktop",
  view = "month",
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onSearch,
  onAdd,
  showViewDropdown = true,
  className,
  ...props
}: CalendarHeaderProps): React.ReactElement {
  const navigation = (
    <ButtonGroup label="Calendar date navigation" className="p-calendar-date-navigation">
      <ButtonGroupButton
        kind="icon"
        aria-label="Previous period"
        icon={<CalendarDateAsset name="source33_imgArrowLeft" />}
        onClick={onPrevious}
        disabled={!onPrevious}
      />
      <ButtonGroupButton onClick={onToday} disabled={!onToday}>
        Today
      </ButtonGroupButton>
      <ButtonGroupButton
        kind="icon"
        aria-label="Next period"
        icon={<CalendarDateAsset name="source33_imgArrowRight" />}
        onClick={onNext}
        disabled={!onNext}
      />
    </ButtonGroup>
  );
  const search = (
    <Button
      iconOnly
      aria-label="Search events"
      variant="tertiary"
      size="md"
      leadingIcon={
        <CalendarDateAsset
          name={breakpoint === "mobile" ? "source33_imgSearchLg" : "source33_imgPlaceholder"}
        />
      }
      onClick={onSearch}
      disabled={!onSearch}
    />
  );
  return (
    <div {...props} className={cn("p-calendar-header", className)} data-breakpoint={breakpoint}>
      <div className="p-calendar-header-main">
        {breakpoint === "desktop" && <CalendarDateIcon month={month} day={day} />}
        <div className="p-calendar-header-copy">
          <div className="p-calendar-header-title">
            <strong>{title}</strong>
            {badge && <span className="p-calendar-header-badge">{badge}</span>}
          </div>
          {supportingText && <span className="p-calendar-header-supporting">{supportingText}</span>}
        </div>
      </div>
      <div className="p-calendar-header-actions">
        {breakpoint === "desktop" && (
          <>
            {search}
            {navigation}
          </>
        )}
        {showViewDropdown && <CalendarViewDropdown value={view} onValueChange={onViewChange} />}
        <Button
          size="md"
          leadingIcon={<CalendarDateAsset name="source33_imgPlus" />}
          trailingIcon={null}
          onClick={onAdd}
          disabled={!onAdd}
        >
          Add event
        </Button>
        {breakpoint === "mobile" && search}
      </div>
      {breakpoint === "mobile" && navigation}
    </div>
  );
}
