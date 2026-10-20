import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
type Tip = { x: number; y: number; w: number; h: number };
type Bar = [string, string, number, number, number, number, Tip | null];
type Circle = {
  id: string;
  name: string;
  width: number;
  height: number;
  children: { name: string; x: number; y: number; w: number; h: number }[];
};
type Loading = {
  id: string;
  name: string;
  width: number;
  height: number;
  graphic: { w: number; h: number };
};
const progress = JSON.parse(
  readFileSync(resolve(__dirname, "../design/progress-geometry.json"), "utf8")
) as { bars: Bar[]; circles: Circle[] };
const loading = JSON.parse(
  readFileSync(resolve(__dirname, "../design/loading-geometry.json"), "utf8")
) as Loading[];
test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=indicators");
  await page.evaluate(() => document.fonts.ready);
});

test("all 55 bar, 10 circle and 12 loading references retain source dimensions and original SVGs", async ({
  page,
}) => {
  await expect(page.locator(".progress-source-fixture")).toHaveCount(55);
  await expect(page.locator(".circle-source-fixture")).toHaveCount(10);
  await expect(page.locator(".spinner-source-fixture")).toHaveCount(12);
  await page.evaluate(
    async ({ progress, loading }) => {
      const near = (actual: number, expected: number, label: string): void => {
        if (Math.abs(actual - expected) > 0.5)
          throw new Error(`${label}: ${actual} instead of ${expected}`);
      };
      for (const [id, , width, height, trackWidth, fillWidth, tip] of progress.bars) {
        const root = document.querySelector<HTMLElement>(
          `.progress-source-fixture[data-source-id="${id}"] .p-progress`
        );
        const track = root?.querySelector<HTMLElement>(".p-progress-track");
        const fill = root?.querySelector<HTMLElement>(".p-progress-fill");
        if (!root || !track || !fill) throw new Error(`Missing ${id}`);
        const box = root.getBoundingClientRect();
        near(box.width, width, `${id} width`);
        near(box.height, height, `${id} height`);
        near(track.getBoundingClientRect().width, trackWidth, `${id} track`);
        near(fill.getBoundingClientRect().width, fillWidth, `${id} fill`);
        if (tip) {
          const bubble = root.querySelector<HTMLElement>(".p-progress-bubble");
          if (!bubble) throw new Error("Missing label");
          const b = bubble.getBoundingClientRect();
          near(b.x - box.x, tip.x, `${id} tooltip x`);
          near(b.y - box.y, tip.y, `${id} tooltip y`);
          near(b.width, tip.w, `${id} tooltip width`);
          near(b.height, tip.h, `${id} tooltip height`);
        }
      }
      for (const circle of progress.circles) {
        const size = /Size=(\w+)/.exec(circle.name)?.[1];
        const shape = circle.name.includes("Half circle") ? "half-circle" : "circle";
        const node = document.querySelector<HTMLElement>(
          `.circle-source-fixture[data-size="${size}"][data-shape="${shape}"] .p-progress-circle`
        );
        if (!node) throw new Error(`Missing ${circle.id}`);
        const box = node.getBoundingClientRect();
        near(box.width, circle.width, `${circle.id} width`);
        near(box.height, circle.height, `${circle.id} height`);
        const numbers = circle.children.find((c) => c.name === "Number and label");
        if (numbers) {
          const b = node
            .querySelector<HTMLElement>(".p-progress-circle-number")
            ?.getBoundingClientRect();
          if (!b) throw new Error("Missing numbers");
          near(b.y - box.y, numbers.y, `${circle.id} numbers y`);
          near(b.height, numbers.h, `${circle.id} numbers height`);
        }
      }
      for (const source of loading) {
        const size = /Size=(\w+)/.exec(source.name)?.[1];
        const variant = /Style=([^,]+)/.exec(source.name)?.[1].toLowerCase().replaceAll(" ", "-");
        const node = document.querySelector<HTMLElement>(
          `.spinner-source-fixture[data-size="${size}"][data-variant="${variant}"] .p-spinner`
        );
        if (!node) throw new Error(`Missing ${source.id}`);
        const box = node.getBoundingClientRect();
        near(box.width, source.width, `${source.id} width`);
        near(box.height, source.height, `${source.id} height`);
        const graphic = node
          .querySelector<HTMLElement>(".p-spinner-graphic")
          ?.getBoundingClientRect();
        if (!graphic) throw new Error("Missing spinner");
        near(graphic.width, source.graphic.w, `${source.id} graphic width`);
      }
      for (const img of document.querySelectorAll<HTMLImageElement>(
        ".spinner-source-fixture img,.circle-source-fixture img"
      )) {
        await img.decode();
        const box = img.getBoundingClientRect();
        near(box.width, img.naturalWidth, "Original SVG width");
        near(box.height, img.naturalHeight, "Original SVG height");
        if (!img.src.startsWith(location.origin)) throw new Error("Remote asset");
      }
    },
    { progress, loading }
  );
  await page
    .locator(".circle-source-grid")
    .first()
    .screenshot({ path: "test-results/progress-circles-source.png" });
  await page
    .locator(".spinner-source-grid")
    .screenshot({ path: "test-results/loading-indicators.png" });
  for (const graphic of await page
    .locator('.spinner-source-fixture[data-variant="dot-circle"] .p-spinner-graphic')
    .all()) {
    const capture = await graphic.screenshot();
    const greenPixels = await page.evaluate(
      async (url) => {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Missing pixel context");
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        let count = 0;
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i + 1] > pixels[i] + 40 && pixels[i + 1] > pixels[i + 2] + 25) count++;
        return count;
      },
      "data:image/png;base64," + capture.toString("base64")
    );
    expect(greenPixels, "Dot spinner must contain visible original green artwork").toBeGreaterThan(
      10
    );
  }
});

test("live progress clamps values and uses consistent full/half scales while loading respects reduced motion", async ({
  page,
}) => {
  const demo = page.getByRole("group", { name: "Interactive progress example" });
  await expect(demo.getByRole("progressbar")).toHaveCount(15);
  for (const [action, value] of [
    ["Set progress to 75", "75"],
    ["Reset progress", "0"],
    ["Complete progress", "100"],
    ["Invalid progress value", "0"],
  ]) {
    await demo.getByRole("button", { name: action }).click();
    for (const bar of await demo.getByRole("progressbar").all())
      await expect(bar).toHaveAttribute("aria-valuenow", value);
    await demo.locator(".p-progress-circle").evaluateAll((nodes, value) => {
      for (const node of nodes) {
        const half = node.getAttribute("data-shape") === "half-circle";
        const angle = parseFloat((node as HTMLElement).style.getPropertyValue("--circle-angle"));
        if (Math.abs(angle - Number(value) * (half ? 1.8 : 3.6)) > 0.001)
          throw new Error("Incorrect percent scale");
      }
    }, value);
  }
  const loader = page.getByRole("group", { name: "Interactive loading example" });
  await loader.getByRole("button", { name: "Toggle loading label" }).click();
  await expect(loader.getByRole("status", { name: "Fetching documents" })).toBeVisible();
  await expect(loader.locator(".p-spinner > span:not(.p-spinner-graphic)")).toHaveCount(0);
  await loader.getByRole("button", { name: "Toggle loading animation" }).click();
  expect(
    await loader.locator(".p-spinner-graphic").evaluate((n) => getComputedStyle(n).animationName)
  ).toBe("none");
  await loader.getByRole("button", { name: "Toggle loading animation" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await loader.locator(".p-spinner-graphic").evaluate((n) => getComputedStyle(n).animationName)
  ).toBe("none");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
