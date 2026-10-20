import { expect, test } from "@playwright/test";
import { openPreview } from "./open-preview";

test.beforeEach(async ({ page }) => {
  await openPreview(page, "/?section=groups");
  await expect(page.getByRole("heading", { name: "Foundations & controls" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
});

test("button groups expose labelled actions and segmented filters submit one selection", async ({
  page,
}) => {
  const actions = page.getByRole("toolbar", { name: "Icon actions", exact: true });
  await actions.getByRole("button", { name: "Previous" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(actions.getByRole("button", { name: "Add" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".group-action")).toHaveText("Add");
  const form = page.getByRole("form", { name: "Segmented filter form" });
  await form.getByRole("radio", { name: "View all" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(form.getByRole("radio", { name: "Active", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(form.getByRole("radio", { name: "Active", exact: true })).toBeChecked();
  await expect(form.getByRole("radio", { name: "View all" })).not.toBeChecked();
  await form.getByRole("radio", { name: "Active", exact: true }).click();
  await expect(form.getByRole("radio", { name: "Active", exact: true })).toBeChecked();
  await form.getByRole("button", { name: "Apply filter" }).click();
  await expect(form.getByRole("status")).toHaveText("active");
});

test("group base states preserve current, disabled and original state-specific icon dimensions", async ({
  page,
}) => {
  const fixtures = page.locator(".group-base-fixture");
  await expect(fixtures).toHaveCount(16);
  for (const fixture of await fixtures.all()) {
    const button = fixture.getByRole("button");
    expect((await button.boundingBox())?.height).toBe(40);
    const disabled = await button.isDisabled();
    const current = (await button.getAttribute("data-current")) === "true";
    const kind = await button.getAttribute("data-kind");
    const expectedWidth = kind === "dot" ? 10 : 20;
    for (const img of await button.locator("img:visible").all()) {
      expect(
        await img.evaluate((node) => ({
          natural: (node as HTMLImageElement).naturalWidth,
          rendered: node.getBoundingClientRect().width,
        }))
      ).toEqual({ natural: expectedWidth, rendered: expectedWidth });
      if (kind === "leading" || kind === "icon") {
        const stroke = await img.evaluate(async (node) => {
          const svg = await (await fetch((node as HTMLImageElement).src)).text();
          return new DOMParser()
            .parseFromString(svg, "image/svg+xml")
            .querySelector("path[stroke]")
            ?.getAttribute("stroke");
        });
        expect(stroke).toBe(disabled ? "#D5D7DA" : current ? "#717680" : "#A4A7AE");
      }
    }
    if (!disabled) {
      await button.hover();
      if (kind === "leading" || kind === "icon")
        await expect(button.locator(".p-group-placeholder-current img")).toBeVisible();
      await button.focus();
      expect(await button.evaluate((node) => getComputedStyle(node).boxShadow)).toContain("4px");
    }
  }
  await page
    .locator(".group-base-matrix")
    .screenshot({ path: "test-results/button-group-states.png" });
});

test("all 18 divider compositions match their source height and keep embedded controls usable", async ({
  page,
}) => {
  const fixtures = page.locator(".divider-matrix > div");
  await expect(fixtures).toHaveCount(18);
  for (const fixture of await fixtures.all()) {
    const divider = fixture.locator(".p-content-divider");
    const variant = await divider.getAttribute("data-variant");
    const kind = await fixture.getAttribute("data-divider-kind");
    const baseHeight = kind === "heading" ? 28 : kind === "text" ? 20 : 40;
    const padding =
      variant === "dual" ? (kind === "button-icon" ? 20 : 24) : variant === "filled" ? 16 : 0;
    expect((await divider.boundingBox())?.height).toBe(baseHeight + padding);
    if (kind === "heading") {
      await expect(divider.getByRole("heading", { name: "Notifications" })).toBeVisible();
    } else if (kind === "button" || kind === "button-icon") {
      await divider.getByRole("button").click();
      await expect(page.locator(".group-action")).toHaveText("Add");
    } else if (kind === "group") {
      await divider.getByRole("radio", { name: "Active", exact: true }).click();
      await expect(divider.getByRole("radio", { name: "Active", exact: true })).toBeChecked();
    } else if (kind === "group-icon") {
      await divider.getByRole("button", { name: "Next" }).click();
      await expect(page.locator(".group-action")).toHaveText("Next");
    }
  }
  await page.locator(".divider-matrix").screenshot({ path: "test-results/content-dividers.png" });
});
