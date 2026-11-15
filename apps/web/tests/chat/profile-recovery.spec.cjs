const { test, expect } = require("@playwright/test");
const owner = "00000000-0000-4000-8000-000000000001";
const profile = {
  id: owner,
  email: "synthetic@example.test",
  role: "student",
  roles: ["student"],
  university_id: null,
  first_name: null,
  last_name: null,
  current_level: null,
  terms_accepted_at: null,
  is_onboarded: false,
  client_type: "web",
  dev_bypass: false,
};
for (const mobile of [false, true]) {
  test(`profile failure stays simple and one Retry click recovers transient 503s on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem("pansgpt-theme", "dark"));
    let calls = 0;
    await page.route("**/api/v1/auth/me", async (route) => {
      expect(route.request().headers().authorization).toBe("Bearer synthetic-profile-token");
      calls++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      return calls < 3
        ? route.fulfill({
            status: 503,
            headers: { "Retry-After": "0" },
            json: { detail: "Synthetic internal authorization-store error" },
          })
        : route.fulfill({ json: profile });
    });
    await page.goto("/?profile_failure=unavailable");
    await expect(
      page.getByRole("heading", { name: "Something went wrong", exact: true })
    ).toBeVisible();
    const retry = page.getByRole("button", { name: "Retry", exact: true });
    const geometry = await retry.evaluate((node) => ({
      width: node.offsetWidth,
      height: node.offsetHeight,
      radius: getComputedStyle(node).borderRadius,
      text: node.textContent,
    }));
    expect(geometry.width).toBe(44);
    expect(geometry.height).toBe(44);
    expect(geometry.radius).toBe("50%");
    expect(geometry.text.trim()).toBe("");
    await expect(page.getByRole("button")).toHaveCount(1);
    await page.screenshot({
      path: test.info().outputPath(`profile-retry-${mobile ? "mobile" : "desktop"}.png`),
    });
    await retry.click();
    await expect(retry).toBeDisabled();
    await expect(page.getByRole("status")).toHaveText("Synthetic profile verified");
    expect(calls).toBe(3);
  });
}
test("persistent profile failures stop after three attempts and allow a deliberate retry", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/v1/auth/me", (route) => {
    calls++;
    return route.fulfill({
      status: 503,
      headers: { "Retry-After": "0" },
      json: { detail: "Internal diagnostics" },
    });
  });
  await page.goto("/?profile_failure=unavailable");
  const retry = page.getByRole("button", { name: "Retry", exact: true });
  await retry.click();
  await expect.poll(() => calls).toBe(3);
  await expect(retry).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveText("Something went wrong");
  await retry.click();
  await expect.poll(() => calls).toBe(6);
  await expect(retry).toBeEnabled();
});
test("expired sessions retain sign-in guidance and no automatic retry", async ({ page }) => {
  await page.goto("/?profile_failure=session_expired");
  await expect(
    page.getByRole("heading", { name: "Your session has expired", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in again", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
});
