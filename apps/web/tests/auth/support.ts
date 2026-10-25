import { expect, type APIRequestContext, type Page } from "@playwright/test";
export async function openNavigation(page: Page): Promise<void> {
  const trigger = page.getByRole("button", { name: "Open navigation", exact: true });
  if (await trigger.isVisible()) await trigger.click();
  else {
    await page
      .locator(".shell-home-account")
      .getByRole("button", { name: "Account menu", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Navigation", exact: true }).click();
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
  await accountMenu(page);
  await page.getByRole("menuitem", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Your profile", exact: true })).toBeVisible();
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
