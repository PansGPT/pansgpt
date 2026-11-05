import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

for (const theme of ["light", "dark", "sepia"]) {
  test(`${theme} keyboard focus is visible, neutral and preserves disabled controls`, async ({
    page,
  }) => {
    await openPreview(page, "/?section=badgegroups");
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    const demo = page.getByRole("group", { name: "Interactive badge close actions" });
    const button = demo.getByRole("button", { name: "Remove selected badge" });
    await button.scrollIntoViewIfNeeded();
    await page.keyboard.press("Tab");
    await button.focus();
    await expect(button).toBeFocused();
    await expect(button).toHaveCSS("outline-style", "solid");
    await expect(button).toHaveCSS("outline-width", "2px");
    const neutral = await button.evaluate((element) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const paint = canvas.getContext("2d");
      if (!paint) throw new Error("Missing color check");
      paint.fillStyle = getComputedStyle(element).outlineColor;
      paint.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = paint.getImageData(0, 0, 1, 1).data;
      return a === 255 && g <= Math.max(r, b) + 8;
    });
    expect(neutral).toBe(true);
    await expect(demo.getByRole("button", { name: "Unavailable badge close" })).toBeDisabled();
    await button.press("Enter");
    await expect(button).toHaveCount(0);
  });
}
