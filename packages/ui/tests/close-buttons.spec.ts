import { expect, test } from "@playwright/test";
test("all eighteen close-button references retain source frames, glyphs and states", async ({
  page,
}) => {
  await page.goto("/?section=close");
  await expect(page.getByRole("heading", { name: "Close buttons" })).toBeVisible();
  await expect(page.locator(".close-button-fixture")).toHaveCount(18);
  await page.locator(".close-button-fixture").evaluateAll(async (fixtures) => {
    for (const fixture of fixtures) {
      const size = fixture.getAttribute("data-size");
      const state = fixture.getAttribute("data-state");
      const button = fixture.querySelector("button");
      if (!button) throw new Error("Missing button");
      const box = button.getBoundingClientRect();
      const width = size === "sm" ? 36 : size === "md" ? 40 : 44;
      if (box.width !== width || box.height !== width) throw new Error("Wrong frame");
      const glyph = button.querySelector<HTMLImageElement>(
        state === "hover" ? ".p-close-button-hover" : ".p-close-button-normal"
      );
      if (!glyph) throw new Error("Missing glyph");
      await glyph.decode();
      const gb = glyph.getBoundingClientRect();
      if (
        gb.width !== glyph.naturalWidth ||
        gb.height !== glyph.naturalHeight ||
        gb.width !== (size === "lg" ? 24 : 20)
      )
        throw new Error("Scaled SVG");
      if (gb.x - box.x !== (width - gb.width) / 2 || gb.y - box.y !== (width - gb.height) / 2)
        throw new Error("Incorrect position");
      if (!glyph.src.startsWith(location.origin)) throw new Error("Remote asset");
      const css = getComputedStyle(button);
      if (state === "focused" && css.boxShadow === "none") throw new Error("Missing focus ring");
      if (state === "default" && css.backgroundColor !== "rgba(0, 0, 0, 0)")
        throw new Error("Wrong default background");
    }
  });
  await page
    .locator(".close-button-source-grid")
    .screenshot({ path: "test-results/close-buttons-source.png" });
});
test("native close actions support pointer, keyboard, focus and disabled state", async ({
  page,
}) => {
  await page.goto("/?section=close");
  const demo = page.getByRole("group", { name: "Interactive close buttons" });
  const action = demo.getByRole("button", { name: "Dismiss sample" });
  await action.click();
  await expect(demo.locator("output")).toHaveText("Dismiss actions: 1");
  await action.press("Enter");
  await action.press("Space");
  await expect(demo.locator("output")).toHaveText("Dismiss actions: 3");
  await expect(action).toBeFocused();
  expect(await action.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
  await action.hover();
  await expect(action.locator(".p-close-button-hover")).toBeVisible();
  await expect(demo.getByRole("button", { name: "Unavailable dismiss" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
