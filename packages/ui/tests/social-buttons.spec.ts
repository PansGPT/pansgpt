import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Source = {
  id: string;
  name: string;
  width: number;
  height: number;
  children: [string, number, number, number, number, string | null][];
};
const families = JSON.parse(
  readFileSync(resolve(__dirname, "../design/social-button-geometry.json"), "utf8")
) as { id: string; variants: Source[] }[];
test("all 108 social-button variants and six groups preserve source geometry and artwork", async ({
  page,
}) => {
  await page.goto("/?section=social");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".social-button-fixture")).toHaveCount(108);
  await expect(page.locator(".social-group-fixture")).toHaveCount(6);
  await page.evaluate(async (families) => {
    const near = (a: number, b: number): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${a} instead of ${b}`);
    };
    for (const source of families[0].variants) {
      const root = document.querySelector(`[data-source-id="${source.id}"]`);
      if (!root) throw new Error("Missing source");
      const box = root.getBoundingClientRect();
      near(box.width, source.width);
      near(box.height, source.height);
      for (const [name, x, y, width, height] of source.children) {
        const node = root.querySelector(name === "Text" ? ".p-button-text" : ".p-button-icon");
        if (!node) throw new Error("Missing layer");
        const b = node.getBoundingClientRect();
        near(b.x - box.x, x);
        near(b.y - box.y, y);
        near(b.width, width);
        near(b.height, height);
      }
      for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
        await image.decode();
        if (!image.src.startsWith(location.origin)) throw new Error("Remote artwork");
        const b = image.getBoundingClientRect();
        if (b.width) {
          near(b.width, image.naturalWidth);
          near(b.height, image.naturalHeight);
        }
      }
    }
    for (const source of families[1].variants) {
      const layout = /Style=(\w+)/.exec(source.name)?.[1].toLowerCase();
      const theme = /Theme=(\w+)/.exec(source.name)?.[1].toLowerCase();
      const root = document.querySelector(
        `.social-group-fixture[data-source-layout="${layout}"][data-source-theme="${theme}"]`
      );
      if (!root) throw new Error("Missing group");
      const box = root.getBoundingClientRect();
      near(box.width, source.width);
      near(box.height, source.height);
      const buttons = root.querySelectorAll("button");
      if (buttons.length !== 3) throw new Error("Incorrect provider count");
      for (const [index, button] of [...buttons].entries()) {
        const layer = source.children[index];
        const b = button.getBoundingClientRect();
        near(b.x - box.x, layer[1]);
        near(b.y - box.y, layer[2]);
        near(b.width, layer[3]);
        near(b.height, layer[4]);
      }
    }
  }, families);
  await page
    .locator(".social-source-grid")
    .screenshot({ path: "test-results/social-buttons-source.png" });
  await page
    .locator(".social-group-source-grid")
    .screenshot({ path: "test-results/social-groups-source.png" });
});
test("social groups expose native keyboard callbacks without starting authentication", async ({
  page,
}) => {
  await page.goto("/?section=social");
  const demo = page.getByRole("group", { name: "Interactive sign in choices" });
  const google = demo.getByRole("button", { name: "Sign in with Google" });
  await google.scrollIntoViewIfNeeded();
  await google.focus();
  await google.press("Enter");
  await expect(demo.locator("output")).toHaveText("Selected provider: google");
  await google.press("Tab");
  await page.keyboard.press("Space");
  await expect(demo.locator("output")).toHaveText("Selected provider: facebook");
  await demo.getByRole("button", { name: "Sign in with Apple" }).click();
  await expect(demo.locator("output")).toHaveText("Selected provider: apple");
  await expect(demo.getByRole("button", { name: "Unavailable sign in" })).toBeDisabled();
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(demo.locator("output")).toHaveText("Selected provider: apple");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
