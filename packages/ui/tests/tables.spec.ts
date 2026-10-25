import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { tableSources } from "../preview/table-source-data";
test("all 101 table source specimens preserve Figma frames and native SVG assets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await openPreview(page, "/?section=tables");
  await page.evaluate(() => document.fonts.ready);
  const mismatches: string[] = [];
  for (const family of tableSources)
    for (const source of family.variants) {
      const box = await page.locator(`[data-table-source-id="${source.id}"]`).boundingBox();
      if (
        !box ||
        Math.abs(box.width - source.width) > 0.15 ||
        Math.abs(box.height - source.height) > 0.15
      )
        mismatches.push(
          `${source.id} ${source.name}: ${box?.width}x${box?.height}; expected ${source.width}x${source.height}`
        );
    }
  expect(mismatches).toEqual([]);
  const resized = await page.evaluate(async () =>
    (
      await Promise.all(
        [...document.querySelectorAll<HTMLImageElement>('.table-source-grid img[src$=".svg"]')].map(
          async (image) => {
            const root = new DOMParser().parseFromString(
              await (await fetch(image.src)).text(),
              "image/svg+xml"
            ).documentElement;
            const width = Number.parseFloat(root.getAttribute("width") ?? "0"),
              height = Number.parseFloat(root.getAttribute("height") ?? "0");
            const style = getComputedStyle(image);
            return Math.abs(Number.parseFloat(style.width) - width) > 0.1 ||
              Math.abs(Number.parseFloat(style.height) - height) > 0.1
              ? `${image.src}: ${style.width} ${style.height}; expected ${width} ${height}`
              : undefined;
          }
        )
      )
    ).filter(Boolean)
  );
  expect(resized).toEqual([]);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    for (const id of ["1227:110480", "1227:115509", "1229:2364", "1227:110588"])
      await page
        .locator(`[data-table-source-id="${id}"]`)
        .screenshot({ path: `test-results/table-${id.replace(":", "-")}-${theme}.png` });
  }
});
test("live tables sort stably, select eligible rows and support keyboard ratings and empty states", async ({
  page,
}) => {
  await openPreview(page, "/?section=tables");
  const live = page.getByTestId("live-table");
  await live.getByRole("button", { name: "Sort by Score" }).click();
  await expect(live.locator("tbody tr").first()).toContainText("Bola");
  await expect(live.locator("tbody tr").nth(1)).toContainText("Chika");
  await expect(live.getByRole("columnheader", { name: "Score" })).toHaveAttribute(
    "aria-sort",
    "ascending"
  );
  await live.getByRole("button", { name: "Sort by Score" }).click();
  await expect(live.locator("tbody tr").first()).toContainText("Ada");
  await expect(live.locator("tbody tr").last()).toContainText("Unavailable");
  await live.getByRole("checkbox", { name: "Select Ada", exact: true }).click();
  await expect(live.getByRole("checkbox", { name: "Select all rows" })).toHaveAttribute(
    "aria-checked",
    "mixed"
  );
  await live.getByRole("checkbox", { name: "Select all rows" }).click();
  await expect(page.getByTestId("table-selection")).toHaveText("a,b,c");
  await expect(live.getByRole("checkbox", { name: "Select Disabled" })).toBeDisabled();
  await live.getByRole("checkbox", { name: "Select all rows" }).click();
  await expect(page.getByTestId("table-selection")).toHaveText("");
  const rating = live.getByRole("group", { name: "Ada rating" });
  await rating.getByRole("radio", { name: "4 stars" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByTestId("table-action")).toHaveText("Ada: 5 stars");
  await page.getByLabel("Show empty table").check();
  await expect(live).toContainText("No results.");
  await expect(live.getByRole("checkbox", { name: "Select all rows" })).toBeDisabled();
  await page.getByLabel("Show empty table").uncheck();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  expect(
    await live
      .locator(".p-table-scroll")
      .evaluate((element) => element.scrollWidth > element.clientWidth)
  ).toBe(true);
  const menuSource = tableSources[2].variants.find(
    (source) => source.name === "Type=Action dropdown icon, Size=md, State=Default"
  );
  expect(menuSource).toBeDefined();
  await page
    .locator(`[data-table-source-id="${menuSource?.id}"]`)
    .getByRole("button", { name: "Row actions" })
    .click();
  await page.getByRole("menuitem", { name: "Edit", exact: true }).click();
  await expect(page.getByTestId("table-action")).toHaveText("Edit row");
});
