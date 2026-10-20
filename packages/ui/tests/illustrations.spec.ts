import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { illustrationSources } from "../preview/illustration-source-data";

test("twelve illustration variants preserve native frames, visible source slots and local artwork", async ({
  page,
}) => {
  await openPreview(page, "/?section=empty");
  await expect(page.locator(".illustration-source-grid [data-source-id]")).toHaveCount(12);
  await page.evaluate(async (sources) => {
    const near = (actual: number, expected: number, label: string): void => {
      if (Math.abs(actual - expected) > 0.5)
        throw new Error(label + ": " + actual + " instead of " + expected);
    };
    for (const [id, , width, height, layers] of sources) {
      const root = document.querySelector(
        '.illustration-source-grid [data-source-id="' + id + '"] .p-illustration'
      )!;
      const box = root.getBoundingClientRect();
      near(box.width, width, id + " width");
      near(box.height, height, id + " height");
      const children = [...root.children];
      if (children.length !== layers.length) throw new Error(id + " wrong source layer count");
      for (const [i, [name, x, y, w, h]] of layers.entries()) {
        const child = children[i];
        if (child.getAttribute("data-name") !== name) throw new Error(id + " wrong layer order");
        const b = child.getBoundingClientRect();
        near(b.x - box.x, x, id + " " + name + " x");
        near(b.y - box.y, y, id + " " + name + " y");
        near(b.width, w, id + " " + name + " width");
        near(b.height, h, id + " " + name + " height");
      }
      for (const image of root.querySelectorAll("img")) {
        await image.decode();
        if (!image.naturalWidth || !image.naturalHeight || image.src.includes("figma.com"))
          throw new Error(id + " missing local artwork");
        const b = image.getBoundingClientRect();
        if (!b.width || !b.height) throw new Error(id + " empty asset slot");
      }
    }
  }, illustrationSources);
  await page
    .locator(".illustration-source-grid")
    .screenshot({ path: "test-results/illustrations-source.png" });
  await expect(page.getByRole("img", { name: "Documents waiting for upload" })).toBeVisible();
  await expect(
    page.locator(".illustration-source-grid [data-source-id] .p-illustration[aria-hidden=true]")
  ).toHaveCount(12);
});
