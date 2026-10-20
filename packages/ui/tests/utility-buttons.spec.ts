import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
type Source = {
  name: string;
  width: number;
  height: number;
  children: { name: string; x: number; y: number; width: number; height: number }[];
};
const sources = JSON.parse(
  readFileSync(resolve(__dirname, "../design/utility-button-geometry.json"), "utf8")
) as Source[];
test("all sixteen utility references preserve source geometry and original artwork", async ({
  page,
}) => {
  await openPreview(page, "/?section=close");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await expect(page.locator(".utility-button-fixture")).toHaveCount(16);
  await page.evaluate(async (sources) => {
    const near = (a: number, b: number): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${a} instead of ${b}`);
    };
    for (const source of sources) {
      const size = /Size=(\w+)/.exec(source.name)?.[1];
      const variant = /Hierarchy=(\w+)/.exec(source.name)?.[1].toLowerCase();
      const state = /State=(\w+)/.exec(source.name)?.[1].toLowerCase();
      const fixture = document.querySelector(
        `.utility-button-fixture[data-size="${size}"][data-variant="${variant}"][data-state="${state}"]`
      );
      const root = fixture?.querySelector(".p-utility-reference");
      const button = fixture?.querySelector("button");
      if (!root || !button) throw new Error("Missing variant");
      const box = button.getBoundingClientRect();
      near(box.width, source.width);
      near(box.height, source.height);
      for (const child of source.children) {
        const target = root.querySelector(
          child.name === "Tooltip"
            ? ".p-utility-reference-tooltip"
            : child.name === "Cursor"
              ? ".p-utility-reference-cursor"
              : state === "hover"
                ? ".p-utility-hover"
                : ".p-utility-normal"
        );
        if (!target) throw new Error("Missing child");
        const b = target.getBoundingClientRect();
        near(b.x - box.x, child.x);
        near(b.y - box.y, child.y);
        near(b.width, child.width);
        near(b.height, child.height);
      }
      for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
        await image.decode();
        if (!image.src.startsWith(location.origin)) throw new Error("Remote artwork");
        if (getComputedStyle(image).display === "none" || !image.getBoundingClientRect().width)
          continue;
        near(image.getBoundingClientRect().width, image.naturalWidth);
        near(image.getBoundingClientRect().height, image.naturalHeight);
      }
    }
  }, sources);
  await page
    .locator(".utility-button-source-grid")
    .screenshot({ path: "test-results/utility-buttons-source.png" });
});
test("utility controls retain native actions and keyboard tooltip behavior", async ({ page }) => {
  await openPreview(page, "/?section=close");
  const demo = page.getByRole("group", { name: "Interactive utility buttons" });
  const action = demo.getByRole("button", { name: "Utility action", exact: true });
  await action.scrollIntoViewIfNeeded();
  await action.focus();
  await expect(page.getByRole("tooltip")).toContainText("Utility action");
  await action.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await action.press("Enter");
  await action.press("Space");
  await expect(demo.locator("output")).toHaveText("Utility actions: 2");
  await expect(demo.getByRole("button", { name: "Unavailable utility action" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
