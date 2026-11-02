"use client";

import { createContext, useContext } from "react";

export type PlannerTab = "tasks" | "timetable";
export type OpenPlannerModal = (tab: PlannerTab, opener?: HTMLElement) => void;

const PlannerModalContext = createContext<OpenPlannerModal | null>(null);

export const PlannerModalProvider = PlannerModalContext.Provider;

export function useOpenPlannerModal(): OpenPlannerModal {
  const open = useContext(PlannerModalContext);
  if (!open) throw new Error("Planner modals require the authenticated app shell.");
  return open;
}
