import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";
import { metricCardSources } from "../preview/metric-source-data";

test("all thirty-six metric layouts, mini charts and change indicators retain source geometry", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1900, height: 1100 });
  await openPreview(page, "/?section=metrics");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
  });
  for (const source of metricCardSources) {
    const frame = await page.locator(`[data-metric-source-id="${source.id}"]`).boundingBox();
    expect(frame?.width, source.name).toBe(source.width);
    expect(frame?.height, source.name).toBe(source.height);
  }
  await expect(page.locator("[data-mini-source-id]")).toHaveCount(24);
  for (const variant of ["arrow", "trend", "badge"])
    for (const trend of ["positive", "negative"]) {
      const bounds = await page
        .locator(`[data-change-variant="${variant}_${trend}"]`)
        .boundingBox();
      expect(bounds?.width).toBe(variant === "arrow" ? 58 : variant === "trend" ? 60 : 70);
      expect(bounds?.height).toBe(variant === "badge" ? 24 : 20);
    }
  const images = await page.locator('img[src$=".svg"]:visible').evaluateAll((elements) =>
    elements.map((node) => {
      const element = node as HTMLImageElement;
      const bounds = element.getBoundingClientRect();
      return {
        loaded: element.complete && element.naturalWidth > 0,
        width: bounds.width,
        height: bounds.height,
        nativeWidth: element.naturalWidth,
        nativeHeight: element.naturalHeight,
      };
    })
  );
  for (const bounds of images) {
    expect(bounds.loaded).toBe(true);
    expect(bounds.width).toBe(bounds.nativeWidth);
    expect(bounds.height).toBe(bounds.nativeHeight);
  }
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.screenshot({ path: `test-results/metrics-${theme}.png`, fullPage: true });
  }
});

test("metric menus, report actions, chart controls and actual data work across breakpoints", async ({
  page,
}) => {
  await openPreview(page, "/?section=metrics");
  const source = page.locator('[data-metric-source-id="1561:262223"]');
  await source.getByRole("button", { name: "View report" }).click();
  await expect(page.getByTestId("metric-selection")).toHaveText("1561:262223: View report");
  const live = page.getByTestId("live-metric");
  const menu = live.getByRole("button", { name: "Metric options" });
  await menu.click();
  const exportItem = page.getByRole("menuitem", { name: "Export metric" });
  await exportItem.press("Enter");
  await expect(page.getByTestId("metric-selection")).toHaveText("Export metric");
  await expect(menu).toBeFocused();
  const value = page.getByRole("slider", { name: "Latest value" });
  await value.focus();
  await value.press("End");
  await expect(live.getByRole("img", { name: "Study activity ending at 100" })).toBeVisible();
  const before = await live.locator("svg path[stroke]").getAttribute("d");
  await value.press("Home");
  expect(await live.locator("svg path[stroke]").getAttribute("d")).not.toBe(before);
  const charts = page.locator("[data-mini-source-id]");
  const originalCount = await charts.locator("img").count();
  await page.getByLabel("Chart markers").uncheck();
  const withoutMarkers = await charts.locator("img").count();
  expect(withoutMarkers).toBeLessThan(originalCount);
  await page.getByLabel("Chart background").uncheck();
  expect(await charts.locator("img").count()).toBeLessThan(withoutMarkers);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(value).toHaveValue("0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
