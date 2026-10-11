import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Source = [string, string, number, number, [string, number, number, number, number][]];
const sources = JSON.parse(
  readFileSync(resolve(__dirname, "../design/badge-group-geometry.json"), "utf8")
) as Source[];
const hashes = Object.fromEntries(
  Array.from({ length: 10 }, (_, index) => {
    const file = `badge-group-imgDot${index === 0 ? "" : index}.svg`;
    return [
      file,
      createHash("sha256")
        .update(readFileSync(resolve(__dirname, `../assets/${file}`)))
        .digest("hex"),
    ];
  })
);

test("all eighty badge groups preserve source frames, badge/content positions and original glyphs", async ({
  page,
}) => {
  await page.goto("/?section=badgegroups");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".badge-group-fixture")).toHaveCount(80);
  await page.evaluate(
    async ({ sources, hashes }) => {
      const near = (a: number, b: number): void => {
        if (Math.abs(a - b) > 0.5) throw new Error(`${a} instead of ${b}`);
      };
      for (const [id, name, width, height, layers] of sources) {
        const root = document.querySelector(`[data-source-id="${id}"]`);
        if (!root) throw new Error("Missing source");
        const box = root.getBoundingClientRect();
        near(box.width, width);
        near(box.height, height);
        for (const [layer, x, y, w, h] of layers) {
          const node = root.querySelector(
            layer === "Badge" ? ".p-badge-group-badge" : ".p-badge-group-content"
          );
          if (!node) throw new Error("Missing layer");
          const b = node.getBoundingClientRect();
          near(b.x - box.x, x);
          near(b.y - box.y, y);
          near(b.width, w);
          near(b.height, h);
        }
        for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
          await image.decode();
          if (!image.src.startsWith(location.origin)) throw new Error("Remote asset");
          const b = image.getBoundingClientRect();
          if (b.width) {
            near(b.width, image.naturalWidth);
            near(b.height, image.naturalHeight);
          }
        }
        if (name.includes("modern") && !root.querySelector(".p-badge-group-dot"))
          throw new Error("Missing status dot");
        if (name.includes("modern")) {
          const color = /Color=(\w+)/.exec(name)?.[1];
          const large = name.includes("Trailing") && name.includes("Size=lg");
          const hover = name.includes("Trailing") && color === "Gray" && name.includes("Hover");
          const normal: Record<string, string> = {
            Brand: large ? "5" : "",
            Gray: large ? "6" : "1",
            Error: large ? "8" : "2",
            Warning: large ? "9" : "3",
            Success: large ? "6" : "1",
          };
          const suffix = hover ? (large ? "7" : "4") : normal[color ?? ""];
          const dot = [...root.querySelectorAll<HTMLImageElement>(".p-badge-group-dot img")].find(
            (image) => image.getBoundingClientRect().width > 0
          );
          if (!dot) throw new Error("Missing source dot for " + name);
          const bytes = await (await fetch(dot.src)).arrayBuffer();
          const digest = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
            .map((byte) => byte.toString(16).padStart(2, "0"))
            .join("");
          if (digest !== hashes[`badge-group-imgDot${suffix}.svg`])
            throw new Error("Wrong source dot for " + name);
          const slot = root.querySelector(".p-badge-group-dot")?.getBoundingClientRect();
          near(slot?.width ?? 0, large ? 10 : 8);
          near(slot?.height ?? 0, large ? 10 : 8);
        }
      }
    },
    { sources, hashes }
  );
  await page
    .locator(".badge-group-source-grid")
    .screenshot({ path: "test-results/badge-groups-source.png" });
});
test("badge-group actions support keyboard, real links, disabled state and wrapping", async ({
  page,
}) => {
  await page.goto("/?section=badgegroups");
  const demo = page.getByRole("group", { name: "Interactive badge groups" });
  const button = demo.getByRole("button", { name: /Inspect release/ });
  await button.click();
  await button.press("Enter");
  await button.press("Space");
  await expect(demo.locator("output")).toHaveText("Badge actions: 3");
  await expect(demo.getByRole("button", { name: /Disabled action/ })).toBeDisabled();
  await demo.getByRole("link", { name: /Inspect details/ }).click();
  await expect(page).toHaveURL(/#badge-group-details$/);
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(demo.locator("output")).toHaveText("Badge actions: 3");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(demo.locator(".p-badge-group").last().locator(".p-badge-group-arrow")).toHaveCount(
    0
  );
});
