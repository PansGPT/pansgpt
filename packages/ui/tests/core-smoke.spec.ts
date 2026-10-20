import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

test("core dialog traps keyboard focus, closes on Escape and restores its trigger", async ({
  page,
}) => {
  await openPreview(page, "/?section=core");
  const trigger = page.getByRole("button", { name: "Open dialog", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Blog post published" });
  await expect(dialog).toBeVisible();
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Tab");
    await expect
      .poll(() => dialog.evaluate((node) => node.contains(document.activeElement)))
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("core appearance persists OLED and Sepia choices across reloads", async ({ page }) => {
  await openPreview(page, "/?section=core");
  const appearance = page.getByRole("combobox", { name: "Appearance", exact: true });
  for (const theme of ["dark", "sepia", "light"]) {
    await appearance.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.reload();
    await expect(appearance).toHaveValue(theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
  }
});
