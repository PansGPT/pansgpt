import assert from "node:assert/strict";
import { test } from "node:test";
import {
  rememberQuizDraft,
  readQuizDraft,
  confirmQuizDraft,
  retainQuizDrafts,
} from "../lib/quiz-drafts.ts";
test("navigation drafts are isolated by owner, university, attempt and server revision", () => {
  retainQuizDrafts();
  const draft = {
    revision: 1,
    answers: [{ question_id: "question", selected_option_ids: ["B"], truth_values: {}, text: "" }],
    flagged_ids: [],
  };
  const attempt = { id: "attempt", revision: 1, status: "in_progress" };
  rememberQuizDraft("owner:uni", attempt.id, draft);
  assert.deepEqual(readQuizDraft("owner:uni", attempt), draft);
  assert.equal(readQuizDraft("other:uni", attempt), undefined);
  assert.equal(readQuizDraft("owner:other", attempt), undefined);
  assert.equal(readQuizDraft("owner:uni", { ...attempt, revision: 2 }), undefined);
  assert.equal(readQuizDraft("owner:uni", { ...attempt, status: "completed" }), undefined);
  retainQuizDrafts("other:uni");
  assert.equal(readQuizDraft("owner:uni", attempt), undefined);
});
test("an earlier save preserves newer edits and advances their base revision", () => {
  retainQuizDrafts();
  const answers = [
    { question_id: "question", selected_option_ids: ["B"], truth_values: {}, text: "" },
  ];
  rememberQuizDraft("owner:uni", "attempt", { revision: 1, answers, flagged_ids: ["question"] });
  confirmQuizDraft("owner:uni", "attempt", 1, 2, JSON.stringify([answers, []]));
  assert.deepEqual(
    readQuizDraft("owner:uni", { id: "attempt", revision: 2, status: "in_progress" }).flagged_ids,
    ["question"]
  );
  confirmQuizDraft("owner:uni", "attempt", 1, 99, JSON.stringify([answers, ["question"]]));
  assert.ok(readQuizDraft("owner:uni", { id: "attempt", revision: 2, status: "in_progress" }));
  confirmQuizDraft("owner:uni", "attempt", 2, 3, JSON.stringify([answers, ["question"]]));
  assert.equal(
    readQuizDraft("owner:uni", { id: "attempt", revision: 3, status: "in_progress" }),
    undefined
  );
});
