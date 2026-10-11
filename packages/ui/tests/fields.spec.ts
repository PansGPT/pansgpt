import { expect, test } from "@playwright/test";
import { fieldLayouts } from "../preview/field-layout-data";
test("all 158 input and select source variants preserve frames and original SVG geometry", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/?section=fields");
  await expect(page.locator("[data-field-source-id]")).toHaveCount(158);
  await page.evaluate(async () => {
    await document.fonts.ready;
    [...document.images].forEach((image) => {
      image.loading = "eager";
    });
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  const differences = await page.evaluate(
    (sources) =>
      sources.flatMap((source) => {
        const field = document.querySelector(
          `[data-field-source-id="${source.id}"] > .p-field, [data-field-source-id="${source.id}"] > .p-tag-input > .p-field`
        );
        const rect = field?.getBoundingClientRect();
        const width = source.width;
        const height = source.height;
        return !rect || Math.abs(rect.width - width) > 0.1 || Math.abs(rect.height - height) > 0.1
          ? [
              {
                id: source.id,
                name: source.name,
                expected: [width, height],
                actual: rect ? [rect.width, rect.height] : [],
              },
            ]
          : [];
      }),
    fieldLayouts
  );
  expect(differences).toEqual([]);
  expect(
    await page.locator(".field-library-grid img:visible").evaluateAll((images) =>
      images.flatMap((node) => {
        const image = node as HTMLImageElement;
        if (!image.src.endsWith(".svg")) return [];
        const rect = image.getBoundingClientRect();
        return Math.abs(rect.width - Number(image.getAttribute("width") ?? image.naturalWidth)) >
          0.1 ||
          Math.abs(rect.height - Number(image.getAttribute("height") ?? image.naturalHeight)) > 0.1
          ? [
              {
                source: image.src,
                native: [image.naturalWidth, image.naturalHeight],
                actual: [rect.width, rect.height],
              },
            ]
          : [];
      })
    )
  ).toEqual([]);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page
      .locator(".field-library-grid")
      .screenshot({ path: `design/review/fields-${theme}.png` });
  }
});
test("combobox searches accents, skips disabled options and submits selected values", async ({
  page,
}) => {
  await page.goto("/?section=fields");
  const form = page.getByRole("form", { name: "Live composed fields" });
  const single = form.getByRole("combobox", { name: "Search team member" });
  await single.fill("Ore");
  await expect(page.getByRole("option", { name: /Diepreye/ })).toBeVisible();
  expect(await single.evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(false);
  await single.press("Enter");
  await expect(single).toHaveValue("Diepreye Ọ̀rẹ̀kọ́yà");
  expect(await single.evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(true);
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("member"))).toBe(
    "diepreye"
  );
  const multi = form.getByRole("combobox", { name: "Multiple team members" });
  await multi.focus();
  await multi.press("ArrowDown");
  await multi.press("Enter");
  expect(
    await form.evaluate((form) => new FormData(form as HTMLFormElement).getAll("members"))
  ).toEqual(["chioma", "diepreye"]);
  await multi.press("Escape");
  await expect(multi).toHaveAttribute("aria-expanded", "false");
  await multi.press("Backspace");
  expect(
    await form.evaluate((form) => new FormData(form as HTMLFormElement).getAll("members"))
  ).toEqual(["chioma"]);
  await multi.fill("no such member");
  await expect(page.getByRole("status")).toHaveText("No results found");
  await multi.press("Escape");
  await form.getByLabel("Choose member").click();
  await page.getByRole("option", { name: /Emmanuel/ }).click();
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("selected"))).toBe(
    "emmanuel"
  );
});
test("tag entry supports commit, dismissal, required validation and native addon form values", async ({
  page,
}) => {
  await page.goto("/?section=fields");
  const form = page.getByRole("form", { name: "Live composed fields" });
  const topics = form.getByLabel("Study topics");
  await topics.fill("Toxicology");
  await topics.press("Enter");
  expect(
    await form.evaluate((form) => new FormData(form as HTMLFormElement).getAll("topics"))
  ).toEqual(["pharmacology", "Toxicology"]);
  await topics.press("Backspace");
  await form.getByRole("button", { name: "Remove Pharmacology" }).click();
  expect(await topics.evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(false);
  await topics.fill("Pharmacology");
  await topics.press(",");
  expect(await topics.evaluate((input) => (input as HTMLInputElement).checkValidity())).toBe(true);
  await form.getByLabel("Phone country").selectOption("US");
  expect(await form.evaluate((form) => new FormData(form as HTMLFormElement).get("country"))).toBe(
    "US"
  );
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await form.evaluate((form) => form.getBoundingClientRect().right <= innerWidth)).toBe(
    true
  );
});
