import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=alerts");
  await page.evaluate(() => document.fonts.ready);
});

test("all 24 alert fixtures match source bounds and preserve icon geometry", async ({ page }) => {
  const fixtures = page.locator(".alert-fixture");
  await expect(fixtures).toHaveCount(24);
  for (const fixture of await fixtures.all()) {
    const layout = await fixture.getAttribute("data-layout");
    const mobile = (await fixture.getAttribute("data-breakpoint")) === "mobile";
    const color = await fixture.getAttribute("data-color");
    const alert = fixture.locator(".p-alert");
    const expectedHeight =
      layout === "floating"
        ? mobile
          ? color === "default"
            ? 184
            : 164
          : 108
        : mobile
          ? ["default", "brand", "gray"].includes(color ?? "")
            ? 182
            : 110
          : ["default", "brand", "gray"].includes(color ?? "")
            ? 64
            : 60;
    expect((await alert.boundingBox())?.height, `${layout}/${mobile}/${color}`).toBe(
      expectedHeight
    );
    for (const image of await alert.locator("img:visible").all()) {
      expect(
        await image.evaluate((node) => {
          const image = node as HTMLImageElement;
          return {
            loaded: image.complete && image.naturalWidth > 0,
            width: image.getBoundingClientRect().width,
            height: image.getBoundingClientRect().height,
          };
        })
      ).toEqual({ loaded: true, width: 20, height: 20 });
    }
  }
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.locator(".preview").evaluate((node) => {
    (node as HTMLElement).style.maxWidth = "1600px";
  });
  await fixtures.first().locator(".p-alert").screenshot({ path: "test-results/alert-desktop.png" });
  await page
    .locator(
      '.alert-fixture[data-color="warning"][data-layout="floating"][data-breakpoint="mobile"] .p-alert'
    )
    .screenshot({ path: "test-results/alert-mobile.png" });
});

test("alert actions, dismissal, controlled visibility and responsive layout work", async ({
  page,
}) => {
  const fixture = page.locator(
    '.alert-fixture[data-color="error"][data-layout="floating"][data-breakpoint="mobile"]'
  );
  await fixture.getByRole("button", { name: "Learn more" }).click();
  await expect(page.getByRole("status", { name: "Last alert action" })).toHaveText(
    "error/floating/mobile"
  );
  await fixture.getByRole("button", { name: "Close alert" }).focus();
  await page.keyboard.press("Enter");
  await expect(fixture.locator(".p-alert")).toHaveCount(0);
  const controlled = page.locator(".alert-controlled-example");
  await expect(controlled.getByRole("status")).toHaveAccessibleName("Responsive controlled alert");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(controlled.getByRole("status")).toBeVisible();
  await controlled.getByRole("button", { name: "Dismiss" }).click();
  await expect(controlled.getByRole("status")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 1100 });
  await expect(controlled.getByRole("status")).toHaveCount(0);
  await controlled.getByRole("button", { name: "Show controlled alert" }).click();
  await expect(controlled.getByRole("status")).toBeVisible();
});
