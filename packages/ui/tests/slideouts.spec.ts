import { test, expect } from "@playwright/test";
import { slideoutSources } from "../preview/slideout-source-data";
import { slideoutLayoutSources } from "../preview/slideout-layout-source-data";

test("all four slideout header frames preserve native artwork and tab behavior", async ({
  page,
}) => {
  await page.goto("/?section=slideouts");
  await page.evaluate(() => document.fonts.ready);
  const mismatches: string[] = [];
  for (const source of slideoutSources[0].variants) {
    const frame = await page.locator(`[data-slideout-source-id="${source.id}"]`).boundingBox();
    if (frame?.width !== source.width || frame.height !== source.height)
      mismatches.push(
        `${source.name}: ${frame?.width}×${frame?.height}; expected ${source.width}×${source.height}`
      );
  }
  expect(mismatches).toEqual([]);
  for (const source of slideoutLayoutSources) {
    const surface = page.locator(`[data-slideout-source-id="${source.id}"]`);
    await expect(surface).toHaveCount(1);
    const frame = await surface.boundingBox();
    expect(frame?.width).toBe(source.width);
    expect(frame?.height).toBe(source.height);
    const panel = await surface.locator(".p-slideout-panel").boundingBox();
    expect(panel?.width).toBe(source.panel?.width);
    expect((panel?.x ?? 0) - (frame?.x ?? 0)).toBe(source.panel?.x);
    for (const slot of source.panel?.children ?? []) {
      const part =
        slot.name === "_Slide out menu header" || slot.name === "Menu header"
          ? ".p-slideout-panel > .p-slideout-header"
          : slot.name === "Footer"
            ? ".p-slideout-footer"
            : slot.name === "Content"
              ? ".p-slideout-body"
              : slot.name === "Header"
                ? ".slideout-profile-header"
                : undefined;
      if (!part) continue;
      const geometry = await surface.locator(part).boundingBox();
      expect(geometry?.height, `${source.id} ${slot.name}`).toBe(slot.height);
      expect((geometry?.y ?? 0) - (panel?.y ?? 0), `${source.id} ${slot.name} position`).toBe(
        slot.y
      );
    }
  }
  const header = page.locator('[data-slideout-source-id="1251:2100"]');
  await header.getByRole("tab", { name: "My details" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(header.getByRole("tab", { name: "Profile" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await header.getByRole("tab", { name: "My details" }).click();
  await page.getByRole("heading", { name: "Four slideout headers" }).click();
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.screenshot({ path: `test-results/slideouts-${theme}.png`, fullPage: true });
  }
});

test("modal slideout traps focus, scrolls its body, closes and restores trigger focus", async ({
  page,
}) => {
  await page.goto("/?section=slideouts");
  const trigger = page.getByRole("button", { name: "Open study settings" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Study settings" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Study name").fill("Pharmacology");
  await dialog.locator(".p-slideout-body").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Close panel" })).toBeInViewport();
  await dialog.getByRole("button", { name: "Save", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect
    .poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))))
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole("button", { name: "Close panel" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 375, height: 700 });
  await trigger.click();
  const bounds = await dialog.boundingBox();
  expect(bounds?.width).toBe(351);
  await expect(dialog.getByRole("button", { name: "Save", exact: true })).toBeInViewport();
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByTestId("slideout-selection")).toHaveText("Pharmacology");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("application slideouts preserve original artwork and caller-owned interactions", async ({
  page,
}) => {
  await page.goto("/?section=slideouts");
  const errors = await page.evaluate(async () => {
    const results = await Promise.all(
      [...document.querySelectorAll<HTMLImageElement>('.slideout-source-grid img[src$=".svg"]')]
        .filter((element) => element.checkVisibility())
        .map(async (element) => {
          await element.decode();
          const svg = new DOMParser().parseFromString(
            await (await fetch(element.src)).text(),
            "image/svg+xml"
          ).documentElement;
          const style = getComputedStyle(element);
          const expectedWidth = Number.parseFloat(svg.getAttribute("width") ?? "0");
          const expectedHeight = Number.parseFloat(svg.getAttribute("height") ?? "0");
          return Math.abs(Number.parseFloat(style.width) - expectedWidth) > 0.1 ||
            Math.abs(Number.parseFloat(style.height) - expectedHeight) > 0.1
            ? `${element.src}: ${style.width} ${style.height}; expected ${expectedWidth} ${expectedHeight}`
            : undefined;
        })
    );
    return results.filter((result) => result !== undefined);
  });
  expect(errors).toEqual([]);
  const labels = page.locator('[data-slideout-source-id="1240:164129"]');
  await labels.getByRole("textbox", { name: "Search for label" }).fill("Finance");
  await expect(labels.getByRole("checkbox")).toHaveCount(1);
  await labels.getByRole("checkbox").press("Space");
  await expect(page.getByTestId("slideout-selection")).toHaveText("Finance: true");
  const intro = page.locator('[data-slideout-source-id="9222:10405"]');
  await intro.getByRole("button", { name: "Analyze data", exact: true }).click();
  await expect(page.getByTestId("slideout-selection")).toHaveText("Analyze data");
  const chat = page.locator('[data-slideout-source-id="1247:167"]');
  await chat.getByRole("textbox", { name: "Message team", exact: true }).fill("Review finished");
  await chat.getByRole("textbox", { name: "Message team", exact: true }).press("Enter");
  await expect(page.getByTestId("slideout-selection")).toHaveText("Sent: Review finished");
  await expect(chat.getByRole("textbox", { name: "Message team", exact: true })).toHaveValue("");
  const event = page.locator('[data-slideout-source-id="8017:533549"]');
  await event.getByRole("radio", { name: "Maybe", exact: true }).click();
  await expect(page.getByTestId("slideout-selection")).toHaveText("maybe");
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    for (const id of ["1247:167", "9222:10405", "9230:140506", "8017:533555"])
      await page
        .locator(`[data-slideout-source-id="${id}"]`)
        .screenshot({ path: `test-results/slideout-${id.replace(":", "-")}-${theme}.png` });
  }
});
