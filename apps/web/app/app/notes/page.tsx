import { NotebookPen } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
export default function NotesPage(): React.ReactElement {
  return (
    <ComingSoon
      title="Make room for your ideas"
      description="A home for your notes is on its way. Your library is ready whenever you are."
      icon={NotebookPen}
    />
  );
}
