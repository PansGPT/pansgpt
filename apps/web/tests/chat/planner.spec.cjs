const { test, expect } = require("@playwright/test");

function task(index, completed = false) {
  return {
    id: `0192d194-28b3-7d24-811c-${String(index + (completed ? 1000 : 0)).padStart(12, "0")}`,
    title: `${completed ? "Completed" : "Active"} task ${index}`,
    subtitle: null,
    course_code: null,
    task_type: "custom",
    due_date: null,
    due_time: null,
    is_completed: completed,
    is_favorite: false,
    completed_at: completed ? "2026-11-05T08:00:00Z" : null,
    source: "custom",
    created_at: "2026-11-05T00:00:00Z",
  };
}

async function setup(page, rows) {
  const state = {
    rows,
    pages: [],
    writes: [],
    heldId: null,
    release: null,
    failHeld: false,
    pageFailure: false,
  };
  await page.addInitScript(() => localStorage.setItem("pansgpt-theme", "dark"));
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.pathname === "/api/v1/tasks/page") {
      if (state.pageFailure)
        return route.fulfill({ status: 503, json: { detail: "Synthetic task storage outage" } });
      const completed = url.searchParams.get("state") === "completed";
      const offset = Number(url.searchParams.get("offset")),
        limit = Number(url.searchParams.get("limit"));
      state.pages.push(`${completed ? "completed" : "active"}:${offset}`);
      const all = state.rows.filter((row) => row.is_completed === completed);
      return route.fulfill({
        json: {
          items: all.slice(offset, offset + limit),
          next_offset: all.length > offset + limit ? offset + limit : null,
        },
      });
    }
    if (url.pathname.startsWith("/api/v1/tasks/") && request.method() === "PATCH") {
      const id = url.pathname.split("/").at(-1),
        patch = request.postDataJSON();
      state.writes.push({ id, patch });
      if (state.heldId === id) {
        state.heldId = null;
        await new Promise((resolve) => {
          state.release = resolve;
        });
        if (state.failHeld)
          return route.fulfill({ status: 503, json: { detail: "Synthetic save outage" } });
      }
      const row = state.rows.find((value) => value.id === id);
      Object.assign(row, patch);
      if ("is_completed" in patch)
        row.completed_at = patch.is_completed ? "2026-11-05T09:01:00Z" : null;
      return route.fulfill({ json: row });
    }
    if (url.pathname.startsWith("/api/v1/tasks/") && request.method() === "GET") {
      const row = state.rows.find((value) => value.id === url.pathname.split("/").at(-1));
      return row
        ? route.fulfill({ json: row })
        : route.fulfill({ status: 404, json: { detail: "Task not found." } });
    }
    return route.fulfill({ json: { sessions: [], total: 0 } });
  });
  await page.goto("/app?modal=planner&tab=tasks");
  await expect(page.getByRole("dialog", { name: "Study planner", exact: false })).toBeVisible();
  return state;
}

test("active and completed tasks remain accessible beyond the old combined 200-row limit", async ({
  page,
}) => {
  await setup(page, [
    ...Array.from({ length: 120 }, (_, i) => task(i)),
    ...Array.from({ length: 230 }, (_, i) => task(i, true)),
  ]);
  await expect(page.getByRole("button", { name: "Active task 0", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load more active tasks", exact: true }).click();
  await expect(page.getByRole("button", { name: "Active task 119", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Load more active tasks", exact: true })
  ).toHaveCount(0);
  await page.locator(".planner-tasks-completed-toggle").click();
  await page.getByRole("button", { name: "Load more completed tasks", exact: true }).click();
  await expect(page.getByRole("button", { name: "Completed task 199", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load more completed tasks", exact: true }).click();
  await expect(page.getByRole("button", { name: "Completed task 229", exact: true })).toBeVisible();
  await expect(page.locator(".planner-task-row")).toHaveCount(350);
  await page.getByRole("button", { name: "Active task 119", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`taskId=${task(119).id}`));
  await page.reload();
  await expect(page.getByLabel("Task title", { exact: true })).toHaveValue("Active task 119");
});

test("a delayed failed edit preserves another task's saved change and retries the intended edit", async ({
  page,
}) => {
  const state = await setup(page, [task(0), task(1)]);
  state.heldId = task(0).id;
  state.failHeld = true;
  await page.getByRole("button", { name: "Active task 0", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Retried title");
  await page.getByLabel("Task title", { exact: true }).press("Enter");
  await expect.poll(() => typeof state.release).toBe("function");
  await page.getByRole("button", { name: "Active task 1", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Another saved title");
  await page.getByLabel("Task title", { exact: true }).press("Enter");
  await expect.poll(() => state.rows[1].title).toBe("Another saved title");
  state.release();
  await expect(page.getByRole("alert")).toContainText("Failed to save task update");
  await expect(
    page.getByRole("button", { name: "Another saved title", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Active task 0", exact: true })).toBeVisible();
  state.failHeld = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retried title", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Another saved title", exact: true })
  ).toBeVisible();
});

test("a saved title response does not erase an unsaved notes draft", async ({ page }) => {
  const state = await setup(page, [task(0)]);
  state.heldId = task(0).id;
  await page.getByRole("button", { name: "Active task 0", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Saved title");
  await page.getByLabel("Task title", { exact: true }).press("Enter");
  await expect.poll(() => typeof state.release).toBe("function");
  await page.getByLabel("Task notes", { exact: true }).fill("Unsaved notes draft");
  state.release();
  await expect.poll(() => state.rows[0].title).toBe("Saved title");
  await expect(page.getByLabel("Task notes", { exact: true })).toHaveValue("Unsaved notes draft");
  await page.getByLabel("Task notes", { exact: true }).press("Tab");
  await expect.poll(() => state.rows[0].subtitle).toBe("Unsaved notes draft");
});

test("account changes discard pending task UI and reject late previous-account results", async ({
  page,
}) => {
  const state = await setup(page, [task(0)]);
  state.heldId = task(0).id;
  await page.getByRole("button", { name: "Active task 0", exact: true }).click();
  await page.getByLabel("Task title", { exact: true }).fill("Old account edit");
  await page.getByLabel("Task title", { exact: true }).press("Enter");
  await expect.poll(() => typeof state.release).toBe("function");
  const oldRow = state.rows[0];
  state.rows = [];
  await page.evaluate(() =>
    window.__changePreviewAccount({
      id: "00000000-0000-4000-8000-000000000099",
      university_id: "00000000-0000-4000-8000-000000000098",
    })
  );
  await expect(page.getByRole("heading", { name: "No tasks yet", exact: true })).toBeVisible();
  // Complete the held old-account response without making it part of the new owner's data.
  state.rows = [oldRow];
  state.release();
  await expect(page.getByText("Old account edit", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Task details", exact: true })).toHaveCount(
    0
  );
});

test("a task loading failure is distinct from a genuine empty list and can retry", async ({
  page,
}) => {
  const state = await setup(page, []);
  await expect(page.getByRole("heading", { name: "No tasks yet", exact: true })).toBeVisible();
  state.pageFailure = true;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Synthetic task storage outage");
  await expect(page.getByRole("heading", { name: "No tasks yet", exact: true })).toHaveCount(0);
  state.pageFailure = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No tasks yet", exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
