import { test, expect } from "@playwright/test";
import { emailLink } from "./support";
test.skip(process.env.AUTH_E2E_LIVE !== "1", "Requires disposable Supabase, Mailpit and FastAPI.");

test("verified workspace navigation, profile, account themes, failures and mobile keyboard access", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const email = `shell-${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill("Synthetic-Shell-86!");
  await page.getByLabel(/^Confirm password\s*\*?$/).fill("Synthetic-Shell-86!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await emailLink(request, email, "Confirm"));
  await page.getByLabel("First name").fill("Shell");
  await page.getByLabel("Last name").fill("Student");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("combobox", { name: "University", exact: true }).click();
  await page.getByRole("option", { name: /University of Jos/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "200 Level", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: "Make yourself at home, Shell." })).toBeVisible();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  const profile = page.getByRole("dialog", { name: "Your profile", exact: true });
  await expect(profile.getByText("University of Jos", { exact: true })).toBeVisible();
  await expect(profile.getByText("200 Level", { exact: true })).toBeVisible();
  let failPreference = true;
  await page.route("**/rest/v1/user_preferences*", (route) => {
    if (route.request().method() === "POST" && failPreference)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Synthetic unavailable" }),
      });
    return route.continue();
  });
  await profile.getByLabel("Workspace theme").selectOption("dark");
  await expect(profile.getByRole("status")).toContainText("Account sync is unavailable");
  expect(await page.evaluate(() => localStorage.getItem("pansgpt-theme"))).toBe("dark");
  failPreference = false;
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/user_preferences") && response.request().method() === "POST"
  );
  await profile.getByRole("button", { name: "Retry theme sync" }).click();
  expect((await saved).ok()).toBe(true);
  expect((await saved).request().postDataJSON()).toMatchObject({ theme: "oled_dark" });
  await expect(profile.getByRole("status")).toContainText("Your theme is saved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open profile", exact: true })).toBeFocused();
  // Prove the authenticated database preference wins over a stale device value.
  await page.evaluate(() => localStorage.setItem("pansgpt-theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await expect(profile.getByLabel("Workspace theme")).toHaveValue("dark");
  for (const [value, name] of [
    ["dark", "OLED-Dark"],
    ["sepia", "Sepia"],
    ["light", "Light"],
  ] as const) {
    await profile.getByLabel("Workspace theme").selectOption(value);
    await expect(profile.getByRole("status")).toContainText("Your theme is saved");
    await expect(page.locator("html")).toHaveAttribute("data-theme", value);
    await page.keyboard.press("Escape");
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/shell-home-${width}-${name}.png`,
        fullPage: true,
        animations: "disabled",
      });
    }
    await page.getByRole("button", { name: "Open profile", exact: true }).click();
  }
  await page.screenshot({ path: "test-results/shell-profile-375.png", fullPage: true });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  const mobile = page.getByRole("dialog", { name: "Workspace navigation", exact: true });
  await expect(mobile.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await page.screenshot({ path: "test-results/shell-navigation-375.png", fullPage: true });
  await mobile.getByRole("link", { name: "Notes", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);
  await expect(mobile).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Make room for your ideas" })).toBeVisible();
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("button", { name: "New note", exact: true })).toBeDisabled();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Quick search", exact: true });
  await search.getByLabel("Search pages").fill("zzzz");
  await expect(search.getByRole("status")).toContainText("No matching pages");
  await search.getByLabel("Search pages").fill("Library");
  await search.getByRole("link", { name: /Library/ }).click();
  await expect(page).toHaveURL(/\/app\/library$/);
  await expect(page.getByRole("heading", { name: "Your library", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload material" })).toHaveCount(0);
  await page.route(
    "**/api/v1/library/documents",
    (route) => route.fulfill({ status: 503, body: "Synthetic unavailable" }),
    { times: 1 }
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We couldn't load your library" })).toBeVisible();
  await page.getByRole("button", { name: "Retry library" }).click();
  await expect(
    page.getByRole("heading", { name: "We couldn't load your library" })
  ).not.toBeVisible();
  await page.goto("/app/a-page-that-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This page has moved out of reach" })
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to home", exact: true }).click();

  let libraryRequests = 0;
  page.on("request", (outgoing) => {
    if (outgoing.url().includes("/api/v1/library/documents")) libraryRequests += 1;
  });
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ status: 503, body: "Synthetic profile failure" })
  );
  await page.goto("/app/library");
  await expect(
    page.getByRole("heading", { name: "We couldn't verify your profile" })
  ).toBeVisible();
  expect(libraryRequests).toBe(0);
  await page.unroute("**/api/v1/auth/me");
  await page.getByRole("button", { name: "Retry profile verification" }).click();
  await expect(page.getByRole("heading", { name: "Your library", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open profile", exact: true }).click();
  await profile.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/app/notes");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fnotes/);
});
