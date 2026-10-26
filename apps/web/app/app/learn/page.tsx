import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
export default function Page(): React.ReactElement {
  return (
    <ComingSoon
      title="A little guidance for your next session"
      description="Your guided study resources are on their way. Explore your course library while this space grows."
      icon={BookOpen}
    />
  );
}
