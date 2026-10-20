import { expect, type Page } from "@playwright/test";

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
