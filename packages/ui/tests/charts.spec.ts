import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";
import { chartSources } from "../preview/chart-source-data";

test("all 93 chart specimens preserve native Figma frames and SVG dimensions", async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await openPreview(page, "/?section=charts");
  await page.evaluate(() => document.fonts.ready);
  const mismatches: string[] = [];
  for (const family of chartSources)
    for (const source of family.variants) {
      const geometry = await page.locator(`[data-chart-source-id="${source.id}"]`).boundingBox();
      if (
        !geometry ||
        Math.abs(geometry.width - source.width) > 0.15 ||
        Math.abs(geometry.height - source.height) > 0.15
      )
        mismatches.push(
          `${source.id} ${source.name}: ${geometry?.width}x${geometry?.height}; expected ${source.width}x${source.height}`
        );
    }
  expect(mismatches).toEqual([]);
  const assets = await page.evaluate(async () => {
    const result = await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>('.chart-source-grid img[src$=".svg"]')].map(
        async (image) => {
          const svg = new DOMParser().parseFromString(
            await (await fetch(image.src)).text(),
            "image/svg+xml"
          ).documentElement;
          const style = getComputedStyle(image);
          const width = Number.parseFloat(svg.getAttribute("width") ?? "0");
          const height = Number.parseFloat(svg.getAttribute("height") ?? "0");
          return Math.abs(Number.parseFloat(style.width) - width) > 0.1 ||
            Math.abs(Number.parseFloat(style.height) - height) > 0.1
            ? `${image.src}: ${style.width} ${style.height}; expected ${width} ${height}`
            : undefined;
        }
      )
    );
    return result.filter((value) => value !== undefined);
  });
  expect(assets).toEqual([]);
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    for (const id of [
      "1062:47341",
      "1063:74459",
      "1084:5135",
      "1084:4340",
      "1084:7279",
      "8099:193212",
    ])
      await page
        .locator(`[data-chart-source-id="${id}"]`)
        .screenshot({ path: `test-results/chart-${id.replace(":", "-")}-${theme}.png` });
  }
});

test("live charts inspect data, toggle series and handle extreme or missing values", async ({
  page,
}) => {
  await openPreview(page, "/?section=charts");
  const chart = page.getByRole("figure", { name: "Study activity", exact: true });
  const slider = chart.getByRole("slider", { name: "Inspect Study activity" });
  await slider.focus();
  await slider.press("End");
  await expect(page.getByTestId("chart-inspection")).toHaveText("6");
  await expect(chart.locator("output")).toContainText("Sun: Series 1 600");
  const first = chart.getByRole("button", { name: "Series 1", exact: true });
  await first.click();
  await expect(first).toHaveAttribute("aria-pressed", "false");
  await expect(chart.locator("output")).not.toContainText("Series 1");
  await first.click();
  await page.getByLabel("Use extreme and missing values").check();
  const invalid = await page
    .locator(".p-data-chart svg, .chart-live-radial svg")
    .evaluateAll((elements) =>
      elements.flatMap((element) =>
        [...element.querySelectorAll("[d],[points],[x],[y],[cx],[cy],[width],[height]")]
          .filter((node) =>
            [...node.attributes].some((attribute) => /(?:NaN|Infinity)/.test(attribute.value))
          )
          .map((node) => node.outerHTML)
      )
    );
  expect(invalid).toEqual([]);
  await slider.press("Home");
  await expect(chart.locator("output")).toContainText("Mon:");
  await slider.press("ArrowRight");
  await slider.press("ArrowRight");
  await expect(chart.locator("output")).toContainText("Series 1 Unavailable");
  const gauge = page.locator(".chart-live-radial .p-activity-gauge svg");
  await expect(gauge).toHaveAttribute("aria-label", "Weekly goal: 40%, 60%, 80%");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(slider).toBeVisible();
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll("body *")].flatMap((node) => {
      const box = node.getBoundingClientRect();
      // Scrollable source archives intentionally keep their original frames.
      if (box.right <= innerWidth || node.closest(".chart-source-grid")) return [];
      return [{ tag: node.tagName, className: node.getAttribute("class"), right: box.right }];
    })
  );
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
      message: `Chart must fit the mobile viewport: ${JSON.stringify(overflow)}`,
    })
    .toBeLessThanOrEqual(375);
});
