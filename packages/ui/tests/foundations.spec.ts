import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { foundationSources } from "../preview/foundation-source-data";
test("all 80 foundation and documentation specimens preserve native frames and original artwork", async ({
  page,
}) => {
  await openPreview(page, "/?section=foundations");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  const variants = foundationSources.flatMap((family) => [...family.variants]);
  expect(variants).toHaveLength(80);
  const differences: { id: string; expected: number[]; actual: number[] }[] = [];
  for (const source of variants) {
    const box = await page
      .locator(`[data-foundation-source-id="${source.id}"] > :first-child`)
      .boundingBox();
    if (
      !box ||
      Math.abs(box.width - source.width) > 1.1 ||
      Math.abs(box.height - source.height) > 1.1
    )
      differences.push({
        id: source.id,
        expected: [source.width, source.height],
        actual: box ? [box.width, box.height] : [],
      });
  }
  expect(differences).toEqual([]);
  const bad = await page
    .locator('[data-foundation-source-id] img[src$=".svg"]')
    .evaluateAll((images) =>
      images.flatMap((node) => {
        const image = node as HTMLImageElement;
        return !image.complete ||
          !image.naturalWidth ||
          Math.abs(image.width - image.naturalWidth) > 1.1 ||
          Math.abs(image.height - image.naturalHeight) > 1.1
          ? [
              {
                src: image.src,
                native: [image.naturalWidth, image.naturalHeight],
                actual: [image.width, image.height],
              },
            ]
          : [];
      })
    );
  expect(bad).toEqual([]);
});
