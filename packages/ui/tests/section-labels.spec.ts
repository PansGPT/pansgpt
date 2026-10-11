import { test, expect } from "@playwright/test";

test("section labels match source frames and preserve native field/help/action behavior", async ({
  page,
}) => {
  await page.goto("/?section=sectionlabels");
  await page.evaluate(() => document.fonts.ready);
  const frames = page.locator("[data-source-id]");
  await expect(frames).toHaveCount(4);
  for (const [id, height] of [
    ["5013:376528", 40],
    ["5013:376529", 72],
    ["5013:376579", 48],
    ["5013:376584", 80],
  ] as const) {
    const frame = page.locator(`[data-source-id="${id}"]`);
    const geometry = await frame.boundingBox();
    expect(geometry?.width).toBe(280);
    expect(geometry?.height).toBe(height);
    const image = frame.locator("img");
    await expect(image).toHaveCount(1);
    expect(
      await image.evaluate((element: HTMLImageElement) => ({
        loaded: element.complete && element.naturalWidth > 0,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      }))
    ).toEqual({ loaded: true, width: 16, height: 16 });
  }
  await page.locator('label[for="section-team-name"]').click();
  await expect(page.getByRole("textbox", { name: "Team name (required)" })).toBeFocused();
  await expect(page.getByRole("textbox")).toHaveAccessibleDescription(
    "Use a name your team recognizes."
  );
  await page.getByRole("button", { name: "Team name help" }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Choose your team name");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.getByRole("button", { name: "Primary", exact: true }).first().click();
  await expect(page.getByTestId("section-action")).toHaveText("Primary");
  await page.getByRole("button", { name: "Secondary", exact: true }).first().click();
  await expect(page.getByTestId("section-action")).toHaveText("Secondary");
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined))
      );
    });
    await page.screenshot({ path: `test-results/section-labels-${theme}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 320, height: 850 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
