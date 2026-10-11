import { expect, test } from "@playwright/test";
test("all forty-eight badge close states retain native artwork and source geometry", async ({
  page,
}) => {
  await page.goto("/?section=badgegroups");
  await expect(page.locator(".badge-close-fixture")).toHaveCount(48);
  await page.locator(".badge-close-fixture").evaluateAll(async (fixtures) => {
    for (const fixture of fixtures) {
      const button = fixture.querySelector("button");
      if (!button) throw new Error("Missing button");

      const hover = fixture.getAttribute("data-state") === "hover";
      const image = button.querySelector<HTMLImageElement>(
        hover ? ".p-badge-close-hover" : ".p-badge-close-normal"
      );
      if (!image) throw new Error("Missing glyph");
      await image.decode();
      const box = button.getBoundingClientRect();
      if (box.width !== 16 || box.height !== 16) throw new Error("Wrong frame");
      const b = image.getBoundingClientRect();
      if (
        b.width !== 12 ||
        b.height !== 12 ||
        b.x - box.x !== 2 ||
        b.y - box.y !== 2 ||
        image.naturalWidth !== 12 ||
        image.naturalHeight !== 12
      )
        throw new Error(
          `Wrong original glyph bounds: ${JSON.stringify({ src: image.src, width: b.width, height: b.height, x: b.x - box.x, y: b.y - box.y, nativeWidth: image.naturalWidth, nativeHeight: image.naturalHeight })}`
        );
      if (!image.src.startsWith(location.origin)) throw new Error("Remote artwork");
      const css = getComputedStyle(button);
      if (hover && css.backgroundColor === "rgba(0, 0, 0, 0)")
        throw new Error("Missing hover fill");
      if (!hover && css.backgroundColor !== "rgba(0, 0, 0, 0)")
        throw new Error("Wrong default fill");
      if (css.borderRadius !== (fixture.getAttribute("data-shape") === "square" ? "3px" : "9999px"))
        throw new Error("Wrong shape");
    }
  });
  await page
    .locator(".badge-close-source-grid")
    .screenshot({ path: "test-results/badge-close-source.png" });
});
test("close action dismisses a caller-owned badge by keyboard and honors disabled state", async ({
  page,
}) => {
  await page.goto("/?section=badgegroups");
  const demo = page.getByRole("group", { name: "Interactive badge close actions" });
  const close = demo.getByRole("button", { name: "Remove selected badge" });
  await close.scrollIntoViewIfNeeded();
  await close.focus();
  expect(await close.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe("none");
  await close.press("Enter");
  await expect(close).toHaveCount(0);
  await expect(demo.locator("output")).toHaveText("Badge visible: false");
  await expect(demo.getByRole("button", { name: "Unavailable badge close" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
