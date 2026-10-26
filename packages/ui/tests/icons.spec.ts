import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

type SourceIcon = { name: string; nodeId: string };
const source = JSON.parse(
  readFileSync(resolve(__dirname, "../design/figma-icons.manifest.json"), "utf8")
) as { icons: SourceIcon[] };
const pageSize = 48;
const pageCount = Math.ceil(source.icons.length / pageSize);

// Keep every original icon and the 60-second deadline. Smaller exhaustive ranges
// bound each test's loading and trace cost on slower developer machines.
for (let startPage = 0; startPage < pageCount; startPage += 5) {
  const endPage = Math.min(startPage + 5, pageCount);
  test(`exported icons on pages ${startPage + 1}-${endPage} load with original dimensions`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    expect({
      count: source.icons.length,
      names: new Set(source.icons.map((icon) => icon.name)).size,
      ids: new Set(source.icons.map((icon) => icon.nodeId)).size,
    }).toEqual({ count: 1173, names: 1173, ids: 1173 });
    await openPreview(page, "/?section=icons");
    const library = page.getByRole("region", { name: "Original icon library" });
    const figures = library.locator("figure");
    const next = library.getByRole("button", { name: "Next icons" });
    await expect(figures).toHaveCount(pageSize);
    for (let skipped = 0; skipped < startPage; skipped++) {
      await next.click();
      await expect(figures.first()).toHaveAttribute(
        "data-icon-name",
        source.icons[(skipped + 1) * pageSize].name
      );
    }
    for (let index = startPage; index < endPage; index++) {
      const expected = source.icons.slice(index * pageSize, (index + 1) * pageSize);
      await expect(figures).toHaveCount(expected.length);
      await expect(figures.first()).toHaveAttribute("data-icon-name", expected[0].name);
      const batch = await figures.evaluateAll(async (nodes) =>
        Promise.all(
          nodes.map(async (figure) => {
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
              name: figure.getAttribute("data-icon-name"),
              id: new URL(link.href).searchParams.get("node-id"),
            };
          })
        )
      );
      expect(batch).toEqual(
        expected.map((icon) => ({ name: icon.name, id: icon.nodeId.replace(":", "-") }))
      );
      if (index === pageCount - 1) await expect(next).toBeDisabled();
      else {
        await expect(next).toBeEnabled();
        if (index + 1 < endPage) await next.click();
      }
    }
  });
}

test("icon search preserves duplicate names and pagination and works in all themes", async ({
  page,
}) => {
  await openPreview(page, "/?section=icons");
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
