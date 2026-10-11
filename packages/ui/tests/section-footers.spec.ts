import { test, expect } from "@playwright/test";

test("footer source frames, original assets and responsive actions remain correct", async ({
  page,
}) => {
  await page.setViewportSize({ width: 2100, height: 1100 });
  await page.goto("/?section=sectionfooters");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-source-id]")).toHaveCount(8);
  for (const source of await page.locator("[data-source-id]").all()) {
    const mobile = (await source.getAttribute("data-footer-breakpoint")) === "mobile";
    const card = (await source.getAttribute("data-footer-variant")) === "card";
    const frame = await source.boundingBox();
    expect(frame?.width).toBe(mobile ? 688 : 1216);
    expect(frame?.height).toBe(card ? (mobile ? 65 : 73) : mobile ? 57 : 61);
    for (const image of await source.locator("img:visible").all()) {
      expect(
        await image.evaluate(
          (img: HTMLImageElement) =>
            img.complete &&
            img.naturalWidth > 0 &&
            img.naturalWidth === img.getBoundingClientRect().width &&
            img.naturalHeight === img.getBoundingClientRect().height
        )
      ).toBe(true);
    }
  }
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined))
      );
    });
    await page.screenshot({ path: `test-results/section-footers-${theme}.png`, fullPage: true });
  }
  const live = page.getByTestId("footer-live");
  await live.getByRole("button", { name: "30 days", exact: true }).click();
  await expect(page.getByTestId("footer-period")).toHaveText("30d");
  await live.getByRole("button", { name: "Learn more" }).click();
  await expect(page.getByTestId("footer-action")).toHaveText("Learn more");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(live.getByRole("button", { name: "30d", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await live.getByRole("button", { name: "Custom period" }).click();
  await expect(page.getByTestId("footer-period")).toHaveText("custom");
  await live.getByRole("button", { name: "Primary", exact: true }).click();
  await expect(page.getByTestId("footer-action")).toHaveText("primary");
  await expect(page.getByTestId("footer-empty").locator("img")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
