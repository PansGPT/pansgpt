import { test, expect } from "@playwright/test";
import { feedItemSources, feedLayoutSources } from "../preview/feed-source-data";

test("sixteen feed items and six complete feeds preserve source frames and native artwork", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2500, height: 1100 });
  await page.goto("/?section=feeds");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
  for (const source of [...feedItemSources, ...feedLayoutSources]) {
    const frame = await page.locator(`[data-feed-source-id="${source.id}"]`).boundingBox();
    expect(frame?.width, source.name).toBe(source.width);
    expect(frame?.height, source.name).toBe(source.height);
  }
  for (const source of feedLayoutSources) {
    const feed = page.locator(`[data-feed-source-id="${source.id}"]`);
    await expect(feed.locator(":scope > li")).toHaveCount(15);
    for (let index = 0; index < source.rows.length; index++) {
      const row = source.rows[index];
      if (!row) continue;
      const item = feed.locator(":scope > li > article").nth(index);
      const bounds = await item.boundingBox();
      expect(bounds?.height, `${source.name} ${row.id}`).toBe(row.geometry?.height);
      await expect(item).toContainText(row.texts[0]?.text ?? "");
    }
  }
  for (const image of await page.locator('img[src$=".svg"]:visible').all()) {
    const dimensions = await image.evaluate((element: HTMLImageElement) => ({
      loaded: element.complete && element.naturalWidth > 0,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      nativeWidth: element.naturalWidth,
      nativeHeight: element.naturalHeight,
      rotated: Boolean(element.closest(".p-feed-connector")),
    }));
    expect(dimensions.loaded).toBe(true);
    expect(dimensions.width).toBeCloseTo(
      dimensions.rotated ? dimensions.nativeHeight : dimensions.nativeWidth,
      0
    );
    expect(dimensions.height).toBeCloseTo(
      dimensions.rotated ? dimensions.nativeWidth : dimensions.nativeHeight,
      0
    );
  }
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.screenshot({ path: `test-results/feeds-${theme}.png`, fullPage: true });
  }
});

test("activity actions, attachment opening, read state and live connectors work across themes and widths", async ({
  page,
}) => {
  await page.goto("/?section=feeds");
  const source = page.locator('[data-feed-source-id="1254:128621"]');
  await source.getByRole("button", { name: "Open Tech requirements.pdf" }).click();
  await expect(page.getByTestId("feed-selection")).toHaveText("Tech requirements.pdf");
  await source
    .getByRole("button", { name: "Marketing site redesign", exact: true })
    .first()
    .click();
  await expect(page.getByTestId("feed-selection")).toHaveText("Marketing site redesign");
  const read = source.getByRole("button", { name: "Mark Olúwadámilọ́lá Buhari activity as read" });
  await read.focus();
  await read.press("Enter");
  await expect(read).toHaveCount(0);
  await expect(
    source
      .locator("li")
      .first()
      .getByRole("img", { name: /online/ })
  ).toBeVisible();
  const live = page.getByRole("list", { name: "Live activity", exact: true });
  await live.getByRole("button", { name: "Open Tech requirements.pdf" }).click();
  await expect(page.getByTestId("feed-selection")).toHaveText("Tech requirements.pdf");
  const note = page.getByLabel("Feed note");
  await note.fill("My updated note");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(note).toHaveValue("My updated note");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await expect(page.getByRole("list", { name: "Empty activity", exact: true })).toContainText(
    "No activity yet."
  );
});
