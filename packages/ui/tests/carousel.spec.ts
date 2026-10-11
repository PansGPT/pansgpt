import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
type Source = [string, string, number, number, [string, number, number, number, number][]];
const families = JSON.parse(
  readFileSync(resolve(__dirname, "../design/carousel-geometry.json"), "utf8")
) as { id: string; variants: Source[] }[];

test("four carousel arrows and both image layouts preserve source artwork and bounds", async ({
  page,
}) => {
  await page.goto("/?section=carousel");
  await expect(page.locator("[data-source-id]")).toHaveCount(6);
  await page.evaluate(async (families) => {
    const near = (actual: number, expected: number): void => {
      if (Math.abs(actual - expected) > 0.5) throw new Error(`${actual} instead of ${expected}`);
    };
    for (const family of families)
      for (const [id, , width, height, children] of family.variants) {
        const root = document.querySelector(`[data-source-id="${id}"]`);
        if (!root) throw new Error("Missing source");
        const box = root.getBoundingClientRect();
        near(box.width, width);
        near(box.height, height);
        const nodes =
          family.id === "1253:164"
            ? root.querySelectorAll(".p-button-icon")
            : root.querySelectorAll(".p-carousel-dots, .p-carousel-arrow");
        // Source layers put the dots before the two arrows.
        const ordered =
          family.id === "1253:164"
            ? [...nodes]
            : [
                root.querySelector(".p-carousel-dots")!,
                ...root.querySelectorAll(".p-carousel-arrow"),
              ];
        if (ordered.length !== children.length) throw new Error("Wrong layer count");
        for (const [index, node] of ordered.entries()) {
          const [, x, y, w, h] = children[index];
          const b = node.getBoundingClientRect();
          near(b.x - box.x, x);
          near(b.y - box.y, y);
          near(b.width, w);
          near(b.height, h);
        }
        for (const image of root.querySelectorAll<HTMLImageElement>("img")) {
          await image.decode();
          if (!image.src.startsWith(location.origin) || image.naturalWidth === 0)
            throw new Error("Missing local artwork");
          const b = image.getBoundingClientRect();
          if (!image.classList.contains("p-carousel-image")) {
            near(b.width, image.naturalWidth);
            near(b.height, image.naturalHeight);
          } else {
            near(b.width, 640);
            near(b.height, 400);
            if (getComputedStyle(image).objectFit !== "cover") throw new Error("Wrong image crop");
          }
        }
      }
  }, families);
  await page
    .locator(".carousel-arrow-source-grid")
    .screenshot({ path: "test-results/carousel-arrows-source.png" });
  await page
    .locator(".carousel-source-grid")
    .screenshot({ path: "test-results/carousel-images-source.png" });
});

test("carousel arrows and dots support native keyboard selection, boundaries and looping", async ({
  page,
}) => {
  await page.goto("/?section=carousel");
  const demo = page.getByRole("group", { name: "Interactive carousels" });
  const collection = demo.getByRole("region", { name: "Plant collection", exact: true });
  await expect(
    collection.getByRole("button", { name: "Previous slide", exact: true })
  ).toBeDisabled();
  const next = collection.getByRole("button", { name: "Next slide", exact: true });
  await next.scrollIntoViewIfNeeded();
  await next.focus();
  await next.press("Enter");
  await expect(collection.getByRole("img")).toHaveAttribute("alt", "Rubber plant photograph 2");
  await expect(demo.locator("output")).toHaveText("Selected slide: 1; changes: 1");
  await next.press("Space");
  await expect(next).toBeDisabled();
  await collection.getByRole("button", { name: "Go to slide 1" }).click();
  await expect(demo.locator("output")).toHaveText("Selected slide: 0; changes: 3");
  const looping = demo.getByRole("region", { name: "Looping collection", exact: true });
  await looping.getByRole("button", { name: "Previous slide", exact: true }).click();
  await expect(looping.getByRole("button", { name: "Go to slide 3" })).toHaveAttribute(
    "aria-current",
    "true"
  );
  await looping.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(looping.getByRole("button", { name: "Go to slide 1" })).toHaveAttribute(
    "aria-current",
    "true"
  );
  const unavailable = demo.getByRole("region", { name: "Unavailable collection", exact: true });
  for (const button of await unavailable.getByRole("button").all())
    await expect(button).toBeDisabled();
  const single = demo.getByRole("region", { name: "Single photograph", exact: true });
  await expect(single.getByRole("button", { name: "Previous slide", exact: true })).toBeDisabled();
  await expect(single.getByRole("button", { name: "Next slide", exact: true })).toBeDisabled();
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(demo.locator("output")).toHaveText("Selected slide: 0; changes: 3");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await collection.getByRole("button", { name: "Go to slide 2" }).click();
  await expect(collection.getByRole("img")).toHaveAttribute("alt", "Rubber plant photograph 2");
});
