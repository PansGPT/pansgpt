const { test, expect } = require("@playwright/test");
const sections = [
  "Account",
  "Security",
  "Credits",
  "Appearance",
  "Notifications",
  "Privacy & Data",
  "Study & Wellbeing",
  "Data & Storage",
  "About PansGPT",
];
async function openSettings(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("pansgpt-theme", "dark"));
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 404, json: { detail: "Synthetic settings UI preview" } })
  );
  page.on("pageerror", (error) => console.error("Settings preview error:", error.message));
  await page.goto("/app", { waitUntil: "domcontentloaded", timeout: 60000 });
  if (page.viewportSize().width <= 860) {
    await page.getByRole("button", { name: "Open settings", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  }
  const modal = page.getByRole("dialog", { name: "Settings", exact: true });
  await expect(modal).toBeVisible();
  return modal;
}
async function chooseSetting(page, label, option) {
  const trigger = page.getByRole("combobox", { name: label, exact: true });
  await trigger.click();
  await page.getByRole("option", { name: option, exact: true }).click();
  await expect(trigger).toHaveText(option);
}
test("settings keeps separate categories, student-facing content and a bounded desktop layout", async ({
  page,
}) => {
  const modal = await openSettings(page);
  const nav = modal.getByRole("navigation", { name: "Settings navigation", exact: true });
  await expect(nav.getByRole("button")).toHaveText(sections);
  await expect(modal.getByText("User ID", { exact: true })).toHaveCount(0);
  await expect(modal.getByRole("button", { name: "Log out", exact: true })).toHaveCount(0);
  await expect(modal.getByRole("button", { name: "Save changes", exact: true })).toBeVisible();
  await expect(modal.getByRole("button", { name: "Save changes", exact: true })).toBeDisabled();
  const profileForm = modal.locator(".settings-account-section .settings-section-content");
  await expect(profileForm).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(profileForm).toHaveCSS("border-radius", "0px");
  await expect(profileForm).toHaveCSS("border-top-width", "1px");
  await expect(modal.getByRole("textbox", { name: "Name", exact: true })).toHaveCSS(
    "border-left-width",
    "1px"
  );
  await expect(modal.getByRole("button", { name: "Delete account", exact: true })).toBeVisible();
  await expect(modal.getByRole("combobox", { name: "Academic level", exact: true })).toBeVisible();
  await expect(modal.locator(".settings-content-pane")).toHaveCSS("scrollbar-width", "thin");
  await expect(modal.getByRole("button", { name: "Change password", exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("settings-account-desktop.png") });
  await modal.getByRole("textbox", { name: "Name", exact: true }).fill("Draft student name");
  await nav.getByRole("button", { name: "Security", exact: true }).click();
  await expect(modal.getByText("Password", { exact: true })).toBeVisible();
  await expect(modal.getByText("Manage your account password.", { exact: true })).toBeVisible();
  await modal.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(modal.getByRole("textbox", { name: "Name", exact: true })).toHaveCount(0);
  await expect(modal.getByLabel("New password", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("settings-security-desktop.png") });
  await nav.getByRole("button", { name: "Notifications", exact: true }).click();
  await modal.getByRole("switch", { name: "Finished replies", exact: true }).click();
  await nav.getByRole("button", { name: "Appearance", exact: true }).click();
  await chooseSetting(page, "Interface font", "System");
  await chooseSetting(page, "Response font", "Serif");
  await chooseSetting(page, "Motion preference", "Reduced");
  await modal.getByText("Sepia", { exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "sepia");
  await modal.getByText("Dark", { exact: true }).click();
  await nav.getByRole("button", { name: "Account", exact: true }).click();
  await expect(modal.getByRole("textbox", { name: "Name", exact: true })).toHaveValue(
    "Draft student name"
  );
  await nav.getByRole("button", { name: "Notifications", exact: true }).click();
  await expect(
    modal.getByRole("switch", { name: "Finished replies", exact: true })
  ).toHaveAttribute("aria-checked", "false");
  await nav.getByRole("button", { name: "Credits", exact: true }).click();
  await expect(modal.locator(".settings-credits-summary")).toContainText("20");
  await expect(modal.getByText("Credit usage", { exact: true })).toBeVisible();
  await expect(modal.getByText("Purchase history", { exact: true })).toBeVisible();
  await expect(modal.locator(".purchase-chat")).toHaveCount(0);
  await expect(
    modal.getByText(/Institutional Pilot|Managed by Faculty|Paystack|\u20a6/)
  ).toHaveCount(0);
  await nav.getByRole("button", { name: "Data & Storage", exact: true }).click();
  await expect(modal.getByRole("img", { name: /Sample storage breakdown/ })).toBeVisible();
  await expect(modal.locator(".settings-section-content").first()).toHaveCSS(
    "background-color",
    "rgba(0, 0, 0, 0)"
  );
  await expect(modal.locator(".settings-section-content").first()).toHaveCSS("padding-left", "0px");
  await expect(modal.getByRole("button", { name: "Remove downloads", exact: true })).toBeVisible();
  await expect(modal.getByRole("button", { name: "Clear cache", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("settings-storage-desktop.png") });
  await nav.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  for (const label of ["Shared chats", "Uploaded files", "Your feedback", "Export account data"])
    await expect(modal.getByText(label, { exact: true })).toBeVisible();
  await expect(modal.getByText("Help improve our AI models", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("settings-privacy-desktop.png") });
  await nav.getByRole("button", { name: "About PansGPT", exact: true }).click();
  await expect(modal.getByRole("textbox", { name: "Your message", exact: true })).toHaveCount(0);
  const feedbackRow = modal.getByRole("button", { name: /Send feedback/ });
  await feedbackRow.click();
  const feedbackDialog = page.getByRole("dialog", { name: "Send feedback", exact: true });
  await expect(
    feedbackDialog.getByRole("textbox", { name: "Your message", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(feedbackDialog).not.toBeVisible();
  await expect(modal).toBeVisible();
  await expect(feedbackRow).toBeFocused();
  await expect(modal.getByText("Getting started", { exact: true })).toHaveCount(0);
  await expect(modal.getByText("Keyboard shortcuts", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("settings-about-desktop.png") });
  const search = nav.getByRole("combobox", { name: "Search settings", exact: true });
  await search.fill("name");
  const results = nav.getByRole("listbox", { name: "Matching settings", exact: true });
  await expect(results.getByRole("option")).toHaveText(["AccountFull name"]);
  await expect(nav.getByRole("button")).toHaveText(sections);
  await expect(search).toHaveCSS("outline-style", "none");
  await expect(results).toHaveCSS("scrollbar-width", "thin");
  await page.screenshot({ path: test.info().outputPath("settings-search-desktop.png") });
  await search.press("Enter");
  await expect(modal.getByRole("textbox", { name: "Name", exact: true })).toBeFocused();
  await expect(results).not.toBeVisible();
  await search.fill("response font");
  await results.getByRole("option", { name: "Appearance Response font", exact: true }).click();
  await expect(modal.getByRole("combobox", { name: "Response font", exact: true })).toBeFocused();
  await search.fill("reminders");
  await expect(results.getByRole("option")).toHaveCount(3);
  await search.press("ArrowDown");
  await expect(results.getByRole("option").nth(1)).toHaveAttribute("aria-selected", "true");
  await search.press("Enter");
  await expect(modal.getByRole("switch", { name: "Break reminders", exact: true })).toBeFocused();
  await search.fill("clear cache");
  await search.press("Enter");
  await expect(modal.locator('[data-settings-label="Cached files & previews"]')).toBeFocused();
  await expect(modal.getByRole("button", { name: "Clear cache", exact: true })).toBeInViewport();
  await search.fill("nothing matches this setting");
  await expect(nav.getByRole("status")).toHaveText("No matching settings.");
  await search.press("Escape");
  await expect(results).not.toBeVisible();
  await expect(modal).toBeVisible();
  await search.fill("data");
  await search.press("ArrowUp");
  await expect(results.getByRole("option").last()).toHaveAttribute("aria-selected", "true");
  await expect(results.getByRole("option").last()).toBeInViewport();
  await page.screenshot({ path: test.info().outputPath("settings-search-scrolling.png") });
  await search.press("Escape");
  await search.fill("");
  for (const [width, height] of [
    [1024, 500],
    [900, 440],
  ]) {
    await page.setViewportSize({ width, height });
    const box = await modal.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    await expect(
      modal.getByRole("button", { name: "Close settings", exact: true })
    ).toBeInViewport();
  }
  await page.screenshot({ path: test.info().outputPath("settings-short-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Account menu", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Learn more", exact: true }).hover();
  await page.getByRole("menuitem", { name: "Keyboard shortcuts", exact: true }).click();
  const shortcuts = page.getByRole("dialog", { name: "Keyboard shortcuts", exact: true });
  await expect(shortcuts).toBeVisible();
  await expect(modal).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(shortcuts).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Account menu", exact: true })).toBeFocused();
});

test("mobile settings retains grouped menus, separate Security and usable storage/privacy pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const modal = await openSettings(page);
  const menu = modal.locator(".settings-mobile-menu-pane");
  const content = modal.locator(".settings-content-pane");
  await expect(menu).toHaveCSS("scrollbar-width", "thin");
  await expect(modal.locator(".settings-mobile-header h2")).not.toBeVisible();
  await expect(page.getByRole("menu", { name: "Account options", exact: true })).toHaveCount(0);
  const creditRing = page.locator(".shell-credit-profile-progress");
  await expect(creditRing).toHaveAttribute("stroke-dashoffset", "60");
  for (const [balance, offset] of [
    [10, "80"],
    [50, "0"],
    [0, "100"],
  ]) {
    await page.evaluate((next) => window.__changePreviewCredits(next, 50), balance);
    await expect(creditRing).toHaveAttribute("stroke-dashoffset", offset);
  }
  await page.evaluate(() => window.__changePreviewCredits(null, null));
  await expect(page.locator(".shell-credit-profile")).toHaveAttribute(
    "data-credit-state",
    "unavailable"
  );
  await expect(creditRing).toHaveCount(0);
  await page.evaluate(() => window.__changePreviewCredits(20, 50));
  await expect(menu.locator(".settings-menu-row")).toHaveText(
    sections
      .filter((label) => label !== "Account")
      .map((label) => (label === "Credits" ? "Credits20 credits" : label))
  );
  await expect(menu.getByRole("button", { name: "Account", exact: true })).toHaveCount(0);
  await expect(menu.getByRole("button", { name: "Edit profile", exact: true })).toBeVisible();
  const menuCards = await menu
    .locator(".settings-menu-profile-card, .settings-menu-group-card, .settings-menu-signout")
    .evaluateAll((cards) =>
      cards.map((card) => {
        const style = getComputedStyle(card);
        return {
          border: style.borderLeftWidth,
          radius: parseFloat(style.borderRadius),
          background: style.backgroundColor,
        };
      })
    );
  for (const card of menuCards) {
    expect(card.border).toBe("0px");
    expect(card.radius).toBeGreaterThan(0);
    expect(card.background).not.toBe("rgba(0, 0, 0, 0)");
  }
  const menuInsets = await menu
    .locator(".settings-menu-row")
    .first()
    .evaluate((row) => {
      const card = row.parentElement.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      return { left: box.left - card.left, right: card.right - box.right };
    });
  expect(menuInsets).toEqual({ left: 18, right: 18 });
  await expect(content).toHaveAttribute("inert", "");
  await expect(modal.getByRole("textbox", { name: "Name", exact: true })).toHaveCount(0);
  await menu.getByRole("button", { name: "Log Out", exact: true }).focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() => Boolean(document.activeElement.closest(".settings-content-pane")))
  ).toBe(false);
  await menu.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({ path: test.info().outputPath("settings-menu-mobile.png") });
  await menu.getByRole("button", { name: "Security", exact: true }).click();
  await expect(menu).toHaveAttribute("inert", "");
  await expect(modal.getByRole("heading", { name: "Security", exact: true })).toHaveCount(1);
  await expect(content.locator(".settings-section-content")).toHaveCSS("border-left-width", "0px");
  await expect(content.locator(".settings-section-content")).toHaveCSS("border-radius", "14px");
  await expect(modal.getByRole("button", { name: "Change password", exact: true })).toBeVisible();
  const passwordRow = content.locator('[data-settings-label="Password"]');
  await expect(passwordRow.locator(".settings-row-title .settings-copy-mobile")).toHaveText(
    "Change password"
  );
  await expect(modal.getByText("Manage your account password.", { exact: true })).not.toBeVisible();
  await expect(passwordRow.locator(".settings-row-title")).toHaveCSS("font-size", "13px");
  const rowInset = await passwordRow.evaluate((row) => {
    const card = row.parentElement.getBoundingClientRect();
    const box = row.getBoundingClientRect();
    return { left: box.left - card.left, right: card.right - box.right };
  });
  expect(rowInset.left).toBe(18);
  expect(rowInset.right).toBe(18);
  await page.screenshot({ path: test.info().outputPath("settings-security-mobile.png") });
  await modal.getByRole("button", { name: "Back to settings menu", exact: true }).click();
  await expect(menu.getByRole("button", { name: "Security", exact: true })).toBeFocused();
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await menu.getByRole("button", { name: "Edit profile", exact: true }).click();
    await expect(modal.getByRole("button", { name: "Log out", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("button", { name: "Save changes", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("heading", { name: "Your profile", exact: true })).toHaveCount(0);
    await expect(modal.getByRole("textbox", { name: "Name", exact: true })).toHaveCSS(
      "font-size",
      "12px"
    );
    await expect(modal.getByRole("combobox", { name: "Academic level", exact: true })).toHaveCSS(
      "font-size",
      "12px"
    );
    for (const label of ["Email", "University"]) {
      await expect(
        content.locator(`[data-settings-label="${label}"] .settings-account-value`)
      ).toHaveCSS("font-size", "12px");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    const box = await modal.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    if (width === 390)
      await page.screenshot({ path: test.info().outputPath("settings-account-mobile.png") });
    if (width === 390) {
      const level = modal.getByRole("combobox", { name: "Academic level", exact: true });
      await level.click();
      const list = page.getByRole("listbox");
      await expect(list.getByRole("option", { name: "200 Level", exact: true })).toHaveAttribute(
        "aria-selected",
        "true"
      );
      const bounds = await list.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      await expect(list.locator(".settings-select-viewport")).toHaveCSS("scrollbar-width", "thin");
      await page.screenshot({ path: test.info().outputPath("settings-dropdown-mobile.png") });
      await page.keyboard.press("Escape");
      await expect(list).not.toBeVisible();
      await expect(level).toBeFocused();
      await expect(modal.getByRole("heading", { name: "Account", exact: true })).toBeVisible();
      await level.click();
      await expect(page.getByRole("option", { name: "200 Level", exact: true })).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(page.getByRole("option", { name: "300 Level", exact: true })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(level).toHaveText("300 Level");
      await chooseSetting(page, "Academic level", "Not set");
      await chooseSetting(page, "Academic level", "200 Level");
    }
    await page.keyboard.press("Escape");
    await expect(menu).not.toHaveAttribute("inert", "");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await menu.getByRole("button", { name: "Data & Storage", exact: true }).click();
  await expect(modal.getByRole("img", { name: /Sample storage breakdown/ })).toBeVisible();
  await expect(content.locator(".settings-row").first()).toHaveCSS("border-bottom-width", "1px");
  const storageInset = await content
    .locator(".settings-row")
    .first()
    .evaluate((row) => {
      const card = row.parentElement.getBoundingClientRect();
      const box = row.getBoundingClientRect();
      return { left: box.left - card.left, right: card.right - box.right };
    });
  expect(storageInset).toEqual(rowInset);
  await expect(content.getByText("Downloads", { exact: true })).toBeVisible();
  await expect(
    content.getByText("Files saved for offline reading.", { exact: true })
  ).toBeVisible();
  await expect(
    content.getByText("Files saved to read offline.", { exact: true })
  ).not.toBeVisible();
  await page.screenshot({ path: test.info().outputPath("settings-storage-mobile.png") });
  await page.keyboard.press("Escape");
  await menu.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  for (const label of ["Shared chats", "Uploaded files", "My feedback", "Export my data"])
    await expect(modal.getByText(label, { exact: true })).toBeVisible();
  await expect(content.getByText("Restore within 30 days.", { exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("settings-privacy-mobile.png") });
  await page.keyboard.press("Escape");
  await menu.getByRole("button", { name: "Study & Wellbeing", exact: true }).click();
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const description = content.locator(
      ".settings-response-detail-row .settings-row-description.settings-copy-mobile"
    );
    const measurements = await description.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    }));
    expect(measurements.height).toBeLessThanOrEqual(measurements.lineHeight + 1);
    await expect(
      content.getByRole("combobox", { name: "Response detail", exact: true })
    ).toBeInViewport();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseSetting(page, "Response detail", "Concise");
  await expect(content.getByRole("combobox", { name: "Response detail", exact: true })).toHaveText(
    "Concise"
  );
  await page.screenshot({ path: test.info().outputPath("settings-response-detail-mobile.png") });
  for (const section of ["Credits", "Notifications"]) {
    await page.keyboard.press("Escape");
    await menu
      .getByRole("button", {
        name: section === "Credits" ? /^Credits/ : section,
        exact: section !== "Credits",
      })
      .click();
    await expect(modal.getByRole("heading", { name: section, exact: true })).toHaveCount(1);
    if (section === "Credits") {
      const summary = content.locator(".settings-credits-summary");
      const card = content.locator(".settings-section-content");
      await expect(summary).toContainText("20");
      await expect(summary).toHaveCSS("border-top-width", "0px");
      await expect(card).toHaveCSS("border-radius", "14px");
      await expect(card).toHaveCSS("padding-left", "18px");
      await expect(content.getByText("Credit usage", { exact: true })).toBeVisible();
      await expect(content.getByText("Purchase history", { exact: true })).toBeVisible();
      await expect(modal.locator(".purchase-chat")).toHaveCount(0);
      await expect(
        content.getByText(/Institutional Pilot|Managed by Faculty|Billing & Study/)
      ).toHaveCount(0);
      for (const width of [320, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await expect
          .poll(() => content.evaluate((el) => el.scrollWidth <= el.clientWidth))
          .toBe(true);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.__changePreviewCredits(null, null));
      await expect(summary).toContainText("Unavailable");
      await page.evaluate(() => window.__changePreviewCredits(20, 50));
    }
    if (section === "Notifications") {
      await expect(
        content.getByText("Notify me when a reply is ready.", { exact: true })
      ).toBeVisible();
      await expect(
        content.getByText("New materials from your courses.", { exact: true })
      ).toBeVisible();
    }
    await page.screenshot({
      path: test.info().outputPath(`settings-${section.toLowerCase()}-mobile.png`),
    });
  }
  await page.keyboard.press("Escape");
  await menu.getByRole("button", { name: "About PansGPT", exact: true }).click();
  await expect(modal.getByRole("textbox", { name: "Your message", exact: true })).toHaveCount(0);
  await modal.getByRole("button", { name: /Send feedback/ }).click();
  const mobileFeedback = page.getByRole("dialog", { name: "Send feedback", exact: true });
  await expect(
    mobileFeedback.getByRole("textbox", { name: "Your message", exact: true })
  ).toBeFocused();
  await page.screenshot({ path: test.info().outputPath("settings-feedback-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(mobileFeedback).not.toBeVisible();
  await expect(modal.getByRole("heading", { name: "About PansGPT", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(modal).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open settings", exact: true })).toBeFocused();
});
