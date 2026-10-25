import { Sparkles } from "lucide-react";
import { ComingSoon } from "@/components/shell/coming-soon";
export default function QuizPage(): React.ReactElement {
  return (
    <ComingSoon
      title="A little practice goes a long way"
      description="Your quizzes and revision sessions will live here. For now, keep exploring your course materials."
      icon={Sparkles}
    />
  );
}
