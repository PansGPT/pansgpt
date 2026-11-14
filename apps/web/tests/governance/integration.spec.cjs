const { test, expect } = require("@playwright/test");
test("real frontend, bearer-authenticated FastAPI and PostgreSQL complete review and account updates", async ({
  page,
}) => {
  test.skip(
    process.env.GOVERNANCE_E2E !== "1",
    "Requires the explicit disposable PostgreSQL integration configuration."
  );
  await page.goto("/admin-preview/materials?integration=1");
  await expect(
    page.getByText("Integration Test University", { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByText("Sample workspace · Changes reset on refresh")).toHaveCount(0);
  await page.getByRole("button", { name: "Integration review material", exact: true }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page
    .getByLabel("Reason for this change")
    .fill("Verified synthetic course material through the real API.");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("row").filter({ hasText: "Integration review material" })
  ).toContainText("Active");
  await page.getByRole("navigation").getByRole("link", { name: "Students", exact: true }).click();
  await page.getByRole("button", { name: "Integration Student", exact: true }).click();
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  await page.getByLabel("Subscription", { exact: true }).selectOption("pro");
  await page
    .getByLabel("Reason for this change")
    .fill("Verified synthetic subscription management through the real API.");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/admin-preview/students?integration=1");
  await expect(page.getByRole("row").filter({ hasText: "Integration Student" })).toContainText(
    "pro"
  );
});
test("staff invitation opens the real onboarding flow and reaches the lecturer workspace", async ({
  page,
}) => {
  test.skip(
    process.env.GOVERNANCE_E2E !== "1",
    "Requires the explicit local integration configuration."
  );
  await page.goto("/admin-preview/lecturers?integration=1");
  await page.getByRole("button", { name: "Invite lecturer", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Lecturer email", exact: true })
    .fill("integration-faculty@example.invalid");
  await page.getByLabel("Reason for this change").fill("Invite the synthetic faculty contributor.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Invitation ready", exact: true })).toBeVisible();
  const invitation = new URL(
    await page.getByLabel("Invitation link", { exact: true }).inputValue()
  ).searchParams.get("invite");
  expect(invitation).toBeTruthy();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const { token } = await (await page.request.get("/__governance-test/token?user=faculty")).json();
  const profile = await (
    await page.request.get("/api/v1/auth/me", { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  await page.addInitScript(
    ({ token, profile }) => {
      window.__governanceAuth = { session: { access_token: token }, profile };
    },
    { token, profile }
  );
  await page.goto(`/onboarding?onboarding=1&invite=${encodeURIComponent(invitation)}`);
  await page.getByRole("textbox", { name: "First name", exact: true }).fill("Integration");
  await page.getByRole("textbox", { name: "Last name", exact: true }).fill("Faculty");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Where are you studying?", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your workspace access", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Academic level", exact: true })).toHaveCount(
    0
  );
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByLabel("I agree to the Terms of Service and Privacy Policy", { exact: true })
    .check();
  await page.getByRole("button", { name: "Complete profile", exact: true }).click();
  await expect(page).toHaveURL(/\/lecturer$/);
  await expect(page.getByRole("heading", { name: "Overview", exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Administrators", exact: true })
  ).toHaveCount(0);
});
