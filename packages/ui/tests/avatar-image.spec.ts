import { expect, test } from "@playwright/test";

test("square and portrait image cards preserve original artwork, captions and responsive proportions", async ({
  page,
}) => {
  await page.goto("/?section=avatars");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
  const cards = page.locator(".avatar-image-fixture");
  await expect(cards).toHaveCount(2);
  for (const [index, height] of [380, 500].entries()) {
    const card = cards.nth(index);
    const box = await card.boundingBox();
    expect(box?.width).toBe(320);
    expect(box?.height).toBe(height);
    const image = card.locator("img");
    expect((await image.boundingBox())?.height).toBe(height - 60);
    await image.evaluate(async (node: HTMLImageElement) => {
      await node.decode();
      if (!node.src.startsWith(location.origin) || !node.naturalWidth)
        throw new Error("Missing local artwork");
    });
    await expect(card.locator("figcaption")).toContainText("Source");
    await expect(card.getByRole("link")).toHaveCount(0);
    const captionBox = await card.locator("figcaption").boundingBox();
    expect(captionBox?.height).toBe(52);
    expect((captionBox?.y ?? 0) - (box?.y ?? 0)).toBe(height - 52);
    await card.screenshot({ path: `test-results/avatar-image-${index}.png` });
  }
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(cards.first().locator("figcaption")).toContainText("Diepreye");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
