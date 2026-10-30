"use client";
import { createContext, useContext } from "react";

export const WorkspaceNavigationContext = createContext<((opener: HTMLElement) => void) | null>(
  null
);

/** Page-specific mobile headers share the shell's controlled navigation drawer. */
export function useWorkspaceNavigation(): (opener: HTMLElement) => void {
  const open = useContext(WorkspaceNavigationContext);
  if (!open) throw new Error("Workspace navigation requires the authenticated app shell.");
  return open;
}
