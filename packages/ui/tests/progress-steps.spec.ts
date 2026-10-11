import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Source = [string, string, number, number, [string, number, number, number, number][]];
const families = JSON.parse(
  readFileSync(resolve(__dirname, "../design/step-geometry.json"), "utf8")
) as { id: string; variants: Source[] }[];
const layers = JSON.parse(
  readFileSync(resolve(__dirname, "../design/step-layers.json"), "utf8")
) as [string, [string, number, number, number, number][]][];
test("all forty-two progress step layouts match text, icon and connector bounds", async ({
  page,
}) => {
  await page.goto("/?section=steps");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".step-base-source-grid .p-progress-step")).toHaveCount(42);
  await page.evaluate(
    async ({ sources, layers }) => {
      const near = (a: number, b: number, message: string): void => {
        if (Math.abs(a - b) > 0.5) throw new Error(`${message}: ${a} instead of ${b}`);
      };
      for (const [id, name, width, height, children] of sources) {
        const root = document.querySelector(`[data-source-id="${id}"]`);
        if (!root) throw new Error("Missing step");
        const box = root.getBoundingClientRect();
        near(box.width, width, name);
        near(box.height, height, name);
        for (const [layer, x, y, w, h] of children) {
          const selector =
            layer === "Connector wrap"
              ? ".p-step-connector-wrap"
              : layer === "_Step icon base"
                ? ".p-step-icon"
                : layer === "Featured icon"
                  ? ".p-step-featured-icon"
                  : ".p-step-content";
          const node = root.querySelector(selector);
          if (!node) throw new Error(`Missing ${layer}`);
          const b = node.getBoundingClientRect();
          near(b.x - box.x, x, `${name} ${layer} x`);
          near(b.y - box.y, y, `${name} ${layer} y`);
          near(b.width, w, `${name} ${layer} width`);
          near(b.height, h, `${name} ${layer} height`);
        }
        const nested = layers.find((layer) => layer[0] === id)?.[1] ?? [];
        for (const [layer, x, y, w, h] of nested) {
          const selector =
            layer === "Connector"
              ? ".p-step-connector-slot img"
              : layer === "user-01"
                ? ".p-step-featured-icon img"
                : layer === "Supporting text"
                  ? ".p-step-supporting"
                  : w < 10
                    ? ".p-step-number"
                    : ".p-step-title";
          const node = root.querySelector(selector);
          if (!node) throw new Error(`Missing nested ${layer}`);
          const b = node.getBoundingClientRect();
          const connector = layer === "Connector";
          near(b.x - box.x, x - (connector ? 1 : 0), `${name} ${layer} x`);
          near(b.y - box.y, y - (connector ? 1 : 0), `${name} ${layer} y`);
          near(b.width, connector ? 2 : w, `${name} ${layer} width`);
          near(b.height, connector ? h + 2 : h, `${name} ${layer} height`);
        }
        for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
          await image.decode();
          if (!image.src.startsWith(location.origin)) throw new Error("Remote artwork");
          const b = image.getBoundingClientRect();
          const connector = Boolean(image.closest(".p-step-connector-slot"));
          near(
            b.width,
            connector ? image.naturalHeight : image.naturalWidth,
            "Native artwork width"
          );
          near(
            b.height,
            connector ? image.naturalWidth : image.naturalHeight,
            "Native artwork height"
          );
        }
        if ((root.getAttribute("aria-current") === "step") !== name.includes("Status=Current"))
          throw new Error("Wrong current-step semantics");
      }
    },
    { sources: families[1].variants, layers }
  );
  await page
    .locator(".step-base-source-grid")
    .screenshot({ path: "test-results/step-bases-source.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("all twelve progress step icons preserve native artwork and number geometry", async ({
  page,
}) => {
  await page.goto("/?section=steps");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".step-icon-source-grid .p-step-icon")).toHaveCount(12);
  await page.evaluate(async (sources) => {
    const near = (a: number, b: number): void => {
      if (Math.abs(a - b) > 0.5) throw new Error(`${a} instead of ${b}`);
    };
    for (const [id, name, width, height, children] of sources) {
      const root = document.querySelector(`[data-source-id="${id}"]`);
      if (!root) throw new Error("Missing step icon");
      const box = root.getBoundingClientRect();
      near(box.width, width);
      near(box.height, height);
      if (root.getAttribute("aria-hidden") !== "true") throw new Error("Decorative icon exposed");
      const number = root.querySelector(".p-step-number");
      if (number) {
        const b = number.getBoundingClientRect();
        const [, x, y, w, h] = children[0];
        near(b.x - box.x, x);
        near(b.y - box.y, y);
        near(b.width, w);
        near(b.height, h);
      } else {
        const image = root.querySelector<HTMLImageElement>("img");
        if (!image) throw new Error("Missing original glyph");
        await image.decode();
        const b = image.getBoundingClientRect();
        if (!image.src.startsWith(location.origin)) throw new Error("Remote artwork");
        near(b.width, image.naturalWidth);
        near(b.height, image.naturalHeight);
        if (name.includes("Status=Current")) {
          near(b.x - box.x, -4);
          near(b.y - box.y, -4);
          near(b.width, width + 8);
          near(b.height, height + 8);
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Missing pixel context");
          context.drawImage(image, 0, 0);
          const alpha = context.getImageData(2, image.naturalWidth === 40 ? 6 : 4, 1, 1).data[3];
          if (alpha > 10) throw new Error("Current-step ring contour is not circular");
          const edge = context.getImageData(image.naturalWidth / 2, 1, 1, 1).data;
          if (edge[3] < 100 || edge[1] <= edge[0]) throw new Error("Missing green outer ring");
        } else if (name.includes("Status=Complete")) {
          const [, x, y, w, h] = children[0];
          near(b.x - box.x, x);
          near(b.y - box.y, y);
          near(b.width, w);
          near(b.height, h);
        } else {
          near(b.x - box.x, 0);
          near(b.y - box.y, 0);
          near(b.width, width);
          near(b.height, height);
        }
      }
    }
  }, families[0].variants);
  await expect(page.getByRole("img", { name: "Current step 12" })).toHaveText("12");
  await page
    .locator(".step-icon-source-grid")
    .screenshot({ path: "test-results/step-icons-source.png" });
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(page.getByRole("img", { name: "Current step 12" })).toHaveText("12");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
