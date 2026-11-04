import { expect, type APIRequestContext, type Page } from "@playwright/test";
export async function openNavigation(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await trigger.isVisible()) await trigger.click();
  else {
    // Home now uses its Study tools links and a direct Settings profile button.
    await page
      .getByRole("navigation", { name: "Study tools", exact: true })
      .getByRole("link", { name: "Quiz", exact: true })
      .click();
    await expect(page).toHaveURL(/\/app\/quiz$/);
    await trigger.click();
  }
}
export async function accountMenu(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 1440) <= 860) {
    const navigation = page.getByRole("dialog", { name: "Workspace navigation", exact: true });
    const homeAccount = page
      .locator(".shell-home-account")
      .getByRole("button", { name: "Account menu", exact: true });
    if (!(await navigation.isVisible()) && (await homeAccount.isVisible())) {
      await homeAccount.click();
      return;
    }
    if (!(await navigation.isVisible())) await openNavigation(page);
    await navigation.getByRole("button", { name: "Account menu", exact: true }).click();
  } else await page.getByRole("button", { name: "Account menu", exact: true }).click();
}
export async function openProfile(page: Page): Promise<void> {
  await openSettings(page);
  await selectSettingsSection(page, "Account");
}
export async function openSettings(page: Page): Promise<void> {
  const direct = page.getByRole("button", { name: "Open settings", exact: true });
  if (await direct.isVisible()) await direct.click();
  else {
    await accountMenu(page);
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  }
  await expect(page.getByRole("dialog", { name: "Settings", exact: true })).toBeVisible();
}
export async function selectSettingsSection(
  page: Page,
  section: "Account" | "Appearance"
): Promise<void> {
  const modal = page.getByRole("dialog", { name: "Settings", exact: true });
  if ((page.viewportSize()?.width ?? 1440) <= 860) {
    const back = modal.getByRole("button", { name: "Back to settings menu", exact: true });
    if (await back.isVisible()) await back.click();
    await modal
      .locator(".settings-mobile-menu-pane")
      .getByRole("button", { name: section === "Account" ? "Edit profile" : section, exact: true })
      .click();
  } else {
    await modal
      .getByRole("navigation", { name: "Settings navigation", exact: true })
      .getByRole("button", { name: section, exact: true })
      .click();
  }
}
export async function openAppearance(page: Page): Promise<void> {
  await openSettings(page);
  await selectSettingsSection(page, "Appearance");
}
export async function closeSettings(page: Page): Promise<void> {
  const modal = page.getByRole("dialog", { name: "Settings", exact: true });
  await page.keyboard.press("Escape");
  if ((page.viewportSize()?.width ?? 1440) <= 860) {
    await expect(modal.locator(".settings-mobile-menu-pane")).not.toHaveAttribute("inert", "");
    await page.keyboard.press("Escape");
  }
  await expect(modal).not.toBeVisible();
}
export async function startNewChat(page: Page): Promise<void> {
  if ((page.viewportSize()?.width ?? 1440) <= 860) {
    await openNavigation(page);
    await page
      .getByRole("dialog", { name: "Workspace navigation", exact: true })
      .getByRole("link", { name: "New chat", exact: true })
      .click();
  } else {
    await page
      .getByRole("complementary", { name: "Workspace sidebar", exact: true })
      .getByRole("link", { name: "New chat", exact: true })
      .click();
  }
}
export async function logout(page: Page): Promise<void> {
  await accountMenu(page);
  await page.getByRole("menuitem", { name: "Log out", exact: true }).click();
}
export async function emailLink(
  request: APIRequestContext,
  email: string,
  subject: string
): Promise<string> {
  let html = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `http://127.0.0.1:54324/view/latest.html?query=${encodeURIComponent(`to:${email} subject:${subject}`)}`
        );
        if (response.ok()) html = await response.text();
        return /href="http[^\"]+\/auth\/v1\/verify\?/.test(html);
      },
      { timeout: 30000 }
    )
    .toBe(true);
  const link = html.match(/href="(http[^\"]+\/auth\/v1\/verify\?[^\"]+)"/)?.[1];
  if (!link) throw new Error("Captured email has no confirmation link.");
  return link.replaceAll("&amp;", "&");
}
