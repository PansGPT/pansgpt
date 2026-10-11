"use client";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../utils";
import { Button } from "./button";
import { CalendarDateAsset } from "./date-assets";
export type CalendarEventDetailsProps = Omit<ComponentProps<"div">, "title"> & {
  title: ReactNode;
  date: ReactNode;
  time: ReactNode;
  reminder?: ReactNode;
  guests?: ReactNode;
  guestSummary?: ReactNode;
  description?: ReactNode;
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
};
export function CalendarEventDetails({
  title,
  date,
  time,
  reminder,
  guests,
  guestSummary,
  description,
  onCopy,
  onDelete,
  onEdit,
  className,
  ...props
}: CalendarEventDetailsProps): React.ReactElement {
  return (
    <div {...props} className={cn("p-calendar-event-details", className)}>
      <div className="p-calendar-event-details-heading">
        <strong>{title}</strong>
        <div className="p-calendar-event-details-actions">
          <Button
            iconOnly
            size="sm"
            variant="tertiary"
            aria-label="Copy event"
            leadingIcon={<CalendarDateAsset name="source28_imgCopy01" />}
            disabled={!onCopy}
            onClick={onCopy}
          />
          <Button
            iconOnly
            size="sm"
            variant="tertiary"
            aria-label="Delete event"
            leadingIcon={<CalendarDateAsset name="source28_imgTrash01" />}
            disabled={!onDelete}
            onClick={onDelete}
          />
          <Button
            iconOnly
            size="sm"
            variant="tertiary"
            aria-label="Edit event"
            leadingIcon={<CalendarDateAsset name="source28_imgEdit01" />}
            disabled={!onEdit}
            onClick={onEdit}
          />
        </div>
      </div>
      <div className="p-calendar-event-details-metadata">
        <span>
          <CalendarDateAsset name="source28_imgCalendar" />
          {date}
        </span>
        <span>
          <CalendarDateAsset name="source28_imgClock" />
          {time}
        </span>
        {reminder && (
          <span>
            <CalendarDateAsset name="source28_imgBellRinging01" />
            {reminder}
          </span>
        )}
      </div>
      {guests && <div className="p-calendar-event-details-guests">{guests}</div>}
      {guestSummary && <div className="p-calendar-event-details-summary">{guestSummary}</div>}
      {description && (
        <div className="p-calendar-event-details-description">
          <strong>About this event</strong>
          {description}
        </div>
      )}
    </div>
  );
}
