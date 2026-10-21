import { test, expect } from "@playwright/test";
for (const width of [375, 1440]) {
  for (const theme of ["Light", "OLED Dark", "Sepia"]) {
    test(`${width}px ${theme}: auth screens, validation and theme persistence`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/login");
      await page.getByLabel("Appearance").selectOption({ label: theme });
      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
      await page.screenshot({
        path: `test-results/login-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByLabel("Email address")).toHaveAttribute("aria-invalid", "true");
      await expect(page.getByLabel("Email address")).toBeFocused();
      await page.getByLabel(/^Password\s*\*?$/).fill("private-value");
      await page.getByRole("button", { name: "Show password", exact: true }).click();
      await expect(page.getByLabel(/^Password\s*\*?$/)).toHaveAttribute("type", "text");
      await page.getByRole("button", { name: "Hide password", exact: true }).click();
      await expect(page.getByLabel(/^Password\s*\*?$/)).toHaveAttribute("type", "password");
      await page.getByRole("link", { name: "Create an account" }).click();
      await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
      await expect(page.getByLabel("Appearance")).toHaveValue(
        theme === "Light" ? "light" : theme === "Sepia" ? "sepia" : "dark"
      );
      await page.screenshot({
        path: `test-results/signup-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
      });
      await page.getByLabel("Email address").fill("student@example.test");
      await page.getByLabel(/^Password\s*\*?$/).fill("short");
      await page.getByLabel(/^Confirm password\s*\*?$/).fill("different");
      await page.getByRole("button", { name: "Create account", exact: true }).click();
      await expect(page.getByText("Passwords must match.")).toBeVisible();
      await page.goto("/forgot-password?error=link_expired");
      await expect(page.getByRole("main").getByRole("alert")).toContainText("expired");
      await expect(page.getByRole("heading", { name: "Forgot your password?" })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/auth-${width}-${theme.replaceAll(" ", "-")}.png`,
        fullPage: true,
      });
    });
  }
}
test("callback failures stay generic and unauthenticated recovery remains protected", async ({
  page,
}) => {
  await page.goto(
    "/auth/callback?next=/update-password&error_description=sensitive-internal-error"
  );
  await expect(page).toHaveURL(/\/forgot-password\?error=link_expired/);
  await expect(page.getByRole("main").getByRole("alert")).not.toContainText(
    "sensitive-internal-error"
  );
  await page.goto("/update-password");
  await expect(page).toHaveURL(/\/forgot-password\?error=recovery_required/);
  await page.goto("/onboarding?invite=keep-me");
  await expect(page).toHaveURL(/\/login\?next=%2Fonboarding%3Finvite%3Dkeep-me/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page).toHaveURL(/\/signup\?invite=keep-me/);
});
test("request failures are announced and entered email is preserved", async ({ page }) => {
  await page.route("**/auth/v1/recover*", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ code: "over_email_send_rate_limit", msg: "internal detail" }),
    })
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill("student@example.test");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("wait");
  await expect(page.getByLabel("Email address")).toHaveValue("student@example.test");
  await expect(page.getByRole("button", { name: "Send reset link" })).toBeEnabled();
});

test("configured OAuth options preserve the desktop bridge and report handoff failure", async ({
  page,
}) => {
  await page.route("**/auth/v1/settings", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ external: { google: true, apple: false } }),
    })
  );
  await page.addInitScript(() => {
    window.pansgptBridge = {
      auth: {
        getSession: async () => null,
        beginOAuth: async () => {
          throw new Error("Synthetic native handoff failure");
        },
        signOut: async () => undefined,
        onOAuthSuccess: () => () => undefined,
      },
    };
  });
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Continue with Apple" })).toHaveCount(0);
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("sign-in option");
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeEnabled();
});
