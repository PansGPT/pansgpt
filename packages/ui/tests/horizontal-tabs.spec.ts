import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

type Source = [string, string, number, number, [string, number, number, number, number][]];
const buttons = JSON.parse(
  readFileSync(resolve(__dirname, "../design/tab-button-geometry.json"), "utf8")
) as Source[];
const layouts = JSON.parse(
  readFileSync(resolve(__dirname, "../design/horizontal-tabs-geometry.json"), "utf8")
) as Source[];

test("all 72 tab-button states and 40 horizontal layouts match source bounds", async ({ page }) => {
  await openPreview(page, "/?section=tabs");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".tab-button-fixture")).toHaveCount(72);
  await expect(page.locator(".horizontal-tab-fixture")).toHaveCount(40);
  await page.evaluate(
    async ({ buttons, layouts }) => {
      const near = (actual: number, expected: number, message: string): void => {
        if (Math.abs(actual - expected) > 0.5)
          throw new Error(`${message}: ${actual} instead of ${expected}`);
      };
      for (const [id, name, width, height, children] of buttons) {
        const root = document.querySelector(`[data-source-id="${id}"]`);
        if (!root) throw new Error(`Missing ${id}`);
        const box = root.getBoundingClientRect();
        near(box.width, width, `${name} width`);
        near(box.height, height, `${name} height`);
        for (const [layer, x, y, w, h] of children) {
          const node = root.querySelector(layer === "Text" ? ".p-tab-button-label" : ".p-badge");
          if (!node) throw new Error(`Missing ${layer}`);
          const b = node.getBoundingClientRect();
          near(b.x - box.x, x, `${name} ${layer} x`);
          near(b.y - box.y, y, `${name} ${layer} y`);
          near(b.width, w, `${name} ${layer} width`);
          near(b.height, h, `${name} ${layer} height`);
        }
        const css = getComputedStyle(root);
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const paint = canvas.getContext("2d");
        if (!paint) throw new Error("Missing color check");
        paint.fillStyle = css.backgroundColor;
        paint.fillRect(0, 0, 1, 1);
        const transparent = paint.getImageData(0, 0, 1, 1).data[3] === 0;
        const current = name.includes("Current=True");
        const hover = name.includes("State=Hover");
        const focus = name.includes("State=Focus");
        if (name.includes("Button minimal") && !current && !focus && !transparent)
          throw new Error("Inactive minimal tab acquired a fill");
        if (name.includes("Button white") && (current || hover) && css.boxShadow === "none")
          throw new Error("Missing white tab shadow");
        if (
          focus &&
          !name.includes("Underline") &&
          !name.includes("Line (") &&
          css.boxShadow === "none"
        )
          throw new Error("Missing source focus ring");
      }
      for (const [id, name, width, height, children] of layouts) {
        const root = document.querySelector(`[data-source-id="${id}"]`);
        if (!root) throw new Error(`Missing ${id}`);
        const box = root.getBoundingClientRect();
        near(box.width, width, `${name} width`);
        near(box.height, height, `${name} height`);
        const mobile = name.includes("Mobile");
        const nodes = mobile
          ? root.querySelectorAll(".p-select-trigger")
          : name.includes("Underline")
            ? root.querySelectorAll(".p-tabs-list")
            : root.querySelectorAll(".p-tab-button");
        if (nodes.length !== children.length) throw new Error(`${name}: incorrect layer count`);
        for (const [index, node] of [...nodes].entries()) {
          const [, x, y, w, h] = children[index];
          const b = node.getBoundingClientRect();
          near(b.x - box.x, x, `${name} layer ${index} x`);
          near(b.y - box.y, y, `${name} layer ${index} y`);
          near(b.width, w, `${name} layer ${index} width`);
          near(b.height, h, `${name} layer ${index} height`);
        }
        if (mobile) {
          const image = root.querySelector<HTMLImageElement>("img");
          if (!image) throw new Error("Missing mobile chevron");
          await image.decode();
          const b = image.getBoundingClientRect();
          if (
            !image.src.startsWith(location.origin) ||
            image.naturalWidth !== 20 ||
            image.naturalHeight !== 20 ||
            b.width !== 20 ||
            b.height !== 20
          )
            throw new Error("Changed native chevron");
        }
      }
    },
    { buttons, layouts }
  );
  await page
    .locator(".tab-button-source-grid")
    .screenshot({ path: "test-results/tab-buttons-source.png" });
  await page
    .locator(".horizontal-tabs-source-grid")
    .screenshot({ path: "test-results/horizontal-tabs-source.png" });
});

test("automatic and manual tabs retain selection across keyboard, themes and mobile", async ({
  page,
}) => {
  await openPreview(page, "/?section=tabs");
  const demo = page.getByRole("group", { name: "Interactive horizontal tabs" });
  const automatic = demo.getByRole("tablist", { name: "Study sections" });
  const overview = automatic.getByRole("tab", { name: "Overview" });
  const notes = automatic.getByRole("tab", { name: "Notes 2" });
  const review = automatic.getByRole("tab", { name: "Review" });
  await overview.scrollIntoViewIfNeeded();
  await overview.focus();
  await overview.press("ArrowRight");
  await expect(notes).toBeFocused();
  await expect(notes).toHaveAttribute("aria-selected", "true");
  await expect(demo.locator("output")).toHaveText("Selected: 1; changes: 1");
  await notes.press("ArrowRight");
  await expect(review).toBeFocused();
  await expect(demo.getByRole("tabpanel", { name: "Review" })).toHaveText("Review panel");
  await expect(automatic.getByRole("tab", { name: "Unavailable" })).toBeDisabled();
  const manual = demo.getByRole("tablist", { name: "Manual study tabs" });
  await manual.getByRole("tab", { name: "My details" }).focus();
  await page.keyboard.press("ArrowRight");
  const profile = manual.getByRole("tab", { name: "Profile" });
  await expect(profile).toBeFocused();
  await expect(profile).toHaveAttribute("aria-selected", "false");
  await profile.press("Enter");
  await expect(profile).toHaveAttribute("aria-selected", "true");
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(review).toHaveAttribute("aria-selected", "true");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(automatic).toBeHidden();
  const select = demo.getByRole("combobox", { name: "Study sections" });
  await expect(select).toHaveText("Review");
  await select.click();
  await expect(page.getByRole("option", { name: "Unavailable" })).toHaveAttribute(
    "data-disabled",
    ""
  );
  await page.getByRole("option", { name: "Notes" }).click();
  await expect(demo.locator("output")).toHaveText("Selected: 1; changes: 3");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await expect(notes).toHaveAttribute("aria-selected", "true");
  await expect(demo.getByRole("tabpanel", { name: "Notes 2" })).toHaveText("Notes panel");
});
