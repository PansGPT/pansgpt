import { test, expect } from "@playwright/test";
import { commandSourceGeometry as geometry } from "../preview/command-source-data";

test("all ten command panels and forty-eight item states retain source geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2700, height: 1000 });
  await page.goto("/?section=commands");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((img) => img.decode().catch(() => undefined)));
  });
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  for (const source of geometry.bars) {
    const frame = await page.locator(`[data-source-id="${source.id}"]`).boundingBox();
    expect(frame?.width, source.name).toBe(source.width);
    expect(frame?.height, source.name).toBe(source.height);
  }
  for (const source of geometry.sets[0].variants) {
    const frame = await page.locator(`[data-row-source-id="${source.id}"]`).boundingBox();
    expect(frame?.width, source.name).toBe(source.width);
    expect(frame?.height, source.name).toBe(source.height);
  }
  for (const source of geometry.sets[3].variants) {
    const frame = await page.locator(`[data-section-source-id="${source.id}"]`).boundingBox();
    expect(frame?.width, source.name).toBe(source.width);
    expect(frame?.height, source.name).toBe(source.height);
  }
  for (const set of [geometry.sets[1], geometry.sets[4], geometry.sets[5]])
    for (const source of set.variants) {
      const frame = await page.locator(`[data-primitive-source-id="${source.id}"]`).boundingBox();
      expect(frame?.width, source.name).toBe(source.width);
      expect(frame?.height, source.name).toBe(source.height);
    }
  for (const img of await page.locator('img[src$=".svg"]:visible').all()) {
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
    await page.screenshot({ path: `test-results/command-menus-${theme}.png`, fullPage: true });
  }
});

test("command dialog filters accents, skips disabled results, activates with keyboard and restores focus", async ({
  page,
}) => {
  await page.goto("/?section=commands");
  const trigger = page.getByRole("button", { name: "Open command menu", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "People commands" });
  const input = dialog.getByRole("combobox", { name: "Search commands" });
  await expect(input).toBeFocused();
  await input.fill("oluwadamilola");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await input.press("Enter");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByTestId("command-selection")).toHaveText("Olúwadámilọ́lá Buhari");
  await page.keyboard.press("Control+k");
  await input.fill("");
  await input.press("End");
  const disabled = dialog.getByRole("option", { name: "Unavailable action", exact: true });
  await expect(disabled).toBeDisabled();
  await expect(disabled).toHaveAttribute("aria-selected", "false");
  await expect(dialog.getByRole("option", { selected: true })).toContainText("Ikenna Danjuma");
  await input.fill("unmatched");
  await expect(dialog.getByRole("status")).toHaveText("No people found");
  await input.press("Escape");
  await expect(trigger).toBeFocused();
  const source = page.locator('[data-source-id="3307:409015"]');
  await source.getByRole("switch", { name: "Enable Linear integration" }).click();
  await expect(page.getByTestId("command-toggle")).toHaveText("disabled");
  await page.setViewportSize({ width: 375, height: 900 });
  await trigger.click();
  await expect(input).toHaveValue("unmatched");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
