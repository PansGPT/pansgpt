import { expect, type Locator, type Page } from "@playwright/test";

/** React may mount after window.load; settle its fonts/artwork before interaction. */
export async function openPreview(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.bringToFront();
  await expect(page.locator(".preview-header")).toBeVisible();
  await page.evaluate(async () => {
    // Some fixtures deliberately exercise unavailable images. Their component
    // tests own failure assertions; this helper only waits for initial settling.
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
    await document.fonts.ready;
    const failedFonts = [...document.fonts].filter((font) => font.status === "error");
    if (failedFonts.length) {
      throw new Error(`Preview font failed to load: ${failedFonts.map((font) => font.family).join(", ")}`);
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  });
}

/** Enter through the real keyboard path after scrolling the long specimen grid. */
export async function focusByKeyboard(target: Locator): Promise<void> {
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  await target.press("Shift+Tab");
  // The previous control can be above a long, non-focusable source archive.
  // Settle that scroll before Tab: Radix dismisses tooltips on ancestor scroll.
  await target.scrollIntoViewIfNeeded();
  await target.page().evaluate(
    () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    })
  );
  await target.page().keyboard.press("Tab");
  await expect(target).toBeFocused();
}
