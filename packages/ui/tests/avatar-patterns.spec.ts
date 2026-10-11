import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Layer = [string, number, number, number, number];
type Source = { name: string; width: number; height: number; layers: Layer[] };
const geometry = JSON.parse(
  readFileSync(resolve(__dirname, "../design/avatar-pattern-geometry.json"), "utf8")
) as { variants: Source[] }[];
test.beforeEach(async ({ page }) => {
  await page.goto("/?section=avatars");
  await expect(page.getByRole("heading", { name: "Avatar groups and labels" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});
test("three avatar stacks, twelve add-button states and sixteen label groups match source geometry and original assets", async ({
  page,
}) => {
  await expect(page.locator(".avatar-group-fixture")).toHaveCount(3);
  await expect(page.locator(".avatar-add-fixture")).toHaveCount(12);
  await expect(page.locator(".avatar-label-fixture")).toHaveCount(16);
  await page.evaluate(async (geometry) => {
    const near = (a: number, b: number, name: string): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${name}: ${a} instead of ${b}`);
    };
    for (const [familyIndex, family] of geometry.entries())
      for (const source of family.variants) {
        const size = /Size=(\w+)/.exec(source.name)?.[1];
        const state = /State=(\w+)/.exec(source.name)?.[1].toLowerCase();
        const status = source.name.includes("Online indicator")
          ? "online"
          : source.name.includes("Company")
            ? "company"
            : source.name.includes("Verified")
              ? "verified"
              : "none";
        const node = document.querySelector<HTMLElement>(
          familyIndex === 0
            ? `.avatar-group-fixture[data-size="${size}"]`
            : familyIndex === 1
              ? `.avatar-add-fixture[data-size="${size}"][data-state="${state}"] > .p-avatar-add`
              : `.avatar-label-fixture[data-size="${size}"][data-status="${status}"]`
        );
        if (!node) throw new Error("Missing source");
        const b = node.getBoundingClientRect();
        near(b.width, source.width, source.name + " width");
        near(b.height, source.height, source.name + " height");
        const avatars = Array.from(node.querySelectorAll<HTMLElement>(".p-avatar"));
        let avatarIndex = 0;
        for (const layer of source.layers) {
          let target: HTMLElement | null = null;
          if (layer[0] === "Avatar") target = avatars[avatarIndex++];
          else if (layer[0] === "Avatars") target = node.querySelector(".p-avatar-stack");
          else if (layer[0] === "_Avatar add button") target = node.querySelector(".p-avatar-add");
          else if (layer[0] === "plus")
            target = node.querySelector(".p-avatar-add-glyph img:not([hidden])");
          else if (layer[0] === "Text and supporting text")
            target = node.querySelector(".p-avatar-label-copy");
          else if (layer[0] === "_Avatar online indicator")
            target = node.querySelector(".p-avatar-online");
          else if (layer[0] === "_Avatar company icon")
            target = node.querySelector(".p-avatar-company");
          else if (layer[0] === "Verified tick") target = node.querySelector(".p-avatar-verified");
          else if (familyIndex === 1 && layer[0] === "Tooltip" && layer[4] === 40)
            target = node.querySelector(".p-avatar-add-reference-tip");
          else if (layer[0] === "Cursor") target = node.querySelector(".p-avatar-add-cursor-slot");
          if (!target) continue;
          if (layer[0] === "plus") {
            target =
              Array.from(node.querySelectorAll<HTMLElement>(".p-avatar-add-glyph img")).find(
                (img) => img.getBoundingClientRect().width > 0
              ) ?? null;
            if (!target) throw new Error("Missing visible plus");
          }
          const r = target.getBoundingClientRect();
          near(r.x - b.x, layer[1], source.name + " " + layer[0] + " x");
          near(r.y - b.y, layer[2], "y");
          near(r.width, layer[3], "width");
          near(r.height, layer[4], "height");
        }
      }
    for (const image of document.querySelectorAll<HTMLImageElement>(
      ".avatar-group-fixture img,.avatar-add-fixture img,.avatar-label-fixture img"
    )) {
      await image.decode();
      if (!image.src.startsWith(location.origin) || image.naturalWidth === 0)
        throw new Error("Missing local artwork");
      if (image.src.endsWith(".svg")) {
        const b = image.getBoundingClientRect();
        if (b.width > 0) {
          near(b.width, image.naturalWidth, "SVG width");
          near(b.height, image.naturalHeight, "SVG height");
        }
      }
    }
  }, geometry);
  await page
    .locator(".avatar-group-source-grid")
    .screenshot({ path: "test-results/avatar-groups-source.png" });
  await page
    .locator(".avatar-add-source-grid")
    .screenshot({ path: "test-results/avatar-add-source.png" });
  await page
    .locator(".avatar-label-source-grid")
    .screenshot({ path: "test-results/avatar-labels-source.png" });
});
test("avatar group add/more controls work by keyboard, preserve counts and offer accessible hover and disabled behavior", async ({
  page,
}) => {
  const demo = page.getByRole("group", { name: "Interactive avatar group" });
  const group = demo.getByRole("group", { name: "Study group members" });
  const add = group.getByRole("button", { name: "Add user" });
  await add.scrollIntoViewIfNeeded();
  await add.focus();
  await expect(page.locator(".p-avatar-add-tooltip:visible")).toContainText("Add user");
  await page.keyboard.press("Escape");
  await page.keyboard.press("Enter");
  await expect(demo.locator("output")).toHaveText("Members: 4; more actions: 0");
  const more = group.getByRole("button", { name: "2 more users" });
  await more.focus();
  await page.keyboard.press("Space");
  await expect(demo.locator("output")).toHaveText("Members: 4; more actions: 1");
  await expect(group.getByRole("img")).toHaveCount(2);
  await expect(demo.getByRole("button", { name: "Unavailable add action" })).toBeDisabled();
  await expect(demo.getByRole("link", { name: "student@example.com" })).toHaveAttribute(
    "href",
    "mailto:student@example.com"
  );
  await add.hover();
  await expect(page.locator(".p-avatar-add-tooltip:visible")).toBeVisible();
  expect(
    await add
      .locator(".p-avatar-add-hover img")
      .evaluate((n) => (n as HTMLImageElement).naturalWidth)
  ).toBe(20);
  await page.mouse.move(0, 0, { steps: 8 });
  await expect(page.locator(".p-avatar-add-tooltip:visible")).toHaveCount(0);
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(group.getByRole("button", { name: "2 more users" })).toBeVisible();
    await expect(demo.locator("output")).toHaveText("Members: 4; more actions: 1");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
