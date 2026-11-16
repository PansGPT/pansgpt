import type { QuizAnswer, QuizAttempt } from "@pansgpt/types";
type Draft = { revision: number; answers: QuizAnswer[]; flagged_ids: string[] };
// Transient navigation recovery, scoped by authenticated owner/university. Never persisted as a score.
const drafts = new Map<string, Draft>();
const key = (scope: string, id: string): string => `${scope}:${id}`;
export function readQuizDraft(scope: string, attempt: QuizAttempt): Draft | undefined {
  const draft = drafts.get(key(scope, attempt.id));
  return attempt.status === "in_progress" && draft?.revision === attempt.revision
    ? draft
    : undefined;
}
export function rememberQuizDraft(scope: string, id: string, draft: Draft): void {
  drafts.set(key(scope, id), draft);
}
export function forgetQuizDraft(scope: string, id: string): void {
  drafts.delete(key(scope, id));
}
export function confirmQuizDraft(
  scope: string,
  id: string,
  previousRevision: number,
  revision: number,
  signature: string
): void {
  const draft = drafts.get(key(scope, id));
  if (!draft || draft.revision !== previousRevision) return;
  if (JSON.stringify([draft.answers, draft.flagged_ids]) === signature) forgetQuizDraft(scope, id);
  else rememberQuizDraft(scope, id, { ...draft, revision });
}
export function retainQuizDrafts(scope?: string): void {
  for (const id of drafts.keys()) if (!scope || !id.startsWith(`${scope}:`)) drafts.delete(id);
}
