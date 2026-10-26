import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";

test("all twelve section headers retain source geometry and local asset dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await openPreview(page, "/?section=sectionheaders");
  await page.evaluate(() => document.fonts.ready);
  const sources = page.locator("[data-source-id]");
  await expect(sources).toHaveCount(12);
  for (const source of await sources.all()) {
    const mobile = (await source.getAttribute("data-header-breakpoint")) === "mobile";
    const hasTabs = (await source.locator(".p-section-header-tabs").count()) > 0;
    const frame = await source.boundingBox();
    expect(frame?.width).toBe(mobile ? 343 : 1216);
    expect(frame?.height).toBe(mobile ? (hasTabs ? 211 : 147) : hasTabs ? 135 : 71);
    for (const img of await source.locator("img:visible").all()) {
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
    await page.addStyleTag({ content: ".preview { max-width: none; }" });
    await page.screenshot({ path: `test-results/section-headers-${theme}.png`, fullPage: true });
  }
});

test("header search, action menu and mobile tabs work with shared state", async ({ page }) => {
  await openPreview(page, "/?section=sectionheaders");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("searchbox", { name: "Search team", exact: true });
  await expect(search).toBeFocused();
  await search.fill("Pharmacy");
  await expect(page.getByTestId("header-query")).toHaveText("Pharmacy");
  const desktop = page.locator('[data-source-id="1214:66"]');
  await desktop.getByRole("button", { name: "Team options" }).click();
  await page.getByRole("menuitem", { name: "Export team" }).click();
  await expect(page.getByTestId("header-action")).toHaveText("Export team");
  await expect(desktop.getByRole("button", { name: "Team options" })).toBeFocused();
  await desktop.getByRole("button", { name: "Primary", exact: true }).click();
  await expect(page.getByTestId("header-action")).toHaveText("Primary");
  const live = page.getByTestId("section-header-live");
  await live.getByRole("tab", { name: "Profile", exact: true }).click();
  await expect(page.getByTestId("header-tab")).toHaveText("Profile");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(live.getByRole("combobox")).toHaveText("Profile");
  await live.getByRole("combobox").click();
  await page.getByRole("option", { name: "Team", exact: true }).click();
  await expect(page.getByTestId("header-tab")).toHaveText("Team");
  await expect(search).toHaveValue("Pharmacy");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
