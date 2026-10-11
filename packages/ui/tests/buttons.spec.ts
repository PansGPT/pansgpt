import { expect, test } from "@playwright/test";
import { buttonSources } from "../preview/button-source-data";
test("all 300 standard and destructive button variants retain source frames and native glyphs", async ({
  page,
}) => {
  await page.goto("/?section=buttons");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  const differences = await page.evaluate(
    (sources) =>
      sources.flatMap((source) => {
        const frame = document
          .querySelector(`[data-button-source-id="${source.id}"] > button`)
          ?.getBoundingClientRect();
        return !frame ||
          Math.abs(frame.width - source.width) > 1.1 ||
          Math.abs(frame.height - source.height) > 0.1
          ? [
              {
                id: source.id,
                expected: [source.width, source.height],
                actual: frame ? [frame.width, frame.height] : [],
              },
            ]
          : [];
      }),
    buttonSources
  );
  expect(differences).toEqual([]);
  expect(
    await page.locator(".button-library-grid img:visible").evaluateAll((images) =>
      images.flatMap((node) => {
        const image = node as HTMLImageElement;
        const frame = image.getBoundingClientRect();
        return frame.width !== image.naturalWidth || frame.height !== image.naturalHeight
          ? [image.src]
          : [];
      })
    )
  ).toEqual([]);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page
      .locator(".button-library-grid")
      .screenshot({ path: `design/review/buttons-${theme}.png` });
  }
});
test("button keyboard actions work and loading prevents duplicate submission without disabled styling", async ({
  page,
}) => {
  await page.goto("/?section=buttons");
  const live = page.getByTestId("live-button-states");
  await live.getByRole("button", { name: "Continue", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByTestId("button-clicks")).toHaveText("1");
  const loading = live.getByRole("button", { name: "Saving", exact: true });
  await expect(loading).toBeDisabled();
  await expect(loading).toHaveAttribute("aria-busy", "true");
  expect(await loading.evaluate((button) => getComputedStyle(button).backgroundColor)).not.toBe(
    await live
      .getByRole("button", { name: "Save draft", exact: true })
      .evaluate((button) => getComputedStyle(button).backgroundColor)
  );
});
