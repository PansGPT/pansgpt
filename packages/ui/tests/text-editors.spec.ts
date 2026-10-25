import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";

test("four editor layouts, forty-eight source icon states and original SVG geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await openPreview(page, "/?section=editors");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-source-id]")).toHaveCount(4);
  await expect(page.locator("[data-editor-reference-command]")).toHaveCount(48);
  for (const source of await page.locator("[data-source-id]").all()) {
    const small = (await source.getAttribute("data-size")) === "sm";
    const frame = await source.boundingBox();
    expect(frame?.width).toBe(small ? 512 : 720);
    expect(frame?.height).toBe(small ? 416 : 512);
  }
  for (const img of await page.locator('img[src$=".svg"]:visible').all()) {
    const geometry = await img.evaluate((element: HTMLImageElement) => ({
      loaded: element.complete && element.naturalWidth > 0,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      nativeWidth: element.naturalWidth,
      nativeHeight: element.naturalHeight,
    }));
    expect(geometry.loaded).toBe(true);
    expect(geometry.width).toBe(geometry.nativeWidth);
    expect(geometry.height).toBe(geometry.nativeHeight);
  }
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.evaluate(async () => {
      await Promise.all(
        document
          .getAnimations()
          .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
          .map((animation) => animation.finished.catch(() => undefined))
      );
    });
    await page.screenshot({ path: `test-results/text-editors-${theme}.png`, fullPage: true });
  }
});

test("formatting preserves selection and undo, color and links work, paste is plain text", async ({
  page,
}) => {
  await openPreview(page, "/?section=editors");
  const live = page.getByTestId("text-editor-live");
  const editor = page.getByRole("textbox", { name: "Notes editor", exact: true });
  const select = async (): Promise<void> => {
    await editor.focus();
    await editor.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await expect(live.getByRole("button", { name: "Bold", exact: true })).toBeEnabled();
  };
  await select();
  await live.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(page.getByTestId("editor-html")).toContainText("<b>");
  await expect(live.getByRole("button", { name: "Bold", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await editor.focus();
  await page.keyboard.press("Control+z");
  await expect(editor.locator("b")).toHaveCount(0);
  await select();
  await live.getByRole("button", { name: "Color picker", exact: true }).click();
  await page.getByRole("button", { name: "Text color #079455", exact: true }).click();
  await expect(page.getByTestId("editor-html")).toContainText("#079455");
  await page.keyboard.press("Escape");
  await select();
  await live.getByRole("button", { name: "Link", exact: true }).click();
  await expect(editor.locator('a[href="https://example.com/course"]')).toHaveText("Pharmacy notes");
  await select();
  await live.getByRole("combobox", { name: "Font size" }).selectOption("24px");
  await expect(editor.locator('font[style*="font-size: 24px"]')).toHaveText("Pharmacy notes");
  await select();
  await editor.evaluate((element) => {
    const clipboard = new DataTransfer();
    clipboard.setData("text/plain", "Safe notes");
    clipboard.setData("text/html", '<img src="x" onerror="window.pasteExecuted = true">Unsafe');
    element.dispatchEvent(
      new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: clipboard })
    );
  });
  await expect(editor).toHaveText("Safe notes");
  await expect(editor.locator("img")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Read-only notes" })).toHaveAttribute(
    "contenteditable",
    "false"
  );
  await expect(page.getByRole("textbox", { name: "Disabled notes" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  await live.getByRole("button", { name: "Italic", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(live.getByRole("button", { name: "Underline", exact: true })).toBeFocused();
  const limited = page.getByRole("textbox", { name: "Five-character notes", exact: true });
  await limited.focus();
  await page.keyboard.type("123456789");
  await expect(limited).toHaveText("12345");
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
