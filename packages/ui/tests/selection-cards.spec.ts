import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { radioLayouts } from "../preview/radio-layout-data";

test("all 192 selectable cards and 24 groups retain source frames and native SVG geometry", async ({
  page,
}) => {
  await openPreview(page, "/?section=radios");
  await expect(page.locator("[data-radio-source-id]")).toHaveCount(216);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  expect(
    await page.evaluate(
      (sources) =>
        sources.flatMap((source) => {
          const rect = document
            .querySelector(`[data-radio-source-id="${source.id}"]`)
            ?.children[1]?.getBoundingClientRect();
          return !rect ||
            Math.abs(rect.width - source.width) > 0.1 ||
            Math.abs(rect.height - source.height) > 0.1
            ? [
                {
                  id: source.id,
                  name: source.name,
                  expected: [source.width, source.height],
                  actual: rect ? [rect.width, rect.height] : [],
                },
              ]
            : [];
        }),
      radioLayouts
    )
  ).toEqual([]);
  expect(
    await page.locator(".radio-library-grid img:visible").evaluateAll((images) =>
      images.flatMap((node) => {
        const image = node as HTMLImageElement;
        if (!image.src.endsWith(".svg")) return [];
        const rect = image.getBoundingClientRect();
        return Math.abs(rect.width - Number(image.getAttribute("width") ?? image.naturalWidth)) >
          0.1 ||
          Math.abs(rect.height - Number(image.getAttribute("height") ?? image.naturalHeight)) > 0.1
          ? [image.src]
          : [];
      })
    )
  ).toEqual([]);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page
      .locator(".radio-library-grid")
      .screenshot({ path: `design/review/selection-cards-${theme}.png` });
  }
});

test("selection cards support keyboard choice, independent actions and native form values", async ({
  page,
}) => {
  await openPreview(page, "/?section=radios");
  const form = page.getByRole("form", { name: "Interactive selection cards" });
  await form.getByRole("radio", { name: "First payment method" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("radio", { name: "Second payment method" })).toBeChecked();
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("payment"))).toBe(
    "second"
  );
  await form.getByRole("button", { name: "Edit payment method" }).click();
  await expect(form.getByLabel("Payment edits")).toHaveText("1");
  await expect(form.getByRole("radio", { name: "Second payment method" })).toBeChecked();
  await form.getByRole("checkbox", { name: "Include study notes" }).check();
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("notes"))).toBe(
    "included"
  );
  await page.setViewportSize({ width: 375, height: 900 });
  expect(
    await form
      .locator(".p-selection-card")
      .evaluateAll((cards) => cards.every((card) => card.getBoundingClientRect().right <= 375))
  ).toBe(true);
});
