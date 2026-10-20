import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";

test("card headers preserve all four source frames and responsive action/menu behavior", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await openPreview(page, "/?section=cardheaders");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-source-id]")).toHaveCount(4);
  for (const [id, width, height, avatarSize] of [
    ["1211:168", 1216, 91, 0],
    ["1211:221", 375, 167, 0],
    ["1211:272", 1216, 97, 56],
    ["1211:622", 375, 145, 48],
  ] as const) {
    const source = page.locator(`[data-source-id="${id}"]`);
    const frame = await source.boundingBox();
    expect(frame?.width).toBe(width);
    expect(frame?.height).toBe(height);
    const title = await source.locator(".p-section-header-title").boundingBox();
    const badge = await source.locator(".p-badge").boundingBox();
    expect(badge!.x - title!.x - title!.width).toBeCloseTo(8, 3);
    if (avatarSize) {
      const avatar = source.locator(".p-avatar");
      expect((await avatar.boundingBox())?.width).toBe(avatarSize);
      expect((await avatar.boundingBox())?.height).toBe(avatarSize);
      expect(
        await avatar
          .locator("img")
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)
      ).toBe(true);
    }
    const divider = source.locator(".p-card-header-divider img:visible");
    expect((await divider.boundingBox())?.width).toBe(width);
    expect((await divider.boundingBox())?.height).toBe(1);
  }
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
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
    await page.screenshot({ path: `test-results/card-headers-${theme}.png`, fullPage: true });
  }
  const live = page.getByTestId("card-header-live");
  await live.getByRole("button", { name: "Card options" }).click();
  await page.getByRole("menuitem", { name: "Export card" }).click();
  await expect(page.getByTestId("card-action")).toHaveText("Export card");
  await expect(live.getByRole("button", { name: "Card options" })).toBeFocused();
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(live.getByRole("button", { name: "Primary", exact: true })).toHaveCount(1);
  await live.getByRole("button", { name: "Primary", exact: true }).click();
  await expect(page.getByTestId("card-action")).toHaveText("Primary");
  await expect(
    page.getByTestId("card-header-minimal").locator(".p-card-header-divider")
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
