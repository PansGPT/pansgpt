import { ScanLine } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
export default function FocusPage(): React.ReactElement {
  return (
    <ComingSoon
      title="A quieter space to focus"
      description="Focused study sessions are on their way. Start with something from your library while we get this space ready."
      icon={ScanLine}
    />
  );
}
