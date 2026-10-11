import { expect, test } from "@playwright/test";
import { controlLayouts } from "../preview/control-layout-data";
import { tagSources } from "../preview/tag-source-data";
test("all 270 checkbox, toggle, textarea and select-row specimens retain source frames and native assets", async ({
  page,
}) => {
  await page.goto("/?section=controls");
  await expect(page.locator("[data-control-source-id]")).toHaveCount(270);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  expect(
    await page.evaluate(
      (sources) =>
        sources.flatMap((source) => {
          const node = document.querySelector(`[data-control-source-id="${source.id}"]`)
            ?.children[1];
          const rect = node?.getBoundingClientRect();
          return !rect ||
            Math.abs(rect.width - source.width) > 0.1 ||
            Math.abs(rect.height - source.height) > 0.1
            ? [
                {
                  name: source.name,
                  id: source.id,
                  expected: [source.width, source.height],
                  actual: rect ? [rect.width, rect.height] : [],
                },
              ]
            : [];
        }),
      controlLayouts
    )
  ).toEqual([]);
  expect(
    await page.locator(".control-library-grid img:visible").evaluateAll((images) =>
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
      .locator(".control-library-grid")
      .screenshot({ path: `design/review/controls-${theme}.png` });
  }
});
test("native radios skip disabled choices and multiline tag entry submits committed values", async ({
  page,
}) => {
  await page.goto("/?section=controls");
  const form = page.getByRole("form", { name: "Native radio choices" });
  await form.getByRole("radio", { name: "First choice" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("radio", { name: "Second choice" })).toBeChecked();
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("choice"))).toBe(
    "second"
  );
  const input = form.getByLabel("Study labels");
  await input.fill("Science");
  await input.press("Enter");
  expect(
    await form.evaluate((form) => new FormData(form as HTMLFormElement).getAll("labels"))
  ).toEqual(["design", "Science"]);
  await form.getByRole("button", { name: "Remove Design" }).click();
  expect(
    await form.evaluate((form) => new FormData(form as HTMLFormElement).getAll("labels"))
  ).toEqual(["Science"]);
});
test("all 72 tag combinations preserve source sizes and selection/dismissal semantics", async ({
  page,
}) => {
  await page.goto("/?section=tags");
  await expect(page.locator("[data-tag-source-id]")).toHaveCount(72);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  expect(
    await page.evaluate(
      (sources) =>
        sources.flatMap((source) => {
          const rect = document
            .querySelector(`[data-tag-source-id="${source.id}"] > .p-tag`)
            ?.getBoundingClientRect();
          return !rect ||
            Math.abs(rect.width - source.width) > 1.1 ||
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
      tagSources
    )
  ).toEqual([]);
  const form = page.getByRole("form", { name: "Interactive tags" });
  await form.getByRole("checkbox", { name: "Select topic" }).click();
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("topic"))).toBe(
    "on"
  );
  await expect(form.getByRole("button", { name: "Remove disabled topic" })).toBeDisabled();
  await form.getByRole("button", { name: "Remove topic", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(form.getByRole("checkbox")).toHaveCount(0);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.locator(".tag-library-grid").screenshot({ path: `design/review/tags-${theme}.png` });
  }
});
