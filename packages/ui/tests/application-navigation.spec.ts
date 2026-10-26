import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";
import { applicationNavigationSources } from "../preview/application-navigation-source-data";
test("mobile navigation traps focus, exposes actions, and restores its trigger on Escape", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openPreview(page, "/?section=applicationnavigation");
  const trigger = page
    .getByTestId("live-mobile-navigation")
    .getByRole("button", { name: "Open navigation" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Study menu" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Account settings" }).click();
  await expect(page.getByTestId("app-nav-action")).toHaveText("Account settings");
  await dialog.getByRole("button", { name: "Close Study menu" }).focus();
  await page.keyboard.press("Tab");
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
test("navigation primitives preserve source frames and native SVG sizes", async ({ page }) => {
  await openPreview(page, "/?section=applicationnavigation");
  await page.evaluate(() => document.fonts.ready);
  const failures: string[] = [];
  const families = applicationNavigationSources.filter((family) =>
    [
      "1161:14070",
      "1165:736",
      "7891:71338",
      "7891:87996",
      "1152:89220",
      "1152:90366",
      "1157:90307",
      "1207:1678",
      "1158:90768",
    ].includes(family.id)
  );
  for (const family of families)
    for (const source of family.variants) {
      const box = await page.locator(`[data-app-nav-source-id="${source.id}"]`).boundingBox();
      if (
        !box ||
        Math.abs(box.width - source.width) > 0.15 ||
        Math.abs(box.height - source.height) > 0.15
      )
        failures.push(
          `${source.id}: ${box?.width}x${box?.height}; expected ${source.width}x${source.height}`
        );
    }
  expect(failures).toEqual([]);
  for (const [id, width] of [
    ["7891:88080", 264],
    ["7893:122795", 256],
  ] as const) {
    const box = await page.locator(`[data-app-nav-menu-source="${id}"]`).boundingBox();
    expect(box?.width).toBe(width);
    expect(box?.height).toBe(364);
  }
  const resized = await page.evaluate(async () =>
    (
      await Promise.all(
        [
          ...document.querySelectorAll<HTMLImageElement>(
            '.application-nav-source-grid img[src$=".svg"]'
          ),
        ].map(async (image) => {
          const root = new DOMParser().parseFromString(
            await (await fetch(image.src)).text(),
            "image/svg+xml"
          ).documentElement;
          const style = getComputedStyle(image);
          return Math.abs(
            Number.parseFloat(style.width) - Number.parseFloat(root.getAttribute("width") ?? "0")
          ) > 0.1 ||
            Math.abs(
              Number.parseFloat(style.height) -
                Number.parseFloat(root.getAttribute("height") ?? "0")
            ) > 0.1
            ? image.src
            : undefined;
        })
      )
    ).filter(Boolean)
  );
  expect(resized).toEqual([]);
  for (const theme of ["light", "dark", "sepia"]) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page
      .locator('[data-app-nav-source-id="1153:91434"]')
      .screenshot({ path: `test-results/nav-dropdown-${theme}.png` });
  }
});
test("live navigation expands, switches accounts and returns keyboard focus", async ({ page }) => {
  await openPreview(page, "/?section=applicationnavigation");
  const live = page.getByTestId("live-application-navigation");
  const menu = live.getByRole("button", { name: "Open navigation" });
  await menu.focus();
  await page.keyboard.press("Enter");
  await expect(live.getByRole("navigation", { name: "Study navigation" })).toBeVisible();
  const dashboard = live.getByRole("button", { name: "Dashboard", exact: true });
  await dashboard.click();
  await expect(dashboard).toHaveAttribute("aria-expanded", "true");
  await expect(live.getByRole("link", { name: "Reports" })).toBeVisible();
  const account = live.getByRole("button", { name: /Account menu for/ });
  await account.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menu", { name: "Account menu" })).toBeVisible();
  await page.getByRole("menuitemradio", { name: /Fatimah/ }).click();
  await expect(page.getByTestId("app-nav-account")).toHaveText("ngozi@PansGPT.com");
  await expect(account).toBeFocused();
  await account.click();
  await page.keyboard.press("Escape");
  await expect(account).toBeFocused();
  await account.click();
  await page.getByRole("menuitem", { name: /Sign out/ }).click();
  await expect(page.getByTestId("app-nav-action")).toHaveText("Sign out");
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
test("featured navigation cards expose project, consent, onboarding, referral and media actions", async ({
  page,
}) => {
  await openPreview(page, "/?section=applicationnavigation");
  const result = page.getByTestId("app-nav-action");
  await page
    .locator('[data-app-nav-source-id="7910:530582"]')
    .getByRole("button", { name: "Reject all", exact: true })
    .click();
  await expect(result).toHaveText("Reject all");
  await page
    .locator('[data-app-nav-source-id="7910:530587"]')
    .getByRole("link", { name: "iOS app prototypes" })
    .click();
  await expect(result).toHaveText("iOS app prototypes");
  await page
    .locator('[data-app-nav-source-id="7910:530589"]')
    .getByRole("button", { name: "Copy referral link" })
    .click();
  await expect(result).toHaveText("Copy uui.com/4060020");
  await page
    .locator('[data-app-nav-source-id="7910:530594"]')
    .getByRole("button", { name: "Continue setup" })
    .click();
  await expect(result).toHaveText("Continue setup");
  await page
    .locator('[data-app-nav-source-id="1157:99053"]')
    .getByRole("button", { name: "Play", exact: true })
    .click();
  await expect(result).toHaveText("Play feature preview");
  await page
    .locator('[data-app-nav-source-id="7912:554836"]')
    .getByRole("button", { name: "Verify another way" })
    .click();
  await expect(result).toHaveText("Verify another way");
});
