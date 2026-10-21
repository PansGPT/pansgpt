import { test, expect, type APIRequestContext } from "@playwright/test";
test.skip(process.env.AUTH_E2E_LIVE !== "1", "Requires disposable Supabase, Mailpit and FastAPI.");
async function emailLink(
  request: APIRequestContext,
  email: string,
  subject: string
): Promise<string> {
  let html = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `http://127.0.0.1:54324/view/latest.html?query=${encodeURIComponent(`to:${email} subject:${subject}`)}`
        );
        if (response.ok()) html = await response.text();
        return /href="http[^\"]+\/auth\/v1\/verify\?/.test(html);
      },
      { timeout: 30000 }
    )
    .toBe(true);
  const link = html.match(/href="(http[^\"]+\/auth\/v1\/verify\?[^\"]+)"/)?.[1];
  if (!link) throw new Error("Captured email has no confirmation link.");
  return link.replaceAll("&amp;", "&");
}
test("real signup, confirmation, onboarding retries, sign-out, recovery and password replacement", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const email = `auth-${Date.now()}@example.test`;
  const password = "Synthetic-Original-73!";
  const replacement = "Synthetic-Replacement-84!";
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill(password);
  await page.getByLabel(/^Confirm password\s*\*?$/).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  const confirm = await emailLink(request, email, "Confirm");
  await page.route(
    "**/api/v1/auth/universities",
    (route) => route.fulfill({ status: 503, body: "unavailable" }),
    { times: 1 }
  );
  await page.goto(confirm);
  await expect(page).toHaveURL(/\/onboarding/);
  await page.getByRole("button", { name: "Retry universities" }).click();
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["Light", "OLED Dark", "Sepia"]) {
      await page.getByLabel("Appearance").selectOption({ label: theme });
      await expect(page.getByRole("combobox", { name: "University", exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/onboarding-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByLabel("First name").fill("Test");
  await page.getByLabel("Last name").fill("Student");
  await page.getByRole("combobox", { name: "University", exact: true }).click();
  await page.getByRole("option", { name: /University of Jos/ }).click();
  await page.getByRole("combobox", { name: "Academic level" }).click();
  await page.getByRole("option", { name: "300 Level", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.route(
    "**/api/v1/auth/onboard",
    (route) => route.fulfill({ status: 503, body: "unavailable" }),
    { times: 1 }
  );
  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("entries are still here");
  await expect(page.getByLabel("First name")).toHaveValue("Test");
  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Test Student", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  const reset = await emailLink(request, email, "Reset");
  await page.goto(reset);
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["Light", "OLED Dark", "Sepia"]) {
      await page.getByLabel("Appearance").selectOption({ label: theme });
      await expect(page.getByLabel(/^New password\s*\*?$/)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/update-password-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
      });
    }
  }
  await page.getByLabel(/^New password\s*\*?$/).fill(replacement);
  await page.getByLabel(/^Confirm new password\s*\*?$/).fill("mismatch");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByText("Passwords must match.")).toBeVisible();
  await page.getByLabel(/^Confirm new password\s*\*?$/).fill(replacement);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password_updated/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("incorrect");
  await page.getByLabel(/^Password\s*\*?$/).fill(replacement);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("button", { name: "Sign Out", exact: true }).click();
  await page.goto(reset);
  await expect(page).toHaveURL(/\/forgot-password\?error=link_expired/);
});
