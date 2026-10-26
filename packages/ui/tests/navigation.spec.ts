import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=navigation");
  await expect(page.getByRole("heading", { name: "Foundations & controls" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

test("account menus use source assets, select actions and restore keyboard focus", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "button closed account menu", exact: true });
  await trigger.scrollIntoViewIfNeeded();
  await trigger.focus();
  await page.keyboard.press("ArrowDown");
  const menu = page.getByRole("menu", { name: "button account options", exact: true }).last();
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("menuitem")).toHaveCount(11);
  await expect(menu.getByRole("menuitem", { name: "View profile" })).toBeFocused();
  expect((await menu.boundingBox())?.width).toBe(248);
  expect((await menu.locator(".p-dropdown-header").boundingBox())?.height).toBe(64);
  expect((await menu.getByRole("menuitem", { name: "Settings" }).boundingBox())?.height).toBe(36);
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Settings" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(trigger).toBeFocused();
  await expect(trigger.locator("..").getByRole("status")).toHaveText("Settings");
  await trigger.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  for (const variant of ["icon", "avatar"] as const) {
    const button = page.getByRole("button", {
      name: variant + " closed account menu",
      exact: true,
    });
    await button.click();
    const options = page
      .getByRole("menu", { name: variant + " account options", exact: true })
      .first();
    await expect(options).toBeVisible();
    if (variant === "icon") {
      const dimensions = await button.locator(".p-dropdown-dots-open img").evaluate((node) => {
        const image = node as HTMLImageElement;
        return { rendered: image.getBoundingClientRect().width, natural: image.naturalWidth };
      });
      expect(dimensions).toEqual({ rendered: 28, natural: 28 });
    } else expect((await button.boundingBox())?.width).toBe(40);
    await options.screenshot({ path: "test-results/dropdown-" + variant + ".png" });
    await page.keyboard.press("Escape");
  }
});

test("menu checkboxes keep the menu open, skip disabled entries and links navigate", async ({
  page,
}) => {
  const trigger = page.getByRole("button", { name: "Preferences", exact: true });
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Preference options" });
  const checkbox = menu.getByRole("menuitemcheckbox", { name: "Email updates" });
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect(menu).toBeVisible();
  expect((await checkbox.locator("img:visible").boundingBox())?.width).toBe(12);
  await expect(menu.getByRole("menuitemcheckbox", { name: "Managed setting" })).toHaveAttribute(
    "aria-disabled",
    "true"
  );
  await checkbox.focus();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Pagination examples" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#pagination-workbench$/);
  await expect(menu).not.toBeVisible();
  await expect(page.locator(".dropdown-preferences output")).toHaveText("Email updates enabled");
});

test("pagination controls update one shared page across desktop and mobile", async ({ page }) => {
  const nav = page.getByRole("navigation", { name: "Responsive pagination", exact: true });
  await nav.scrollIntoViewIfNeeded();
  await expect(nav.getByRole("button", { name: "Previous page" })).toBeDisabled();
  await nav.getByRole("button", { name: "Page 3", exact: true }).click();
  await expect(page.locator(".pagination-selection")).toHaveText("Selected page: 3");
  await expect(nav.getByRole("button", { name: "Page 3", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await nav.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".pagination-selection")).toHaveText("Selected page: 4");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(nav.getByText("Page 4 of 10")).toBeVisible();
  await nav.getByRole("button", { name: "Next page" }).click();
  await expect(nav.getByText("Page 5 of 10")).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 1100 });
  await expect(nav.getByRole("button", { name: "Page 5", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await nav.getByRole("button", { name: "Page 10", exact: true }).click();
  await expect(nav.getByRole("button", { name: "Next page" })).toBeDisabled();
  await expect(nav.getByRole("button", { name: "Page 10", exact: true })).toBeFocused();
});

test("all 24 pagination layouts preserve source controls and mobile grouping", async ({ page }) => {
  const fixtures = page.locator(".pagination-fixture");
  await expect(fixtures).toHaveCount(24);
  for (const fixture of await fixtures.all()) {
    const nav = fixture.getByRole("navigation");
    const mobile = (await fixture.getAttribute("data-breakpoint")) === "mobile";
    const grouped = (await nav.getAttribute("data-variant"))?.startsWith("card-group");
    const previous = nav.getByRole("button", { name: "Previous page" });
    await expect(previous).toBeDisabled();
    if (grouped) {
      expect((await previous.boundingBox())?.height).toBe(40);
      await expect(nav.getByRole("button", { name: /^Page \d/ })).toHaveCount(mobile ? 4 : 6);
    } else if (mobile) {
      expect((await previous.boundingBox())?.width).toBe(36);
      expect((await previous.boundingBox())?.height).toBe(36);
      await expect(nav.locator(".p-pagination-counter:visible")).toHaveText("Page 1 of 10");
    }
    expect(
      await nav.locator("img:visible").evaluateAll(async (images) =>
        Promise.all(
          images.map(async (node) => {
            const image = node as HTMLImageElement;
            await image.decode();
            return { natural: image.naturalWidth, rendered: image.getBoundingClientRect().width };
          })
        )
      )
    ).toEqual(
      Array.from({ length: await nav.locator("img:visible").count() }, () => ({
        natural: 20,
        rendered: 20,
      }))
    );
    await nav.getByRole("button", { name: "Next page" }).click();
    await expect(previous).toBeEnabled();
  }
  await page
    .locator("#pagination-workbench")
    .screenshot({ path: "test-results/pagination-layouts.png" });
});

test("all eight slide indicator variants retain source geometry and keyboard selection", async ({
  page,
}) => {
  const indicators = page.locator(".p-pagination-dots");
  await expect(indicators).toHaveCount(8);
  for (const indicator of await indicators.all()) {
    const large = (await indicator.getAttribute("data-size")) === "lg";
    const line = (await indicator.getAttribute("data-variant")) === "line";
    const framed = (await indicator.getAttribute("data-framed")) === "true";
    const box = await indicator.boundingBox();
    expect(box?.width).toBe(
      line
        ? (large ? 152 : 144) + (framed ? (large ? 24 : 16) : 0)
        : (large ? 62 : 48) + (framed ? (large ? 24 : 16) : 0)
    );
    expect(box?.height).toBe(
      (line ? (large ? 8 : 6) : large ? 10 : 8) + (framed ? (large ? 24 : 16) : 0)
    );
    const second = indicator.getByRole("button", { name: "Go to slide 2" });
    await second.focus();
    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("aria-current", "true");
    await expect(indicator.locator("[aria-current]")).toHaveCount(1);
  }
  await page
    .getByRole("heading", { name: "Pagination indicators", exact: true })
    .locator("..")
    .screenshot({ path: "test-results/pagination-indicators.png" });
});
