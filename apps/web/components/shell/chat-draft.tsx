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
  revision: number;
  startNewChat: () => void;
} | null>(null);
export function ChatDraftProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [draft, setDraft] = useState("");
  const [revision, setRevision] = useState(0);
  function startNewChat(): void {
    setDraft("");
    setRevision((value) => value + 1);
  }
  return (
    <DraftContext.Provider value={{ draft, setDraft, revision, startNewChat }}>
      {children}
    </DraftContext.Provider>
  );
}
export function useChatDraft() {
  const context = useContext(DraftContext);
  if (!context) throw new Error("Chat drafts require a verified workspace.");
  return context;
}
