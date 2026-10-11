import { test, expect } from "@playwright/test";

test("twelve page headers match source frame dimensions and preserve navigation and search", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2100, height: 1000 });
  await page.goto("/?section=pageheaders");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-source-id]")).toHaveCount(12);
  for (const source of await page.locator("[data-source-id]").all()) {
    const mobile = (await source.getAttribute("data-page-breakpoint")) === "mobile";
    const banner = (await source.getAttribute("data-page-style"))?.startsWith("banner");
    const frame = await source.boundingBox();
    expect(frame?.width).toBe(mobile ? 375 : banner ? 1440 : 1216);
    expect(frame?.height).toBe(Number(await source.getAttribute("data-source-height")));
    for (const img of await source.locator('img[src$=".svg"]:visible').all()) {
      const geometry = await img.evaluate((element: HTMLImageElement) => ({
        loaded: element.complete && element.naturalWidth > 0,
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        nativeWidth: element.naturalWidth,
        nativeHeight: element.naturalHeight,
      }));
      expect(geometry.loaded).toBe(true);
      expect(geometry.width).toBe(geometry.nativeWidth);
      expect(geometry.height).toBe(geometry.nativeHeight);
    }
  }
  const live = page.getByTestId("page-header-live");
  await live.getByRole("button", { name: "Primary", exact: true }).click();
  await expect(page.getByTestId("page-header-action")).toHaveText("Primary");
  await page.keyboard.press("Control+k");
  const search = live.getByRole("searchbox", { name: "Search members" });
  await expect(search).toBeFocused();
  await search.fill("Pharmacy");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(search).toHaveValue("Pharmacy");
  await live.getByRole("link", { name: "Back", exact: true }).click();
  await expect(page).toHaveURL(/#quiz$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.setViewportSize({ width: 2100, height: 1000 });
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined))
      );
    });
    await page.screenshot({ path: `test-results/page-headers-${theme}.png`, fullPage: true });
  }
});
