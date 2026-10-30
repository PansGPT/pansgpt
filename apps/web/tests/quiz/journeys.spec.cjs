const { test, expect } = require("@playwright/test");
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error("Quiz browser error:", error.message));
});
const uid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("capacity wait explains why a zero-progress quiz is not starting", async ({ page }) => {
  const state = await setup(page);
  Object.assign(state.job, {
    status: "queued",
    generated_count: 0,
    can_start: false,
    current_step: "Waiting for AI service capacity",
  });
  await page.goto(`/app/quiz?job=${uid(2)}`);
  await expect(page.getByText("Waiting for AI service", { exact: true })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("not a personal quiz allowance");
  await expect(page.getByText("Waiting to begin", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
});
for (const current_step of [
  "Waiting for AI service recovery",
  "Waiting for quiz service connection",
])
  test(`${current_step} does not blame a usage limit`, async ({ page }) => {
    const state = await setup(page);
    Object.assign(state.job, {
      status: "queued",
      generated_count: 0,
      can_start: false,
      current_step,
    });
    await page.goto(`/app/quiz?job=${uid(2)}`);
    await expect(page.getByRole("status")).toContainText("automatic retries are limited");
    await expect(page.getByRole("status")).not.toContainText("usage limit");
  });

async function setup(page, options = {}) {
  const kind = options.kind || "objective";
  const quiz = {
    id: uid(1),
    title: "Pharmacokinetics",
    course_code: "PCL 401",
    topic: "Pharmacokinetics",
    question_type: kind,
    difficulty: "medium",
    count: 5,
    time_limit_sec: options.timed ? 300 : null,
  };
  const job = {
    id: uid(2),
    quiz_id: quiz.id,
    status: "completed",
    can_start: true,
    generated_count: 5,
    target_count: 5,
    current_step: "Ready to begin",
    error_message: null,
  };
  const questions = Array.from({ length: 5 }, (_, i) => ({
    id: uid(10 + i),
    position: i + 1,
    question_type: kind,
    prompt: `Which process describes drug absorption in question ${i + 1}?`,
    options: (kind === "objective"
      ? ["A", "B", "C", "D"]
      : ["multi_select", "statement_matrix"].includes(kind)
        ? ["A", "B", "C", "D", "E"]
        : []
    ).map((id) => ({ id, text: `Pharmacology option ${id}` })),
    points: kind === "statement_matrix" ? 5 : kind === "multi_select" ? 3 : 1,
    concept: "Absorption",
  }));
  const now = Date.now();
  const attempt = {
    id: uid(3),
    quiz,
    questions,
    answers: options.expired
      ? [{ question_id: uid(10), selected_option_ids: ["B"], truth_values: {}, text: "" }]
      : [],
    flagged_ids: [],
    revision: 0,
    status: "in_progress",
    started_at: new Date(now - 10000).toISOString(),
    server_now: new Date(now).toISOString(),
    deadline_at: options.expired
      ? new Date(now - 1000).toISOString()
      : options.timed
        ? new Date(now + 300000).toISOString()
        : null,
    result_id: null,
    generation_job_id: uid(2),
    generation_status: "completed",
  };
  const result = {
    id: uid(4),
    quiz,
    score: 3,
    max_score: 5,
    percentage: 60,
    time_taken_sec: 90,
    completed_at: new Date(now).toISOString(),
    feedback: questions.map((q, i) => ({
      question: q,
      answer: attempt.answers.find((a) => a.question_id === q.id) || {
        question_id: q.id,
        selected_option_ids: [],
        truth_values: {},
        text: "",
      },
      answer_key: {
        choice_ids: kind === "objective" ? ["B"] : [],
        truth_values:
          kind === "statement_matrix"
            ? { A: true, B: false, C: true, D: false, E: true }
            : kind === "true_false"
              ? { A: true }
              : {},
        text: kind === "short_answer" ? "Reference rubric for absorption" : "",
      },
      earned: i < 3 ? 1 : 0,
      explanation:
        "Absorption describes a drug moving into the systemic circulation. Review the route and bioavailability.",
      sources: [
        {
          chunk_id: uid(50),
          document_id: uid(51),
          title: "Synthetic Pharmacology Lecture",
          page: 4,
          excerpt: "Absorption is the transfer of a drug into systemic circulation.",
        },
      ],
      option_grades: [],
      outcome: i < 3 ? "correct" : "incorrect",
    })),
  };
  const state = { attempt, result, job, requests: [], saves: 0, submissions: 0 };
  if (options.generationFailure) {
    job.status = "failed";
    job.can_start = false;
    job.generated_count = 2;
    job.current_step = "Generation stopped";
    job.error_message =
      "Question generation has stopped. Retry this quiz to continue without starting over.";
  }
  if (options.progressive) {
    job.status = "generating";
    job.generated_count = 2;
    job.can_start = !options.timed;
    attempt.questions = questions.slice(0, 2);
    attempt.generation_status = "generating";
  }
  await page.route("**/api/quiz/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      path = url.pathname.replace("/api/quiz", "");
    const json = async (body, status = 200) => route.fulfill({ status, json: body });
    if (options.outage) return json({ detail: "Quiz storage is unavailable. Please retry." }, 503);
    if (req.headers().authorization !== "Bearer synthetic-owner")
      return json({ detail: "No ready course materials were found." }, 403);
    if (path === "/courses")
      return json([
        { code: "PCL 401", title: "Pharmacology", topics: ["Pharmacokinetics"], document_count: 2 },
      ]);
    if (path.startsWith("/history"))
      return json({
        items: options.history
          ? [
              {
                id: result.id,
                quiz_id: quiz.id,
                title: quiz.title,
                course_code: quiz.course_code,
                question_type: kind,
                percentage: 60,
                time_taken_sec: 90,
                completed_at: result.completed_at,
              },
            ]
          : [],
        next_offset: null,
        stats: { completed: options.history ? 1 : 0, average: 60, best: 60, study_seconds: 90 },
        jobs: [],
        active_attempts: [],
      });
    if (path === "/jobs") {
      state.requests.push(req.postDataJSON());
      return json({ ...job, status: "queued", generated_count: 0 }, 202);
    }
    if (path.endsWith("/cancel")) {
      job.status = "cancelled";
      return json(job);
    }
    if (path.endsWith("/retry")) {
      state.retriedJob = path;
      job.status = "completed";
      attempt.generation_status = "completed";
      attempt.questions = questions;
      job.generated_count = 5;
      job.error_message = null;
      job.current_step = "Ready to begin";
      return json(job);
    }
    if (path.startsWith("/jobs/")) return json(job);
    if (path.endsWith("/answers")) {
      const data = req.postDataJSON();
      if (data.revision !== attempt.revision)
        return json({ detail: "This attempt changed in another tab. Reload before editing." }, 409);
      attempt.answers = data.answers;
      attempt.flagged_ids = data.flagged_ids;
      attempt.revision++;
      state.saves++;
      return json(attempt);
    }
    if (path.endsWith("/submit")) {
      state.submissions++;
      if (options.gradingFailure && state.submissions === 1) {
        attempt.status = "grading_failed";
        return json(
          { detail: "Your submitted answers are safe. Grading is unavailable; please retry." },
          503
        );
      }
      attempt.status = "completed";
      attempt.result_id = result.id;
      return json(result);
    }
    if (path.endsWith("/share"))
      return req.method() === "DELETE"
        ? route.fulfill({ status: 204 })
        : json({ token: "synthetic-capability-token-with-43-characters" });
    if (path.startsWith("/results/")) return json(result);
    if (path.startsWith("/quizzes/") || path.startsWith("/attempts/"))
      return json({ ...attempt, server_now: new Date().toISOString() });
    return json({ detail: "Unexpected test request" }, 404);
  });
  return state;
}

test("stopped generation can retry the same request without promising automatic retries", async ({
  page,
}) => {
  const state = await setup(page, { generationFailure: true });
  await page.goto(`/app/quiz?job=${uid(2)}`);
  await expect(page.getByRole("button", { name: "Retry this quiz", exact: true })).toBeVisible();
  await expect(page.locator(".quiz-generation")).not.toContainText("will retry automatically");
  await page.getByRole("button", { name: "Retry this quiz", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiz ready" })).toBeVisible();
  expect(state.retriedJob).toBe(`/jobs/${uid(2)}/retry`);
  expect(state.requests).toHaveLength(0);
});

test("multi-select enforces three choices without treating omissions as false", async ({
  page,
}) => {
  const state = await setup(page, { kind: "multi_select" });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  for (const name of ["A", "C", "E"])
    await page
      .getByRole("checkbox", { name: `${name} Pharmacology option ${name}`, exact: true })
      .check();
  await expect(
    page.getByRole("checkbox", { name: "B Pharmacology option B", exact: true })
  ).toBeDisabled();
  await expect.poll(() => state.attempt.answers[0]?.selected_option_ids).toEqual(["A", "C", "E"]);
  await page.getByRole("checkbox", { name: "A Pharmacology option A", exact: true }).uncheck();
  await expect(
    page.getByRole("checkbox", { name: "B Pharmacology option B", exact: true })
  ).toBeEnabled();
});

test("single false response is saved as an answer", async ({ page }) => {
  const state = await setup(page, { kind: "true_false" });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await page.getByRole("button", { name: "False", exact: true }).click();
  await expect.poll(() => state.attempt.answers[0]?.truth_values.A).toBe(false);
  await expect(page.getByRole("heading", { name: "1 / 5", exact: true })).toBeVisible();
});

test("stale revisions show recovery and never submit unsaved changes", async ({ page }) => {
  const state = await setup(page);
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await expect(
    page.getByRole("radio", { name: "A Pharmacology option A", exact: true })
  ).toBeVisible();
  state.attempt.revision = 3;
  await page.getByRole("radio", { name: "B Pharmacology option B", exact: true }).check();
  await expect(page.getByRole("alert")).toContainText("changed in another tab");
  await page.getByRole("button", { name: "Question 5", exact: true }).click();
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await page.getByRole("button", { name: "Submit answers", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("changed in another tab");
  expect(state.submissions).toBe(0);
});

test("account change clears the previous practice state", async ({ page }) => {
  await setup(page, { history: true });
  await page.goto("/app/quiz");
  await expect(page.locator(".quiz-history-row")).toHaveCount(1);
  await page.evaluate(() => {
    window.__quizOwner = "another-synthetic-owner";
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.getByRole("alert")).toContainText("No ready course materials");
  await expect(page.locator(".quiz-history-row")).toHaveCount(0);
});

test("builder, generation, taking, review and deliberate sharing", async ({ page }) => {
  const state = await setup(page);
  await page.goto("/app/quiz");
  await expect(page.getByRole("heading", { name: "Quizzes" })).toBeVisible();
  await page.getByRole("button", { name: "New quiz", exact: true }).click();
  await page.getByLabel("Topic", { exact: false }).fill("Pharmacokinetics");
  await page.getByRole("radio", { name: "5 questions", exact: true }).check();
  await page.getByRole("button", { name: "Create quiz", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiz ready" })).toBeVisible();
  expect(state.requests[0]).toMatchObject({
    course_code: "PCL 401",
    count: 5,
    question_type: "objective",
    time_limit_sec: null,
  });
  await page.getByRole("button", { name: "Start quiz", exact: true }).click();
  await page.getByRole("radio", { name: "B Pharmacology option B", exact: true }).check();
  await expect.poll(() => state.saves).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Flag for review", exact: true }).click();
  await page.getByRole("button", { name: "Question 5", exact: true }).click();
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("4 questions are unanswered");
  await page.getByRole("button", { name: "Submit answers", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiz results" })).toBeVisible();
  await page.getByRole("button", { name: "Missed (2)", exact: true }).click();
  await expect(page.locator(".quiz-review-card")).toHaveCount(2);
  await expect(page.getByText("Synthetic Pharmacology Lecture").first()).toBeVisible();
  await page.getByRole("button", { name: "Share result", exact: true }).click();
  await expect(page.getByLabel("Share link")).toHaveValue(/\/quiz\/share#/);
  await page.getByRole("button", { name: "Revoke links", exact: true }).click();
  await expect(page.getByText("All share links for this result have been revoked.")).toBeVisible();
  await page.screenshot({ path: "test-results/quiz-results-desktop.png", fullPage: true });
});

test("refresh resumes saved answer, flag and original deadline", async ({ page }) => {
  const state = await setup(page, { timed: true });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await page.getByRole("radio", { name: "B Pharmacology option B", exact: true }).check();
  await page.getByRole("button", { name: "Flag for review", exact: true }).click();
  await expect.poll(() => state.attempt.flagged_ids.length).toBe(1);
  const deadline = state.attempt.deadline_at;
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "B Pharmacology option B", exact: true })
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Flagged for review", exact: true })
  ).toHaveAttribute("aria-pressed", "true");
  expect(state.attempt.deadline_at).toBe(deadline);
});

test("false and unanswered are distinct matrix decisions", async ({ page }) => {
  const state = await setup(page, { kind: "statement_matrix" });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await page.getByRole("button", { name: "False", exact: true }).first().click();
  await expect.poll(() => state.attempt.answers[0]?.truth_values.A).toBe(false);
  await page.getByRole("button", { name: "Clear statement A", exact: true }).click();
  await expect.poll(() => state.attempt.answers[0]?.truth_values.A).toBeUndefined();
});

test("written grading failure freezes answers and permits a safe retry", async ({ page }) => {
  const state = await setup(page, { kind: "short_answer", gradingFailure: true });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await page.getByLabel("Your answer").fill("An accurate explanation in my own words.");
  await expect.poll(() => state.saves).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Question 5", exact: true }).click();
  await page.getByRole("button", { name: "Finish quiz", exact: true }).click();
  await page.getByRole("button", { name: "Submit answers", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry grading", exact: true })).toBeVisible();
  await expect(page.getByLabel("Your answer")).toBeDisabled();
  await page.getByRole("button", { name: "Retry grading", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiz results" })).toBeVisible();
  expect(state.submissions).toBe(2);
});

test("expired server deadline submits only the saved snapshot once", async ({ page }) => {
  const state = await setup(page, { expired: true });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await expect(page.getByRole("heading", { name: "Quiz results" })).toBeVisible();
  expect(state.submissions).toBe(1);
  expect(state.saves).toBe(0);
});

test("unavailable live data is shown as an error without synthetic history", async ({ page }) => {
  await setup(page, { outage: true });
  await page.goto("/app/quiz");
  await expect(page.getByRole("alert")).toContainText("Quiz storage is unavailable");
  await expect(page.getByRole("button", { name: "New quiz", exact: true })).toBeDisabled();
});

for (const theme of ["light", "dark", "sepia"])
  test(`${theme} desktop and mobile layouts, modal focus and overflow`, async ({ page }) => {
    await setup(page, { history: true });
    await page.goto(`/app/quiz?theme=${theme}`);
    await expect(page.locator(".quiz-history-row")).toHaveCount(1);
    await expect(page.getByRole("button", { name: "New quiz", exact: true })).toBeEnabled();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `test-results/quiz-dashboard-${theme}-desktop.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "New quiz", exact: true }).click();
    await page.screenshot({
      path: `test-results/quiz-builder-${theme}-desktop.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/quiz-dashboard-${theme}-mobile.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "New quiz", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("radio", { name: "Written response", exact: false }).check();
    await expect(page.getByLabel("Points per answer")).toContainText("0.5");
    await expect(
      page.getByText("Accurate answers in your own words", { exact: false })
    ).toBeVisible();
    await expect(page.getByText("Go at your own pace", { exact: true })).toBeVisible();
    await page.getByRole("combobox", { name: "Time limit", exact: true }).selectOption("600");
    await expect(page.getByText("10 minutes, once you start", { exact: true })).toBeVisible();
    await expect(page.getByText("It keeps running if you leave.", { exact: false })).toBeVisible();
    await expect
      .poll(() =>
        page.getByRole("dialog").evaluate((dialog) => {
          const bounds = dialog.getBoundingClientRect();
          return (
            bounds.left >= 0 &&
            bounds.right <= innerWidth &&
            dialog.scrollWidth <= dialog.clientWidth
          );
        })
      )
      .toBe(true);
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        document.querySelector('[role="dialog"]').contains(document.activeElement)
      )
    ).toBe(true);
    await page.screenshot({
      path: `test-results/quiz-builder-${theme}-mobile.png`,
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

test("legacy partial attempts still resume saved answers and revisions", async ({ page }) => {
  const state = await setup(page, { progressive: true });
  await page.goto(`/app/quiz?attempt=${uid(3)}`);
  await page.getByRole("radio", { name: "B Pharmacology option B", exact: true }).check();
  await expect.poll(() => state.saves).toBe(1);
  await expect(
    page.getByRole("button", { name: "Question 3, preparing", exact: true })
  ).toBeDisabled();
  state.attempt.questions = [
    ...state.attempt.questions,
    {
      ...state.attempt.questions[0],
      id: uid(12),
      position: 3,
      prompt: "Describe hepatic metabolism.",
    },
  ];
  await expect(page.getByRole("button", { name: "Question 3", exact: true })).toBeEnabled();
  await expect(
    page.getByRole("radio", { name: "B Pharmacology option B", exact: true })
  ).toBeChecked();
  await page.getByRole("button", { name: "Flag for review", exact: true }).click();
  await expect.poll(() => state.saves).toBe(2);
  expect(state.attempt.revision).toBe(2);
  await page.getByRole("button", { name: "Question 3", exact: true }).click();
  await expect(page.getByRole("button", { name: "Loading questions", exact: true })).toBeDisabled();
  state.attempt.generation_status = "failed";
  await page.getByRole("button", { name: "Retry remaining questions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Question 5", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Question 1, flagged", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "B Pharmacology option B", exact: true })
  ).toBeChecked();
  expect(state.attempt.revision).toBe(2);
});

test("timed generation has no early start action", async ({ page }) => {
  await setup(page, { progressive: true, timed: true });
  await page.goto(`/app/quiz?job=${uid(2)}`);
  await expect(page.getByRole("progressbar", { name: "Questions prepared" })).toHaveAttribute(
    "aria-valuenow",
    "2"
  );
  await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
});

test("single form exposes settings and scoring without setup steps", async ({ page }) => {
  const state = await setup(page, { history: true });
  await page.goto("/app/quiz");
  await expect(page.locator(".quiz-intro-card")).toHaveCount(0);
  await page.getByRole("button", { name: "New quiz", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Build your quiz", exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Continue", exact: true })).toHaveCount(0);
  await dialog.getByRole("radio", { name: "True / false matrix", exact: false }).check();
  await expect(dialog).toContainText("+1 correct");
  await dialog.getByRole("radio", { name: "15 questions", exact: true }).check();
  await dialog.getByRole("radio", { name: "hard", exact: true }).check();
  await dialog.getByRole("combobox", { name: "Time limit", exact: true }).selectOption("600");
  await expect(dialog).toContainText("keeps running if you leave");
  await dialog.getByRole("button", { name: "Create quiz", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiz ready", exact: true })).toBeVisible();
  expect(state.requests[0]).toMatchObject({
    question_type: "statement_matrix",
    count: 15,
    difficulty: "hard",
    time_limit_sec: 600,
  });
});

for (const theme of ["light", "dark", "sepia"])
  test(`${theme} shareable score card export keeps the results page simple`, async ({ page }) => {
    const state = await setup(page);
    const outcomes =
      theme === "dark"
        ? ["correct", "correct", "correct", "correct", "correct"]
        : theme === "sepia"
          ? ["unanswered", "unanswered", "unanswered", "unanswered", "unanswered"]
          : ["correct", "partial", "incorrect", "unanswered", "unanswered"];
    state.result.feedback.forEach((item, index) => {
      item.outcome = outcomes[index];
    });
    state.result.percentage = theme === "dark" ? 100 : theme === "sepia" ? 0 : 60;
    state.result.score = state.result.percentage / 20;
    if (theme === "dark")
      state.result.quiz.title =
        "Pharmacokinetics: absorption, distribution, metabolism and elimination across different routes of administration";
    await page.goto(`/app/quiz?result=${uid(4)}&theme=${theme}`);
    const card = page.locator(".quiz-result-hero");
    await expect(page.locator(".quiz-score-card")).toHaveCount(0);
    await expect(card.getByRole("img")).toHaveAccessibleName(
      `Score: ${state.result.percentage} percent, ${state.result.score} of 5 points`
    );
    await page.evaluate(() => document.fonts.ready);
    await card.screenshot({ path: `test-results/quiz-score-card-${theme}-desktop.png` });
    {
      const downloaded = page.waitForEvent("download");
      await page.getByRole("button", { name: "Download score card", exact: true }).click();
      const file = await downloaded;
      expect(file.suggestedFilename()).toBe("pansgpt-quiz-result.png");
      await file.saveAs(`test-results/quiz-score-card-export-${theme}.png`);
      const bytes = await require("node:fs/promises").readFile(
        `test-results/quiz-score-card-export-${theme}.png`
      );
      expect(bytes.readUInt32BE(16)).toBe(1200);
      expect(bytes.readUInt32BE(20)).toBe(1000);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        card.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return (
            bounds.left >= 0 &&
            bounds.right <= innerWidth &&
            element.scrollWidth <= element.clientWidth
          );
        })
      )
      .toBe(true);
    await card.screenshot({ path: `test-results/quiz-score-card-${theme}-mobile.png` });
  });

for (const theme of ["light", "dark", "sepia"])
  test(`${theme} preparation screen shows actual queued progress and allows leaving`, async ({
    page,
  }) => {
    const state = await setup(page);
    Object.assign(state.job, {
      status: "queued",
      generated_count: 0,
      target_count: 10,
      can_start: false,
      current_step: "Waiting for a generation worker",
    });
    await page.goto(`/app/quiz?job=${uid(2)}&theme=${theme}`);
    const progress = page.getByRole("progressbar", { name: "Questions prepared" });
    await expect(page.getByText("In queue", { exact: true })).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuenow", "0");
    await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
    await expect(page.locator(".quiz-preparation")).not.toContainText("generation worker");
    await page.screenshot({
      path: `test-results/quiz-preparation-${theme}-desktop.png`,
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.screenshot({
      path: `test-results/quiz-preparation-${theme}-mobile.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Back to quizzes", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Quizzes", exact: true })).toBeVisible();
    expect(state.job.status).toBe("queued");
    await page.goto(`/app/quiz?job=${uid(2)}&theme=${theme}`);
    Object.assign(state.job, { status: "generating", generated_count: 3, can_start: true });
    await expect(progress).toHaveAttribute("aria-valuenow", "3");
    await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
    await expect(
      page.getByText("Your full quiz will be available when all 10 questions are prepared.")
    ).toBeVisible();
    Object.assign(state.job, { status: "completed", generated_count: 10 });
    await expect(page.getByRole("heading", { name: "Quiz ready", exact: true })).toBeVisible();
    await expect(progress).toHaveAttribute("aria-valuenow", "10");
    await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toBeVisible();
    await page.screenshot({
      path: `test-results/quiz-preparation-${theme}-ready-mobile.png`,
      fullPage: true,
    });
  });

test("preparation cancellation stops the request and offers a way back", async ({ page }) => {
  const state = await setup(page);
  Object.assign(state.job, { status: "queued", generated_count: 0, can_start: false });
  await page.goto(`/app/quiz?job=${uid(2)}`);
  await page.getByRole("button", { name: "Cancel generation", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quiz cancelled", exact: true })).toBeVisible();
  expect(state.job.status).toBe("cancelled");
  await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to quizzes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Quizzes", exact: true })).toBeVisible();
});

for (const timed of [false, true])
  test(`${timed ? "timed" : "untimed"} quiz waits for the complete requested set`, async ({
    page,
  }) => {
    const state = await setup(page, { progressive: true, timed });
    await page.goto(`/app/quiz?job=${uid(2)}`);
    await expect(page.getByRole("progressbar", { name: "Questions prepared" })).toHaveAttribute(
      "aria-valuenow",
      "2"
    );
    await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
    // Do not trust an early/stale can_start flag or completed status with missing questions.
    Object.assign(state.job, { status: "completed", can_start: true });
    await expect(page.getByRole("heading", { name: "Preparing quiz", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toHaveCount(0);
    Object.assign(state.job, { generated_count: 5 });
    await expect(page.getByRole("heading", { name: "Quiz ready", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start quiz", exact: true })).toBeVisible();
  });

for (const [kind, label] of [
  ["objective", "MCQ"],
  ["multi_select", "Select 3"],
  ["statement_matrix", "T/F matrix"],
  ["true_false", "T/F"],
  ["short_answer", "Written"],
])
  test(`history shows compact ${kind} type on desktop and mobile`, async ({ page }) => {
    await setup(page, { history: true, kind });
    await page.goto("/app/quiz");
    await expect(page.locator(".quiz-history-row .quiz-history-type")).toHaveText(label);
    await expect(page.locator(".quiz-history-row .quiz-history-type")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator(".quiz-history-row .quiz-history-type-mobile")).toContainText(label);
    await expect(page.locator(".quiz-history-row .quiz-history-type-mobile")).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  });
