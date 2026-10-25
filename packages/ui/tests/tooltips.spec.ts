import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { focusByKeyboard, openPreview } from "./open-preview";

type SourceChild = { name: string; x: number; y: number; width: number; height: number };
type SourceVariant = {
  id: string;
  name: string;
  width: number;
  height: number;
  children: SourceChild[];
};
const geometry = JSON.parse(
  readFileSync(resolve(__dirname, "../design/tooltip-geometry.json"), "utf8")
) as { name: string; variants: SourceVariant[] }[];

test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=tooltips");
  await page.evaluate(() => document.fonts.ready);
});

test("all 14 tooltip and 28 help-icon variants preserve source geometry and native assets", async ({
  page,
}) => {
  test.setTimeout(60000);
  await expect(page.locator(".tooltip-source-fixture")).toHaveCount(14);
  await expect(page.locator(".p-help-reference")).toHaveCount(28);
  await page.evaluate(async (source) => {
    const near = (actual: number, expected: number, label: string): void => {
      if (Math.abs(actual - expected) > 0.5)
        throw new Error(`${label}: ${actual} instead of ${expected}`);
    };
    for (const family of source)
      for (const variant of family.variants) {
        const supporting = variant.name.includes("Supporting text=True");
        const arrow = /Arrow=([^,]+)/.exec(variant.name)?.[1]?.toLowerCase().replaceAll(" ", "-");
        const placement = /Tooltip=([^,]+)/
          .exec(variant.name)?.[1]
          ?.toLowerCase()
          .replaceAll(" ", "-");
        const visible = variant.name.includes("Open=True");
        const node = document.querySelector<HTMLElement>(
          family.name === "Tooltip"
            ? `.tooltip-source-fixture[data-supporting="${supporting}"][data-arrow="${arrow}"] > .p-tooltip`
            : `.p-help-reference[data-supporting="${supporting}"][data-placement="${placement}"][data-open="${visible}"]`
        );
        if (!node) throw new Error(`Missing ${variant.id}`);
        const bounds = node.getBoundingClientRect();
        near(bounds.width, variant.width, `${variant.id} width`);
        near(bounds.height, variant.height, `${variant.id} height`);
        if (family.name === "Help icon" && visible) {
          const tooltip = node.querySelector<HTMLElement>(".p-tooltip");
          const child = variant.children.find((item) => item.name === "Tooltip");
          if (!tooltip || !child) throw new Error("Missing help tooltip");
          const tip = tooltip.getBoundingClientRect();
          near(tip.x - bounds.x, child.x, `${variant.id} tooltip x`);
          near(tip.y - bounds.y, child.y, `${variant.id} tooltip y`);
          near(tip.width, child.width, `${variant.id} tooltip width`);
          near(tip.height, child.height, `${variant.id} tooltip height`);
        }
        for (const img of node.querySelectorAll<HTMLImageElement>("img")) {
          if (!img.getBoundingClientRect().width) continue;
          await img.decode();
          const style = getComputedStyle(img);
          near(parseFloat(style.width), img.naturalWidth, `${variant.id} SVG width`);
          near(parseFloat(style.height), img.naturalHeight, `${variant.id} SVG height`);
          if (!img.src.startsWith(location.origin)) throw new Error("Remote tooltip asset");
        }
      }
  }, geometry);
  await page.locator(".tooltip-source-grid").screenshot({ path: "test-results/tooltips.png" });
  await page.locator(".help-source-grid").screenshot({ path: "test-results/help-icons.png" });
});

test("help tooltips open by keyboard and hover, dismiss, flip at viewport edges and honor controlled state", async ({
  page,
}) => {
  const demo = page.getByRole("group", { name: "Interactive tooltip example" });
  const help = demo.getByRole("button", { name: "Study tips", exact: true });
  await focusByKeyboard(help);
  const tip = page.locator(".p-tooltip-positioner:visible");
  await expect(tip).toContainText("Read the source document");
  await expect(help).toHaveAttribute("aria-describedby", /.+/);
  await expect(help.locator("img")).toHaveAttribute("src", /help-imgOpenTrue/);
  await page.keyboard.press("Escape");
  await expect(tip).toHaveCount(0);
  await expect(help).toBeFocused();
  await help.hover();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0, { steps: 8 });
  await expect(tip).toHaveCount(0);
  await help.evaluate((node) => {
    node.style.position = "fixed";
    node.style.top = "8px";
    node.style.left = "160px";
  });
  await focusByKeyboard(help);
  await expect(tip).toHaveAttribute("data-side", "bottom");
  await expect(tip.locator('.p-tooltip-arrow[data-arrow="top-center"]')).toBeVisible();
  await expect(tip.locator('.p-tooltip-arrow[data-arrow="bottom-center"]')).toBeHidden();
  await page.keyboard.press("Escape");
  await demo.getByRole("button", { name: "Disabled help" }).hover();
  await expect(tip).toHaveCount(0);
  await demo.getByRole("button", { name: "Show controlled tooltip" }).click();
  await expect(tip).toContainText("Controlled tooltip");
  await demo.getByRole("button", { name: "Hide controlled tooltip" }).click();
  await expect(tip).toHaveCount(0);
});
