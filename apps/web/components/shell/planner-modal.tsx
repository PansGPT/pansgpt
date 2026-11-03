"use client";

import { useId } from "react";
import { CalendarDays, ChevronLeft, ListTodo, X } from "lucide-react";
import { DialogPrimitive } from "@pansgpt/ui/shell";
import type { PlannerTab } from "./planner-modal-context";

export function PlannerModal({
  open,
  title,
  description,
  tab,
  onTabChange,
  onOpenChange,
  onCloseAutoFocus,
  isDetailOpen,
  onBack,
  children,
}: {
  open: boolean;
  title: string;
  description: string;
  tab: PlannerTab;
  onTabChange: (tab: PlannerTab) => void;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  isDetailOpen?: boolean;
  onBack?: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  const descriptionId = useId();
  const tabs = (
    <div
      className="dashboard-agenda-tabs planner-modal-tabs planner-modal-header-tabs"
      role="tablist"
      aria-label="Study planner"
    >
      <button
        type="button"
        role="tab"
        aria-controls="planner-panel"
        aria-selected={tab === "timetable"}
        tabIndex={tab === "timetable" ? 0 : -1}
        className="dashboard-agenda-tab"
        onClick={() => onTabChange("timetable")}
      >
        <CalendarDays size={15} aria-hidden="true" /> Timetable
      </button>
      <button
        type="button"
        role="tab"
        aria-controls="planner-panel"
        aria-selected={tab === "tasks"}
        tabIndex={tab === "tasks" ? 0 : -1}
        className="dashboard-agenda-tab"
        onClick={() => onTabChange("tasks")}
      >
        <ListTodo size={15} aria-hidden="true" /> Tasks
      </button>
    </div>
  );
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="settings-overlay" />
        <DialogPrimitive.Content
          className="settings-modal-dialog planner-modal-dialog"
          aria-describedby={descriptionId}
          onCloseAutoFocus={onCloseAutoFocus}
        >
          <DialogPrimitive.Title className="p-sr-only">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description id={descriptionId} className="p-sr-only">
            {description}
          </DialogPrimitive.Description>
          <button
            type="button"
            className="settings-modal-handle"
            aria-label={`Dismiss ${title.toLowerCase()}`}
            onClick={() => onOpenChange(false)}
          >
            <span />
          </button>
          <header className="settings-modal-header">
            {tabs}
            <button
              type="button"
              className="settings-close-button"
              aria-label={`Close ${title.toLowerCase()}`}
              onClick={() => onOpenChange(false)}
            >
              <X size={18} />
            </button>
          </header>
          <header
            className="settings-mobile-header planner-mobile-header"
            data-detail-open={isDetailOpen}
          >
            {isDetailOpen ? (
              <button
                type="button"
                className="settings-mobile-header-btn planner-mobile-back-btn"
                aria-label="Back to tasks"
                onClick={onBack}
              >
                <ChevronLeft size={20} />
              </button>
            ) : (
              <button
                type="button"
                className="settings-mobile-header-btn"
                aria-label={`Close ${title.toLowerCase()}`}
                onClick={() => onOpenChange(false)}
              >
                <X size={18} />
              </button>
            )}
            {isDetailOpen ? (
              <span className="planner-mobile-header-title">Task details</span>
            ) : (
              tabs
            )}
            <span className="settings-mobile-header-spacer" />
          </header>
          <div className={`planner-modal-body ${tab === "tasks" ? "is-tasks-tab" : ""}`}>
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function PlannerComingSoon({ tab }: { tab: PlannerTab }): React.ReactElement {
  const Icon = tab === "tasks" ? ListTodo : CalendarDays;

  return (
    <div className="planner-coming-soon">
      <span className="planner-coming-soon-icon" aria-hidden="true">
        <Icon size={22} />
      </span>
      <h2>{tab === "tasks" ? "Tasks are coming soon" : "Timetable is coming soon"}</h2>
      <p>We’re working on this section. Please check back soon.</p>
    </div>
  );
}
