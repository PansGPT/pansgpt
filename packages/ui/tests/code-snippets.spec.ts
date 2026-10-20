import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { snippetSources } from "../preview/snippet-source-data";

test("code snippet source layouts, six tab states, monospace metrics and original assets match Figma", async ({
  page,
}) => {
  await openPreview(page, "/?section=snippets");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((sources) => {
    const near = (actual: number, expected: number, label: string): void => {
      if (Math.abs(actual - expected) > 0.6)
        throw new Error(label + ": " + actual + " instead of " + expected);
    };
    for (const [id, , , , w, h, children] of sources.snippets) {
      const root = document.querySelector('[data-source-id="' + id + '"]')!;
      const box = root.getBoundingClientRect();
      near(box.width, w, id + " width");
      near(box.height, h, id + " height");
      const nodes =
        id === "1234:368"
          ? [root.querySelector(".p-code-sidebar")!, root.querySelector(".p-code-pre")!]
          : [
              root.querySelector(".p-code-header")!,
              root.querySelector(".p-code-expand")!,
              root.querySelector(".p-code-content")!,
            ];
      for (const [i, source] of children.entries()) {
        const b = nodes[i].getBoundingClientRect();
        near(b.x - box.x, source[2], id + " child x");
        near(b.y - box.y, source[3], id + " child y");
        near(b.width, source[4], id + " child width");
        near(b.height, source[5], id + " child height");
      }
      if (
        !getComputedStyle(root.querySelector("pre")!).fontFamily.includes("Roboto Mono") ||
        !document.fonts.check('14px "Roboto Mono"')
      )
        throw new Error("Source font not loaded");
    }
    for (const [id, , , , w, h] of sources.tabs) {
      const root = document.querySelector('[data-source-id="' + id + '"]')!;
      const b = root.getBoundingClientRect();
      near(b.width, w, id + " width");
      near(b.height, h, id + " height");
      if (
        root.getAttribute("data-code-state") === "focus" &&
        !getComputedStyle(root).boxShadow.includes("rgb(158, 119, 237)")
      )
        throw new Error("Original imported purple ring missing");
    }
  }, snippetSources);
  await expect(page.locator('[data-source-id="1234:368"] .p-code-sidebar span')).toHaveCount(21);
  await expect(page.locator('[data-source-id="1234:368"] .p-code-line')).toHaveCount(19);
  const copyGlyph = page.locator('[data-source-id="9282:550144"] .p-button-icon img');
  await expect(copyGlyph).toBeVisible();
  const size = await copyGlyph.boundingBox();
  expect(size?.width).toBe(16);
  expect(size?.height).toBe(16);
  const mask = await page
    .locator('[data-source-id="9282:550144"] code')
    .evaluate((el) => getComputedStyle(el).maskImage);
  expect(mask).toContain("code-snippet-imgCode");
  expect(mask).not.toContain("figma.com");
  await page
    .locator(".code-snippet-source-grid")
    .screenshot({ path: "test-results/code-snippets-source.png" });
  await page
    .locator(".code-tab-source-grid")
    .screenshot({ path: "test-results/code-snippet-tabs-source.png" });
});

test("snippet tabs, full-content copying, expansion, literal text and disabled keyboard navigation work", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openPreview(page, "/?section=snippets");
  const demo = page.getByTestId("snippet-demo");
  await expect(demo.locator(".p-code-line")).toHaveCount(4);
  await demo.getByRole("button", { name: "Copy code" }).click();
  const expected = Array.from({ length: 30 }, (_, i) => "npm example " + (i + 1)).join("\n");
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(
    expected
  );
  expect(await page.getByTestId("copied-code").textContent()).toBe(expected);
  await demo.getByRole("button", { name: "Show more" }).click();
  await expect(demo.locator(".p-code-line")).toHaveCount(30);
  await expect(demo.getByRole("button", { name: "Show less" })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  await demo.getByRole("button", { name: "Show less" }).click();
  await expect(demo.locator(".p-code-line")).toHaveCount(4);
  await demo.getByRole("tab", { name: "npm", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(demo.getByRole("tab", { name: "yarn", exact: true })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await page.keyboard.press("ArrowRight");
  await expect(demo.getByRole("tab", { name: "bun", exact: true })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(demo.getByRole("tab", { name: "disabled", exact: true })).toBeDisabled();
  await page.keyboard.press("Home");
  await expect(demo.getByRole("tab", { name: "npm", exact: true })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  const simple = page.getByTestId("snippet-uncontrolled");
  await expect(simple.locator("b")).toHaveCount(0);
  await expect(simple.locator("pre")).toContainText("<b>literal</b>");
  await expect(simple.locator(".p-code-sidebar span")).toHaveCount(3);
  const automatic = page.getByTestId("snippet-auto");
  await automatic.getByRole("tab", { name: "bun", exact: true }).click();
  await expect(automatic.getByRole("tabpanel")).toContainText("bun add pansgpt");
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, "writeText", {
      configurable: true,
      value: async () => {
        throw new Error("Denied in check");
      },
    });
  });
  await demo.getByRole("button", { name: "Copy code" }).click();
  await expect(demo.getByRole("status")).toHaveText("Unable to copy code");
  await page.setViewportSize({ width: 390, height: 844 });
  const colors: string[] = [];
  for (const theme of ["dark", "sepia", "light"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    expect((await demo.boundingBox())?.width).toBeLessThanOrEqual(390);
    colors.push(await demo.locator("pre").evaluate((el) => getComputedStyle(el).color));
  }
  expect(new Set(colors).size).toBe(3);
});
