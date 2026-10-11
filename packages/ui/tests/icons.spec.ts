import { expect, test } from "@playwright/test";

test("every exported icon loads with its original dimensions", async ({ page }) => {
  test.setTimeout(60000);
  await page.goto("/?section=icons");
  const library = page.getByRole("region", { name: "Original icon library" });
  await expect(library.locator("figure")).toHaveCount(48);
  const names = new Set<string>();
  const ids = new Set<string>();
  let count = 0;
  for (let index = 0; index < 25; index++) {
    const batch = await library.locator("figure").evaluateAll(async (figures) =>
      Promise.all(
        figures.map(async (figure) => {
          const image = figure.querySelector("img");
          const link = figure.querySelector("a");
          if (!image || !link) throw Error("Missing original icon or source link");
          await image.decode();
          const rect = image.getBoundingClientRect();
          if (
            image.naturalWidth !== 24 ||
            image.naturalHeight !== 24 ||
            rect.width !== 24 ||
            rect.height !== 24
          )
            throw Error(`Wrong original icon dimensions: ${image.src}`);
          return {
            name: figure.getAttribute("data-icon-name")!,
            id: new URL(link.href).searchParams.get("node-id")!,
          };
        })
      )
    );
    batch.forEach((icon) => {
      names.add(icon.name);
      ids.add(icon.id);
      count++;
    });
    const next = library.getByRole("button", { name: "Next icons" });
    if (index < 24) {
      await next.click();
      await expect(library.locator("figure").first()).not.toHaveAttribute(
        "data-icon-name",
        batch[0].name
      );
    } else await expect(next).toBeDisabled();
  }
  expect({ count, names: names.size, ids: ids.size }).toEqual({
    count: 1173,
    names: 1173,
    ids: 1173,
  });
});

test("icon search preserves duplicate names and pagination and works in all themes", async ({
  page,
}) => {
  await page.goto("/?section=icons");
  const library = page.getByRole("region", { name: "Original icon library" });
  await expect(library.locator("figure")).toHaveCount(48);
  await expect(library.getByRole("button", { name: "Previous icons" })).toBeDisabled();
  const first = await library.locator("figure").first().getAttribute("data-icon-name");
  await library.getByRole("button", { name: "Next icons" }).click();
  expect(await library.locator("figure").first().getAttribute("data-icon-name")).not.toBe(first);
  await library.getByRole("searchbox", { name: "Search icons" }).fill("colors");
  await expect(library.getByRole("status")).toHaveText("2 icons found");
  for (const name of ["colors-3463-406105", "colors-3463-406406"])
    await expect(library.getByRole("img", { name, exact: true })).toBeVisible();
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByRole("combobox", { name: "Appearance" }).selectOption(theme);
    for (const image of await library.getByRole("img").all()) {
      expect(
        await image.evaluate((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        }))
      ).toEqual({ width: 24, height: 24 });
    }
  }
  await library.getByRole("searchbox").fill("no-such-icon-name");
  await expect(library.getByRole("status")).toHaveText("0 icons found");
  await expect(library.getByRole("button", { name: "Next icons" })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await library.getByRole("searchbox").fill("");
  expect(await library.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});
