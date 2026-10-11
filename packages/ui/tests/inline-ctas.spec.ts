import { test, expect } from "@playwright/test";
import { inlineCTASources } from "../preview/inline-cta-source-data";

test("all fourteen inline CTA layouts preserve source frames and native SVGs", async ({ page }) => {
  await page.setViewportSize({ width: 1500, height: 1100 });
  await page.goto("/?section=inlinectas");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  for (const [id, type, breakpoint, width, height] of inlineCTASources) {
    const frame = await page.locator(`[data-cta-source-id="${id}"]`).boundingBox();
    expect(frame?.width, `${type}/${breakpoint}`).toBe(width);
    expect(frame?.height, `${type}/${breakpoint}`).toBe(height);
  }
  for (const img of await page.locator('img[src$=".svg"]:visible').all()) {
    const dimensions = await img.evaluate((element: HTMLImageElement) => ({
      loaded: element.complete && element.naturalWidth > 0,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      nativeWidth: element.naturalWidth,
      nativeHeight: element.naturalHeight,
    }));
    expect(dimensions.loaded).toBe(true);
    expect(dimensions.width).toBe(dimensions.nativeWidth);
    expect(dimensions.height).toBe(dimensions.nativeHeight);
  }
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.screenshot({ path: `test-results/inline-ctas-${theme}.png`, fullPage: true });
  }
});

test("email capture validates, submits, preserves responsive state and respects pending/disabled controls", async ({
  page,
}) => {
  await page.goto("/?section=inlinectas");
  const live = page.getByTestId("live-inline-cta");
  const email = live.getByRole("textbox", { name: "Subscribe to updates" });
  const submit = live.getByRole("button", { name: "Subscribe", exact: true });
  await email.fill("invalid");
  await submit.click();
  await expect(page.getByTestId("inline-cta-action")).toBeEmpty();
  await email.fill("student@example.com");
  await email.press("Enter");
  await expect(page.getByTestId("inline-cta-action")).toHaveText("Subscribed: student@example.com");
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(email).toHaveValue("student@example.com");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page.getByLabel("Pending subscription").check();
  await expect(email).toBeDisabled();
  await expect(submit).toBeDisabled();
  await expect(live.locator("form")).toHaveAttribute("aria-busy", "true");
  await page.getByLabel("Pending subscription").uncheck();
  await page.getByLabel("Disable subscription").check();
  await expect(submit).toBeDisabled();
  await page.getByLabel("Disable subscription").uncheck();
  await live.getByRole("button", { name: "Dismiss update" }).click();
  await expect(live).toHaveCount(0);
  await page.getByRole("button", { name: "Show update" }).click();
  await expect(email).toHaveValue("student@example.com");
  const payment = page.locator('[data-cta-source-id="1255:132295"]');
  await payment.getByRole("button", { name: "Edit" }).click();
  await expect(page.getByTestId("inline-cta-action")).toHaveText("Edit");
});
