import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
type Layer = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children?: Layer[];
};
type Source = { name: string; width: number; height: number; children: Layer[] };
const sources = JSON.parse(
  readFileSync(resolve(__dirname, "../design/app-store-geometry.json"), "utf8")
) as Source[];
test("all twenty app-store badges preserve source frames and native artwork", async ({ page }) => {
  await openPreview(page, "/?section=close");
  await expect(page.locator(".app-store-fixture")).toHaveCount(20);
  await page.evaluate(async (sources) => {
    const stores: Record<string, string> = {
      "Google Play": "googlePlay",
      "App Store": "appStore",
      "Mac App Store": "macAppStore",
      "Galaxy Store": "galaxyStore",
      AppGallery: "appGallery",
    };
    const near = (a: number, b: number): void => {
      if (Math.abs(a - b) > 0.1) throw new Error(`${a} instead of ${b}`);
    };
    for (const source of sources) {
      const store = stores[/Store=([^,]+)/.exec(source.name)?.[1] ?? ""];
      const variant = /Style=(\w+)/.exec(source.name)?.[1].toLowerCase();
      const size = /Size=(\w+)/.exec(source.name)?.[1];
      const root = document.querySelector(
        `.app-store-fixture[data-store="${store}"][data-variant="${variant}"][data-size="${size}"]`
      );
      if (!root) throw new Error("Missing source variant");
      const box = root.getBoundingClientRect();
      near(box.width, source.width);
      near(box.height, source.height);
      for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
        await image.decode();
        if (!image.src.startsWith(location.origin)) throw new Error("Remote asset");
        if (image.src.endsWith(".svg")) {
          const svg = new DOMParser().parseFromString(
            await (await fetch(image.src)).text(),
            "image/svg+xml"
          ).documentElement;
          near(image.getBoundingClientRect().width, parseFloat(svg.getAttribute("width") ?? "0"));
          near(image.getBoundingClientRect().height, parseFloat(svg.getAttribute("height") ?? "0"));
        }
      }
      if (store === "galaxyStore" && variant === "brand") {
        const layers = source.children.flatMap((c) =>
          c.children ? c.children.filter((g) => g.name !== "image") : [c]
        );
        const classes: Record<string, string> = {
          "Galaxy Store": "name",
          "Available on": "caption",
          gradient: "gradient",
          bag: "bag",
        };
        for (const layer of layers) {
          const image = root.querySelector(`.p-app-store-galaxy-${classes[layer.name]}`);
          if (!image) throw new Error("Missing Galaxy layer");
          const b = image.getBoundingClientRect();
          near(b.x - box.x, layer.x);
          near(b.y - box.y, layer.y);
          near(b.width, layer.width);
          near(b.height, layer.height);
        }
      }
    }
  }, sources);
  await page
    .locator(".app-store-source-grid")
    .screenshot({ path: "test-results/app-store-badges-source.png" });
  await page.getByRole("link", { name: "Inspect app-store example" }).click();
  await expect(page).toHaveURL(/#app-store-demo$/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
