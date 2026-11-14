const { test, expect } = require("@playwright/test");
const path = require("node:path");
const root = path.resolve(__dirname, "../../../../");
test("overview priorities lead to the filtered queue and respect faculty permissions", async ({
  page,
}) => {
  await page.goto("/admin-preview?role=senior");
  await expect(
    page.getByRole("heading", { name: "3 materials need your review.", exact: true })
  ).toBeVisible();
  await expect(page.getByText("Material approved", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Workspace shortcuts", exact: true })
  ).toBeVisible();
  await page.getByRole("link", { name: "Review submissions", exact: true }).click();
  await expect(page).toHaveURL(/status=pending_review/);
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue("pending_review");
  await page.goto("/admin-preview?role=lecturer");
  await expect(
    page.getByRole("link", { name: "Open your submissions", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Review submissions", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Student access", exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Refresh overview", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("invitation creation exposes the shareable link without claiming an email was sent", async ({
  page,
}) => {
  await page.goto("/admin-preview/lecturers");
  await page.getByRole("button", { name: "Invite lecturer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Lecturer email", exact: true })
    .fill("sample-faculty@example.invalid");
  await page.getByLabel("Reason for this change").fill("Sample faculty invitation for review.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Invitation link")).toHaveValue(
    "https://example.invalid/signup?invite=sample-preview-only"
  );
  await expect(page.getByText(/email sent/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Invitations", exact: true })
    .click();
  await page.getByRole("button", { name: "sample-faculty@example.invalid", exact: true }).click();
  await page.getByRole("button", { name: "Revoke invitation", exact: true }).click();
  await page
    .getByLabel("Reason for this change")
    .fill("Sample invitation withdrawn before acceptance.");
  await page.getByRole("button", { name: "Revoke invitation", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "sample-faculty@example.invalid" })
  ).toContainText("Cancelled");
});
test("university setup reviews allocations and preserves details when going back", async ({
  page,
}) => {
  await page.goto("/admin-preview/universities?role=super_admin");
  await page.getByRole("button", { name: "Add university", exact: true }).click();
  for (const [name, value] of [
    ["University name", "Synthetic Review University"],
    ["Short name", "SRU"],
    ["URL slug", "synthetic-review"],
    ["Initial senior administrator", "senior@example.invalid"],
    ["Storage allocation (GiB)", "2.5"],
  ]) {
    await page
      .getByRole(name.includes("GiB") ? "spinbutton" : "textbox", { name, exact: true })
      .fill(value);
  }
  await page
    .getByLabel("Reason for this change")
    .fill("Review the synthetic university allocation.");
  await page.getByRole("button", { name: "Review setup", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Review university setup", exact: true })
  ).toBeVisible();
  await expect(page.getByText("2.5 GiB", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to details", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "University name", exact: true })).toHaveValue(
    "Synthetic Review University"
  );
  await page.getByRole("button", { name: "Review setup", exact: true }).click();
  await page.getByRole("button", { name: "Create university", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Invitation ready", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Synthetic Review University" })
  ).toBeVisible();
});
test("live transport failures preserve form values and never use sample data", async ({ page }) => {
  const row = {
    id: "019a7b20-1000-7000-8000-000000000001",
    title: "Network test material",
    subtitle: "PCL 401",
    status: "pending_review",
    updated_at: "2026-11-13T09:20:00+00:00",
    fields: { course_code: "PCL 401", processing: "pending" },
    actions: ["approve", "reject"],
  };
  let failed = true;
  await page.route("**/api/governance/**", (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/identity"))
      return route.fulfill({
        json: {
          user_id: "synthetic-test-user",
          name: "Synthetic network tester",
          role: "senior",
          university_id: "synthetic-university",
          university_name: "Network Test University",
          resources: ["materials"],
        },
      });
    if (route.request().method() === "POST")
      return route.fulfill(
        failed
          ? { status: 503, json: { detail: "Synthetic service outage. Retry this change." } }
          : { json: { id: row.id, message: "Network test change saved." } }
      );
    return route.fulfill({ json: { items: [row], total: 1, page: 1, page_size: 20 } });
  });
  await page.goto("/admin-preview/materials?transport=network-test");
  await page.getByRole("button", { name: "Network test material", exact: true }).click();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page
    .getByLabel("Reason for this change")
    .fill("Preserve this review reason after a service failure.");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Synthetic service outage");
  await expect(page.getByLabel("Reason for this change")).toHaveValue(
    "Preserve this review reason after a service failure."
  );
  await expect(page.getByText("Principles of clinical pharmacology")).toHaveCount(0);
  failed = false;
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Network test change saved.");
});
test("senior workspace reviews materials with a recorded reason", async ({ page }) => {
  await page.goto("/admin-preview");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(page.getByText("Sample workspace · Changes reset on refresh")).toBeVisible();
  await page.screenshot({
    path: path.join(root, ".tmp/admin-qa/overview-desktop.png"),
    fullPage: true,
  });
  await page.getByRole("navigation").getByRole("link", { name: "Materials", exact: true }).click();
  await page
    .getByRole("button", { name: "Principles of clinical pharmacology", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await page
    .getByLabel("Reason for this change")
    .fill("Please correct the clinical references before approval.");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("Sample change saved");
  await expect(
    page.getByRole("row").filter({ hasText: "Principles of clinical pharmacology" })
  ).toContainText("Rejected");
});
test("search, filters and pagination preserve the directory", async ({ page }) => {
  await page.goto("/admin-preview/students");
  await expect(page.getByText("1–20 of 28 records")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("21–28 of 28 records")).toBeVisible();
  await page.getByLabel("Search students").fill("Sample Student 03");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Sample Student 03" })).toContainText(
    "Suspended"
  );
  await page.getByLabel("Status", { exact: true }).selectOption("active");
  await expect(page.getByRole("heading", { name: "No matching records" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByText("1–20 of 28 records")).toBeVisible();
});
test("batch student changes report each result", async ({ page }) => {
  await page.goto("/admin-preview/students");
  await page.getByLabel("Select Sample Student 01", { exact: true }).check();
  await page.getByLabel("Select Sample Student 02", { exact: true }).check();
  await page.getByRole("button", { name: "Update selected", exact: true }).click();
  await page
    .getByLabel("Reason for this change")
    .fill("Synthetic subscription access verification.");
  await page.getByRole("button", { name: "Apply to 2 students", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("Updated", { exact: true })).toHaveCount(2);
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Sample Student 01" })).toContainText("pro");
});
test("standard administrators cannot enter senior or platform directories", async ({ page }) => {
  await page.goto("/admin-preview?role=standard");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Students", exact: true })
  ).toHaveCount(0);
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Administrators", exact: true })
  ).toHaveCount(0);
  await page.goto("/admin-preview/terms?role=standard");
  await expect(page.getByRole("heading", { name: "This page isn’t available" })).toBeVisible();
});
test("lecturer corrections upload and retain the original review", async ({ page }) => {
  await page.goto("/admin-preview/materials?role=lecturer");
  await page.getByRole("button", { name: "Sample lecture handout", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Please add the course objectives and improve the scanned page quality.")
  ).toBeVisible();
  await page.getByRole("button", { name: "Submit correction", exact: true }).click();
  await page.getByLabel("Material file").setInputFiles({
    name: "sample-correction.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("synthetic test file"),
  });
  await page
    .getByLabel("Reason for this change")
    .fill("Corrected page quality and added the course objectives.");
  await page.getByRole("button", { name: "Upload material", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Sample lecture handout", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Submit correction", exact: true })).toHaveCount(0);
});
test("mobile navigation, keyboard dialogs, and all semantic themes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin-preview?role=senior");
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: path.join(root, ".tmp/admin-qa/overview-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByLabel("Appearance").selectOption("dark");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Class timetable", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Menu", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  await page.getByRole("button", { name: "Add class", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const mobileLayout = await page.evaluate(() => ({
    viewport: innerWidth,
    width: document.documentElement.scrollWidth,
    overflowing: [...document.querySelectorAll("body *")]
      .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
      .map((element) => ({
        tag: element.tagName,
        className: element.className,
        right: element.getBoundingClientRect().right,
      }))
      .slice(0, 12),
  }));
  expect(mobileLayout.width, JSON.stringify(mobileLayout)).toBeLessThanOrEqual(
    mobileLayout.viewport
  );
  await page.screenshot({
    path: path.join(root, ".tmp/admin-qa/timetable-mobile-dark.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await page.getByLabel("Appearance").selectOption("sepia");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
});
test("platform navigation retains its role and has configuration review", async ({ page }) => {
  await page.goto("/admin-preview?role=super_admin");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "AI configuration", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "AI configuration", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Configuration proposal", exact: true }).click();
  await expect(page.getByRole("button", { name: "Approve", exact: true })).toBeVisible();
});
test("all academic and governance sections render without runtime errors", async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const section of [
    "universities",
    "lecturers",
    "administrators",
    "invitations",
    "materials",
    "timetable",
    "exams",
    "restrictions",
    "knowledge",
    "terms",
    "support",
    "audit",
    "settings",
    "analytics",
    "help",
  ]) {
    await page.goto(`/admin-preview/${section}?role=super_admin`);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("status", { name: "Loading workspace" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
  }
  expect(errors).toEqual([]);
});
