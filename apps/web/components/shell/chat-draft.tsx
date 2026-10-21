"use client";
import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
const DraftContext = createContext<{
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
} | null>(null);
export function ChatDraftProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [draft, setDraft] = useState("");
  return <DraftContext.Provider value={{ draft, setDraft }}>{children}</DraftContext.Provider>;
}
export function useChatDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error("Chat drafts require a verified workspace.");
  return context;
}
