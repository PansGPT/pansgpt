import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=atoms");
});

test("cards preserve native actions, readable themes and a narrow mobile layout", async ({
  page,
}) => {
  const card = page.getByRole("article", { name: "Introduction to Pharmacology" });
  await card.getByRole("button", { name: "Save for later" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Saved documents")).toHaveText("1");
  await card.getByRole("link", { name: "Open document" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#document-opened$/);
  const backgrounds: string[] = [];
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
    const colors = await card.evaluate((node) => {
      const style = getComputedStyle(node);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Missing color context");
      context.fillStyle = style.backgroundColor;
      context.fillRect(0, 0, 1, 1);
      return {
        background: style.backgroundColor,
        text: style.color,
        rgb: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3),
      };
    });
    backgrounds.push(colors.background);
    expect(colors.background).not.toBe(colors.text);
    if (theme === "dark") expect(colors.rgb).toEqual([12, 14, 18]);
    await expect(page.getByLabel("Saved documents")).toHaveText("1");
  }
  expect(new Set(backgrounds).size).toBe(3);
  await page.getByText("Long-content example", { exact: true }).click();
  await page.setViewportSize({ width: 375, height: 900 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(375);
  await expect(card.getByRole("button", { name: "Save for later" })).toBeEnabled();
});

test("shared initials handle names, email, empty and Unicode input with stable identity", async ({
  page,
}) => {
  const cases = [
    ["name", "GO", "Godgive Okeke"],
    ["single", "AD", "Ada"],
    ["email", "UC", "uche@example.invalid"],
    ["empty", "PG", "User initials"],
    ["unicode", "𠮷太", "𠮷田 太郎"],
  ];
  for (const [id, initials, label] of cases) {
    const avatar = page.getByTestId(`initials-${id}`);
    await expect(avatar).toHaveText(initials);
    await expect(avatar).toHaveRole("img");
    await expect(avatar).toHaveAccessibleName(label);
    await expect(avatar.locator("img")).toHaveCount(0);
  }
  const original = page.getByTestId("initials-name");
  const tone = await original.getAttribute("data-tone");
  await expect(page.getByTestId("initials-duplicate")).toHaveAttribute("data-tone", tone ?? "");
  for (const [id, size] of [
    ["name", 32],
    ["duplicate", 40],
    ["single", 48],
  ] as const) {
    const frame = await page.getByTestId(`initials-${id}`).boundingBox();
    expect(frame?.width).toBe(size);
    expect(frame?.height).toBe(size);
  }
  await page.reload();
  await expect(original).toHaveAttribute("data-tone", tone ?? "");
});

test("loading placeholders stay decorative, honor reduced motion and yield to loaded content", async ({
  page,
}) => {
  const region = page.getByRole("region", { name: "Recent documents" });
  await expect(region).toHaveAttribute("aria-busy", "true");
  await expect(region.getByRole("status")).toHaveText("Loading documents");
  const placeholders = region.locator(".p-skeleton");
  await expect(placeholders).toHaveCount(4);
  for (const placeholder of await placeholders.all()) {
    await expect(placeholder).toHaveAttribute("aria-hidden", "true");
  }
  await expect(placeholders.first()).not.toHaveCSS("animation-name", "none");
  await expect(placeholders.last()).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const placeholder of await placeholders.all()) {
    await expect(placeholder).toHaveCSS("animation-name", "none");
  }
  await page.getByRole("button", { name: "Load documents", exact: true }).click();
  await expect(region).toHaveAttribute("aria-busy", "false");
  await expect(region).toHaveText("Document list loaded.");
  await expect(placeholders).toHaveCount(0);
});

test("toasts follow all themes, expose keyboard actions and dismiss automatically or by choice", async ({
  page,
}) => {
  const saved = page.getByRole("button", { name: "Show saved message" });
  const message = page.locator(".p-toast").filter({ hasText: "Note saved" });
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance", { exact: true }).selectOption(theme);
    await saved.click();
    await expect(message).toContainText("Your study note is ready.");
    await expect(page.getByRole("region", { name: /Notifications/ })).toHaveAttribute(
      "aria-live",
      "polite"
    );
    const expectedBackground = await page
      .getByTestId("study-card")
      .evaluate((node) => getComputedStyle(node).backgroundColor);
    await expect(message).toHaveCSS("background-color", expectedBackground);
    if (theme === "light") {
      await message.getByRole("button", { name: "Undo", exact: true }).focus();
      await page.keyboard.press("Enter");
      await expect(page.getByLabel("Saved documents")).toHaveText("1");
    } else {
      await message.getByRole("button", { name: /close/i }).click();
    }
    await expect(message).toHaveCount(0);
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await saved.click();
  await expect(message).toBeVisible();
  const frame = await message.boundingBox();
  expect(frame).not.toBeNull();
  expect(frame!.x).toBeGreaterThanOrEqual(0);
  expect(frame!.x + frame!.width).toBeLessThanOrEqual(375);
  await message.getByRole("button", { name: /close/i }).click();
  await page.getByRole("button", { name: "Show temporary message" }).click();
  const temporary = page.locator(".p-toast").filter({ hasText: "Temporary message" });
  await expect(temporary).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(temporary).toHaveCount(0);
});

test("render errors preserve the page, capture a Sentry event and offer safe keyboard recovery", async ({
  page,
}) => {
  const sent: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/envelope/")) sent.push(request.url());
  });
  await page.getByRole("button", { name: "Simulate section failure" }).click();
  const fallback = page.getByRole("alert");
  await expect(fallback).toContainText("Something went wrong");
  await expect(fallback).not.toContainText("private diagnostic details");
  await expect(page.locator(".preview-header")).toBeVisible();
  await expect(page.getByTestId("study-card")).toBeVisible();
  await expect(page.getByLabel("Captured errors")).toHaveText("1");
  await expect(page.getByLabel("Captured event ID")).toHaveText(/^[a-f0-9]{32}$/);
  await expect(fallback.getByRole("button", { name: "Try again" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(fallback).toHaveCount(0);
  await expect(page.getByText("Study summary is available.")).toBeVisible();
  expect(sent).toEqual([]);
});
