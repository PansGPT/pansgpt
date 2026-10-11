import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Layer = [string, number, number, number, number];
type Source = { id: string; width: number; height: number; layers: Layer[] };
const geometry = JSON.parse(
  readFileSync(resolve(__dirname, "../design/slider-geometry.json"), "utf8")
) as { variants: Source[] }[];
test.beforeEach(async ({ page }) => {
  await page.goto("/?section=sliders");
  await expect(page.getByRole("heading", { name: "Sliders and control handles" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});
test("all 30 range compositions and nine handle states preserve source bounds", async ({
  page,
}) => {
  await expect(page.locator(".p-slider-source")).toHaveCount(30);
  await expect(page.locator(".slider-handle-fixture")).toHaveCount(9);
  await page.evaluate((geometry) => {
    const near = (a: number, b: number, label: string): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${label}: ${a} instead of ${b}`);
    };
    for (const [familyIndex, family] of geometry.entries())
      for (const source of family.variants) {
        const node = document.querySelector<HTMLElement>(
          familyIndex === 0
            ? `.p-slider-source[data-source-id="${source.id}"]`
            : `.slider-handle-fixture[data-source-id="${source.id}"] .p-slider-handle-reference`
        );
        if (!node) throw new Error("Missing source " + source.id);
        const box = node.getBoundingClientRect();
        near(box.width, source.width, "width");
        near(box.height, source.height, "height");
        const handles = Array.from(node.querySelectorAll<HTMLElement>(".p-slider-thumb"));
        const texts = Array.from(
          node.querySelectorAll<HTMLElement>(
            ".p-slider-value > span:not(.p-tooltip),.p-tooltip-title > span"
          )
        );
        const tips = Array.from(node.querySelectorAll<HTMLElement>(".p-tooltip"));
        let h = 0,
          t = 0,
          p = 0;
        for (const layer of source.layers) {
          const target =
            layer[0] === "Handle"
              ? handles[h++]
              : layer[0] === "Text"
                ? texts[t++]
                : layer[0] === "Tooltip"
                  ? tips[p++]
                  : node.querySelector<HTMLElement>(".p-slider-source-range");
          if (!target) throw new Error("Missing " + layer[0]);
          const rect = target.getBoundingClientRect();
          near(rect.x - box.x, layer[1], source.id + " " + layer[0] + " x");
          near(rect.y - box.y, layer[2], "y");
          near(rect.width, layer[3], "width");
          near(rect.height, layer[4], "height");
        }
      }
  }, geometry);
  await page.locator(".slider-source-grid").screenshot({ path: "test-results/sliders-source.png" });
  await page
    .locator(".slider-handle-grid")
    .screenshot({ path: "test-results/slider-handles-source.png" });
});
test("ranges support keyboard, pointer, minimum gaps, native form values, RTL and vertical input", async ({
  page,
}) => {
  const form = page.getByRole("form", { name: "Interactive range form" });
  const lower = form.getByRole("slider", { name: "Lower limit" });
  const upper = form.getByRole("slider", { name: "Upper limit" });
  await lower.focus();
  await page.keyboard.press("ArrowRight");
  await expect(lower).toHaveAttribute("aria-valuenow", "26");
  await expect(lower).toHaveAttribute("aria-valuetext", "26%");
  expect(await form.evaluate((n) => new FormData(n as HTMLFormElement).getAll("range[]"))).toEqual([
    "26",
    "75",
  ]);
  for (let step = 0; step < 45; step++) await page.keyboard.press("ArrowRight");
  await expect(lower).toHaveAttribute("aria-valuenow", "70");
  await upper.focus();
  await page.keyboard.press("ArrowLeft");
  await expect(upper).toHaveAttribute("aria-valuenow", "75");
  const track = form.locator(".p-slider-track").first();
  await track.scrollIntoViewIfNeeded();
  const box = await track.boundingBox();
  if (!box) throw new Error("Track missing");
  await page.mouse.click(box.x + box.width * 0.4, box.y + 4);
  await expect(lower).toHaveAttribute("aria-valuenow", "40");
  await form.getByRole("button", { name: "Reset range" }).click();
  await expect(lower).toHaveAttribute("aria-valuenow", "25");
  const rtl = form.getByRole("slider", { name: "RTL value" });
  await rtl.focus();
  await page.keyboard.press("ArrowRight");
  await expect(rtl).toHaveAttribute("aria-valuenow", "49");
  const vertical = form.getByRole("slider", { name: "Vertical value" });
  await vertical.focus();
  await page.keyboard.press("ArrowUp");
  await expect(vertical).toHaveAttribute("aria-valuenow", "51");
  const disabled = form.getByRole("slider", { name: "Disabled value" });
  await expect(disabled).toHaveAttribute("aria-disabled", "true");
  expect(await disabled.evaluate((node) => (node as HTMLElement).tabIndex)).toBe(-1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
