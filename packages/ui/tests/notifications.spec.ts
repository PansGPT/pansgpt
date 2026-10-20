import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

type SourceVariant = {
  name: string;
  width: number;
  height: number;
  children: { name: string; width: number; height: number }[];
};
const source = JSON.parse(
  readFileSync(resolve(__dirname, "../design/notification-geometry.json"), "utf8")
) as SourceVariant[];
const sourceType: Record<string, string> = {
  "primary-icon": "Primary icon",
  image: "Image",
  avatar: "Avatar",
  "gray-icon": "Gray icon",
  "error-icon": "Error icon",
  "warning-icon": "Warning icon",
  "success-icon": "Success icon",
  "no-icon": "No icon",
  progress: "Progress indicator",
};

test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=notifications");
  await page.evaluate(() => document.fonts.ready);
});

test("all notification variants match archived source bounds and local asset dimensions", async ({
  page,
}) => {
  test.setTimeout(60000);
  const frames = page.locator(".notification-source-frame");
  await expect(frames).toHaveCount(18);
  for (const frame of await frames.all()) {
    const type = (await frame.getAttribute("data-type")) ?? "";
    const breakpoint = await frame.getAttribute("data-breakpoint");
    const variant = source.find(
      (item) =>
        item.name ===
        `Type=${sourceType[type]}, Breakpoint=${breakpoint === "mobile" ? "Mobile" : "Desktop"}`
    );
    expect(variant).toBeDefined();
    const bounds = await frame.boundingBox();
    expect({ width: bounds?.width, height: bounds?.height }, `${type}/${breakpoint} frame`).toEqual(
      { width: variant?.width, height: variant?.height }
    );
    const card = await frame.locator(".p-notification").boundingBox();
    const expected = variant?.children.find((item) => item.name === "Notification");
    expect({ width: card?.width, height: card?.height }, `${type}/${breakpoint} card`).toEqual({
      width: expected?.width,
      height: expected?.height,
    });
    for (const image of await frame.locator("img:visible").all()) {
      await image.evaluate(async (node) => {
        await (node as HTMLImageElement).decode();
      });
      expect(
        await image.evaluate(
          (node) =>
            (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0
        )
      ).toBe(true);
    }
    for (const image of await frame
      .locator(".p-notification-icon img, .p-notification-close img")
      .all())
      expect(
        await image.evaluate((node) => ({
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        }))
      ).toEqual({ width: 20, height: 20 });
  }
  await page
    .locator('.notification-source-frame[data-type="image"][data-breakpoint="desktop"]')
    .screenshot({ path: "test-results/notification-image-desktop.png" });
  await page
    .locator('.notification-source-frame[data-type="image"][data-breakpoint="mobile"]')
    .screenshot({ path: "test-results/notification-image-mobile.png" });
  await page
    .locator('.notification-source-frame[data-type="progress"][data-breakpoint="mobile"]')
    .screenshot({ path: "test-results/notification-progress-mobile.png" });
});

test("notification actions, progress values and controlled dismissal survive responsive changes", async ({
  page,
}) => {
  const error = page.locator(
    '.notification-source-frame[data-type="error-icon"][data-breakpoint="mobile"]'
  );
  await error.getByRole("button", { name: "Undo action" }).click();
  await expect(page.getByRole("status", { name: "Last notification action" })).toHaveText(
    "error-icon/mobile/Undo action"
  );
  await error.getByRole("button", { name: "Close notification" }).focus();
  await page.keyboard.press("Enter");
  await expect(error.locator(".p-notification")).toHaveCount(0);
  await expect(page.getByRole("alert", { name: "Error announcement example" })).toBeVisible();
  const controlled = page.locator(".notification-controlled-example");
  await expect(controlled.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "60");
  await controlled.getByRole("button", { name: "Finish upload" }).click();
  await expect(controlled.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await expect(controlled.locator(".p-notification-progress > span")).toHaveText(
    "100% uploaded..."
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(controlled.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await controlled.getByRole("button", { name: "Close notification" }).click();
  await expect(controlled.getByRole("progressbar")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await controlled.getByRole("button", { name: "Show controlled notification" }).click();
  await expect(controlled.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
});
