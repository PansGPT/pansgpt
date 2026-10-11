import { expect, test } from "@playwright/test";
import { emptyStateSources } from "../preview/empty-state-source-data";

test("all twelve empty-state layouts match source content, text, graphic and action bounds", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1200 });
  await page.goto("/?section=empty");
  await expect(page.locator(".empty-state-source-grid [data-source-id]")).toHaveCount(12);
  await page.evaluate(async (sources) => {
    const near = (actual: number, expected: number, message: string): void => {
      if (Math.abs(actual - expected) > 0.6)
        throw new Error(message + ": " + actual + " instead of " + expected);
    };
    for (const [id, , , , width, height, children] of sources) {
      const root = document.querySelector(
        '.empty-state-source-grid [data-source-id="' + id + '"]'
      )!;
      const box = root.getBoundingClientRect();
      near(box.width, width, id + " width");
      near(box.height, height, id + " height");
      const body = children.find((c) => c[1] === "Empty state")!;
      const content = body[6][0];
      const actions = body[6][1];
      const targets = [
        root.querySelector(".p-empty-content")!,
        root.querySelector(".p-empty-actions")!,
      ];
      for (const [i, source] of [content, actions].entries()) {
        const b = targets[i].getBoundingClientRect();
        near(b.x - box.x, source[2], id + " content x");
        near(b.y - box.y, source[3], id + " content y");
        near(b.width, source[4], id + " content width");
        near(b.height, source[5], id + " content height");
      }
      const nodes = [root.querySelector(".p-empty-graphic")!, root.querySelector(".p-empty-text")!];
      for (const [i, source] of content[6].entries()) {
        const b = nodes[i].getBoundingClientRect();
        near(b.x - box.x, source[2], id + " graphic/text x");
        near(b.y - box.y, source[3], id + " graphic/text y");
        near(b.width, source[4], id + " graphic/text width");
        near(b.height, source[5], id + " graphic/text height");
      }
      for (const image of root.querySelectorAll("img")) {
        await image.decode();
        if (!image.naturalWidth || image.src.includes("figma.com"))
          throw new Error("Missing original artwork");
      }
      if (!root.getAttribute("aria-labelledby") || !root.querySelector("h2")?.id)
        throw new Error("Missing accessible title");
    }
  }, emptyStateSources);
  for (const id of ["1182:178", "1182:2177", "4980:382743", "9239:545828"]) {
    await page
      .locator('.empty-state-source-grid [data-source-id="' + id + '"]')
      .screenshot({ path: "test-results/empty-state-" + id.replace(":", "-") + ".png" });
  }
});

test("empty-state actions support keyboard, disabled actions, optional graphics and responsive themes", async ({
  page,
}) => {
  await page.goto("/?section=empty");
  const first = page.locator(".empty-state-source-grid .p-empty-state").first();
  await first.getByRole("button", { name: "Clear search" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("output")).toHaveText("Cleared search");
  await first.getByRole("button", { name: "New project" }).focus();
  await page.keyboard.press("Space");
  await expect(page.locator("output")).toHaveText("Created project");
  const demo = page.getByTestId("empty-demo");
  await expect(demo.getByRole("button", { name: "Unavailable action" })).toBeDisabled();
  await demo.getByRole("button", { name: "Upload document" }).click();
  await expect(page.locator("output")).toHaveText("Upload opened");
  await expect(
    page
      .getByTestId("empty-text-only")
      .locator(".p-empty-graphic,.p-empty-actions,.p-empty-pattern")
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  const colors: string[] = [];
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await expect(demo.getByRole("heading")).toHaveText("Nothing uploaded yet");
    const width = await demo.evaluate((el) => el.getBoundingClientRect().width);
    expect(width).toBeLessThanOrEqual(390);
    const color = await demo.locator("h2").evaluate((el) => getComputedStyle(el).color);
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
    colors.push(color);
  }
  expect(new Set(colors).size).toBe(3);
});
