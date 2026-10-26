import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { badgeSources } from "../preview/badge-source-data";
test("all 666 badge variants preserve source frames and native glyph geometry", async ({
  page,
}) => {
  await openPreview(page, "/?section=badges");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  const failures = await page.evaluate(
    (sources) =>
      sources.flatMap((source) => {
        const box = document
          .querySelector(`[data-badge-source-id="${source.id}"] > .p-badge`)
          ?.getBoundingClientRect();
        return !box ||
          Math.abs(box.width - source.width) > 1.1 ||
          Math.abs(box.height - source.height) > 0.1
          ? [
              `${source.id}: ${box?.width}x${box?.height}, expected ${source.width}x${source.height}`,
            ]
          : [];
      }),
    badgeSources
  );
  expect(failures).toEqual([]);
  expect(
    await page.evaluate(async () =>
      (
        await Promise.all(
          [...document.querySelectorAll<HTMLImageElement>('.badge-library-grid img[src$=".svg"]')]
            .filter((image) => image.getClientRects().length > 0)
            .map(async (image) => {
              const root = new DOMParser().parseFromString(
                await (await fetch(image.src)).text(),
                "image/svg+xml"
              ).documentElement;
              const box = image.getBoundingClientRect();
              return Math.abs(box.width - Number(root.getAttribute("width"))) > 0.1 ||
                Math.abs(box.height - Number(root.getAttribute("height"))) > 0.1
                ? image.src
                : undefined;
            })
        )
      ).filter(Boolean)
    )
  ).toEqual([]);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page
      .locator(".badge-library-grid")
      .screenshot({ path: `design/review/badges-${theme}.png` });
  }
});
test("decorated badge dismissal is caller-owned and disabled dismissal stays unavailable", async ({
  page,
}) => {
  await openPreview(page, "/?section=badges");
  const live = page.getByTestId("live-decorated-badges");
  await live.getByRole("button", { name: "Remove pharmacy", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("badge-dismissal")).toHaveText("removed");
  await expect(live.getByRole("button", { name: "Remove pharmacy", exact: true })).toHaveCount(0);
  await expect(
    live.getByRole("button", { name: "Remove locked badge", exact: true })
  ).toBeDisabled();
});
