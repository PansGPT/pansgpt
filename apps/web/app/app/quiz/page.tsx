import { Suspense } from "react";
import { QuizWorkspace } from "@/components/quiz/workspace";
export default function QuizPage(): React.ReactElement {
  return (
    <Suspense fallback={<p role="status">Opening your practice space…</p>}>
      <QuizWorkspace />
    </Suspense>
  );
}
