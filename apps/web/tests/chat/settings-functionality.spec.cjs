const { test, expect } = require("@playwright/test");
test.use({ actionTimeout: 15000 });
const current = "01900000-0000-7000-8000-000000000001";
const other = "01900000-0000-7000-8000-000000000002";
const sessions = [
  {
    id: current,
    device: "Chrome (Windows)",
    device_type: "desktop",
    ip_address: "192.0.2.10",
    created_at: "2026-11-15T10:00:00Z",
    last_active_at: "2026-11-15T10:00:00Z",
    is_current: true,
  },
  {
    id: other,
    device: "Unknown device",
    device_type: "unknown",
    ip_address: null,
    created_at: null,
    last_active_at: null,
    is_current: false,
  },
];
async function open(page, mobile = false) {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({ status: 404, json: { detail: "Synthetic settings preview" } })
  );
  await page.route("**/api/settings/sessions", (route) =>
    route.fulfill({ json: { sessions, has_more: false } })
  );
  await page.goto("/app", { waitUntil: "domcontentloaded" });
  if (mobile) await page.getByRole("button", { name: "Open settings", exact: true }).click();
  else {
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  }
  return page.getByRole("dialog", { name: "Settings", exact: true });
}
async function security(page, mobile = false) {
  const modal = await open(page, mobile);
  await modal.getByRole("button", { name: "Security", exact: true }).click();
  return modal;
}
async function passwords(editor) {
  await editor.getByLabel("New password", { exact: true }).fill("synthetic-new-password-123");
  await editor.getByLabel("Confirm password", { exact: true }).fill("synthetic-new-password-123");
}
const unavailable = { detail: { code: "UNAVAILABLE", message: "PRIVATE PROVIDER DETAILS" } };

test("desktop password waits for confirmation, preserves failed drafts and retries explicitly", async ({
  page,
}) => {
  let held;
  let attempts = 0;
  await page.route("**/api/settings/password", (route) => {
    attempts++;
    held = route;
  });
  const modal = await security(page);
  await expect(modal.locator("tbody tr")).toHaveCount(2);
  await page.route("**/api/settings/sessions", (route) =>
    route.fulfill({ json: { sessions: [sessions[0]], has_more: false } })
  );
  await modal.getByRole("button", { name: "Change password", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Change password", exact: true });
  await passwords(editor);
  await editor.getByRole("button", { name: "Update password", exact: true }).click();
  await expect.poll(() => !!held).toBe(true);
  await expect(editor.getByRole("button", { name: "Updating…", exact: true })).toBeDisabled();
  await expect(editor.getByRole("button", { name: "Close dialog", exact: true })).toBeDisabled();
  await held.fulfill({ status: 503, json: unavailable });
  await expect(editor.getByRole("alert")).toHaveText("Something went wrong. Please try again.");
  await expect(editor.getByLabel("New password", { exact: true })).toHaveValue(
    "synthetic-new-password-123"
  );
  held = null;
  await editor.getByRole("button", { name: "Update password", exact: true }).click();
  await expect.poll(() => !!held).toBe(true);
  await held.fulfill({ json: { status: "updated" } });
  await expect(editor).not.toBeVisible();
  await expect(page.locator("[data-sonner-toast]")).toContainText("Password updated.");
  await expect(modal.locator("tbody tr")).toHaveCount(1);
  expect(attempts).toBe(2);
});

test("password security challenge requests a code only on demand and sends it with the update", async ({
  page,
}) => {
  let codeRequests = 0;
  let payload;
  await page.route("**/api/settings/password/reauthenticate", (route) => {
    codeRequests++;
    return route.fulfill({ json: { status: "sent" } });
  });
  await page.route("**/api/settings/password", (route) => {
    payload = route.request().postDataJSON();
    return route.fulfill(
      payload.nonce
        ? { json: { status: "updated" } }
        : { status: 409, json: { detail: { code: "REAUTHENTICATION_REQUIRED" } } }
    );
  });
  const modal = await security(page);
  await modal.getByRole("button", { name: "Change password", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Change password", exact: true });
  await passwords(editor);
  await editor.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(editor.getByLabel("Confirmation code", { exact: true })).toBeVisible();
  expect(codeRequests).toBe(0);
  await editor.getByRole("button", { name: "Send confirmation code", exact: true }).click();
  await expect(editor.getByRole("status")).toContainText("Confirmation code sent");
  await editor.getByLabel("Confirmation code", { exact: true }).fill("123456");
  await editor.getByRole("button", { name: "Update password", exact: true }).click();
  await expect(editor).not.toBeVisible();
  expect(payload.nonce).toBe("123456");
  expect(codeRequests).toBe(1);
});

test("desktop owned devices remain after failed logout and all-others keeps the current session", async ({
  page,
}) => {
  const modal = await security(page);
  await expect(modal.locator("tbody tr")).toHaveCount(2);
  await expect(modal.locator("thead th")).toHaveText([
    "Device",
    "Location",
    "Signed in",
    "Last active",
  ]);
  expect(
    await modal.locator("thead th").evaluateAll((cells) => cells.map((cell) => cell.style.width))
  ).toEqual(["32%", "22%", "23%", "23%"]);
  await expect(modal.locator("tbody tr").first().locator("td").nth(1)).toHaveText("Not available");
  await expect(modal.locator("tbody tr").first().locator("td").nth(1)).toHaveAttribute(
    "title",
    "IP address: 192.0.2.10"
  );
  await expect(modal.locator("tbody tr").first().locator("td").nth(2)).toHaveText(
    /^Nov 15, 2026, \d{1,2}:\d{2} [AP]M$/
  );
  await expect(
    modal
      .getByRole("button", { name: "Session options for Unknown device", exact: true })
      .locator("svg")
  ).toHaveAttribute("class", /lucide-(ellipsis|more-horizontal)/);
  await page.screenshot({ path: test.info().outputPath("settings-sessions-desktop-restored.png") });
  let held;
  await page.route(`**/api/settings/sessions/${other}`, (route) => {
    held = route;
  });
  await modal
    .getByRole("button", { name: "Session options for Unknown device", exact: true })
    .click();
  const actions = page.getByRole("menu", {
    name: "Session actions for Unknown device",
    exact: true,
  });
  await expect(actions).toHaveCSS("width", "128px");
  await page.screenshot({ path: test.info().outputPath("settings-device-terminate-menu.png") });
  expect(held).toBeUndefined();
  await actions.getByRole("menuitem", { name: "Terminate", exact: true }).click();
  await expect.poll(() => !!held).toBe(true);
  await expect(modal.locator("tbody tr")).toHaveCount(2);
  await held.fulfill({ status: 503, json: unavailable });
  await expect(page.locator("[data-sonner-toast]")).toContainText(
    "Something went wrong. Please try again."
  );
  await expect(modal.locator("tbody tr")).toHaveCount(2);
  await page.route("**/api/settings/sessions", (route) =>
    route.request().method() === "DELETE"
      ? route.fulfill({ json: { status: "revoked", revoked_count: 1 } })
      : route.fulfill({ json: { sessions, has_more: false } })
  );
  await modal.getByRole("button", { name: "Log out other devices", exact: true }).click();
  await expect(modal.locator("tbody tr")).toHaveCount(1);
  await expect(modal.locator("tbody tr")).toContainText("Chrome (Windows)");
  await expect(page.locator('[data-sonner-toast][data-type="success"]')).toContainText(
    "Other devices logged out."
  );
  const notice = page.locator('[data-sonner-toast][data-type="success"]');
  await expect(notice.locator("[data-icon]")).toHaveCount(0);
  await expect(notice.getByRole("button")).toHaveCount(0);
  await expect(notice).toHaveCSS("font-size", "13px");
  expect((await notice.boundingBox()).height).toBeLessThanOrEqual(40);
  expect((await notice.boundingBox()).width).toBeLessThan(280);
  await page.screenshot({ path: test.info().outputPath("settings-minimal-toast-desktop.png") });
  await expect(modal.locator(".settings-content-pane > p[role='status']")).toHaveCount(0);
});

test("mobile password and device controls use the same confirmed operations", async ({ page }) => {
  await page.route("**/api/settings/password", (route) =>
    route.fulfill({ json: { status: "updated" } })
  );
  await page.route(`**/api/settings/sessions/${other}`, (route) =>
    route.fulfill({ json: { status: "revoked", revoked_count: 1 } })
  );
  const modal = await security(page, true);
  await modal.getByRole("button", { name: "Change password", exact: true }).click();
  await passwords(modal);
  await modal.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("[data-sonner-toast]")).toContainText("Password updated.");
  await modal.getByRole("button", { name: "Manage devices", exact: true }).click();
  await modal.getByRole("button", { name: "View details for Unknown device", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Unknown device", exact: true });
  await expect(
    sheet.locator(".settings-device-sheet-card").getByText("Not available", { exact: true })
  ).toHaveCount(3);
  await expect(sheet.getByText("Location", { exact: true })).toBeVisible();
  await expect(sheet.locator(".settings-device-sheet-divider")).toHaveCount(2);
  await page.screenshot({
    path: test.info().outputPath("settings-device-details-mobile-restored.png"),
  });
  await sheet.getByRole("button", { name: "Terminate Session", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(
    modal.getByRole("button", { name: "View details for Unknown device", exact: true })
  ).toHaveCount(0);
  await expect(
    modal.getByRole("button", { name: "View details for Chrome (Windows)", exact: true })
  ).toBeVisible();
  const notice = page.locator('[data-sonner-toast][data-type="success"]');
  await expect(notice).toContainText("Device logged out.");
  await expect(notice.locator("[data-icon]")).toHaveCount(0);
  await expect(notice.getByRole("button")).toHaveCount(0);
  expect((await notice.boundingBox()).height).toBeLessThanOrEqual(40);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("settings-devices-mobile.png") });
});

for (const mobile of [false, true])
  test(`feedback ${mobile ? "mobile" : "desktop"} requires saved acknowledgement and retries the same draft identity`, async ({
    page,
  }) => {
    const payloads = [];
    let held;
    await page.route("**/api/settings/feedback", (route) => {
      payloads.push(route.request().postDataJSON());
      held = route;
    });
    if (mobile) {
      const modal = await open(page, true);
      await modal.getByRole("button", { name: "Report a bug", exact: true }).click();
    } else {
      await page.route("**/api/v1/**", (route) => route.fulfill({ status: 404, json: {} }));
      await page.goto("/app", { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Account menu", exact: true }).click();
      await page.getByRole("menuitem", { name: "Learn more", exact: true }).hover();
      await page.getByRole("menuitem", { name: "Report a bug", exact: true }).click();
    }
    const report = page.getByRole("dialog", { name: "Report a bug", exact: true });
    await report.getByLabel("What happened?", { exact: true }).fill("Synthetic saved feedback");
    await report.getByRole("button", { name: "Submit report", exact: true }).click();
    await expect.poll(() => !!held).toBe(true);
    await expect(report.getByText("Report received!", { exact: true })).toHaveCount(0);
    await expect(
      report.getByRole("button", { name: "Close bug report dialog", exact: true })
    ).toBeDisabled();
    await held.fulfill({ status: 503, json: unavailable });
    await expect(report.getByRole("alert")).toHaveText("Something went wrong. Please try again.");
    await expect(report.getByLabel("What happened?", { exact: true })).toHaveValue(
      "Synthetic saved feedback"
    );
    held = null;
    await report.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => !!held).toBe(true);
    expect(payloads[0]).toEqual(payloads[1]);
    expect(Object.keys(payloads[1]).sort()).toEqual(["category", "description", "request_id"]);
    await held.fulfill({ json: { id: payloads[1].request_id, status: "received" } });
    await expect(report.getByRole("status")).toHaveText("Report received!");
    await report.getByRole("button", { name: "Done", exact: true }).click();
    await expect(report).not.toBeVisible();
  });

test("account switch discards password drafts and ignores an earlier account's completion", async ({
  page,
}) => {
  let held;
  await page.route("**/api/settings/password", (route) => {
    held = route;
  });
  const modal = await security(page);
  await modal.getByRole("button", { name: "Change password", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Change password", exact: true });
  await passwords(editor);
  await editor.getByRole("button", { name: "Update password", exact: true }).click();
  await expect.poll(() => !!held).toBe(true);
  await page.evaluate(() =>
    window.__changePreviewAccount({ id: "00000000-0000-4000-8000-000000000099" })
  );
  await expect(editor).not.toBeVisible();
  await held.fulfill({ json: { status: "updated" } });
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  await modal.getByRole("button", { name: "Security", exact: true }).click();
  await modal.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(editor.getByLabel("New password", { exact: true })).toHaveValue("");
  await expect(editor.getByText("Password updated.", { exact: true })).toHaveCount(0);
});

test("feedback survives close after failure, clears on account switch and ignores a late acknowledgement", async ({
  page,
}) => {
  const modal = await open(page, true);
  let held;
  await page.route("**/api/settings/feedback", (route) => {
    held = route;
  });
  const report = page.getByRole("dialog", { name: "Report a bug", exact: true });
  const trigger = modal.getByRole("button", { name: "Report a bug", exact: true });
  await trigger.click();
  await report.getByLabel("What happened?", { exact: true }).fill("Synthetic private draft");
  await report.getByRole("button", { name: "Submit report", exact: true }).click();
  await expect.poll(() => !!held).toBe(true);
  await held.fulfill({ status: 404, json: { detail: "No handler" } });
  await expect(report.getByRole("alert")).toHaveText("Something went wrong. Please try again.");
  await report.getByRole("button", { name: "Cancel", exact: true }).click();
  await trigger.click();
  await expect(report.getByLabel("What happened?", { exact: true })).toHaveValue(
    "Synthetic private draft"
  );
  held = null;
  await report.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => !!held).toBe(true);
  const saved = held.request().postDataJSON();
  await page.evaluate(() =>
    window.__changePreviewAccount({ id: "00000000-0000-4000-8000-000000000098" })
  );
  await expect(report).not.toBeVisible();
  await held.fulfill({ json: { id: saved.request_id, status: "received" } });
  await page.getByRole("button", { name: "Open settings", exact: true }).click();
  await trigger.click();
  await expect(report.getByLabel("What happened?", { exact: true })).toHaveValue("");
  await expect(report.getByText("Report received!", { exact: true })).toHaveCount(0);
});

test("device list failure has an explicit recovery without displaying sample devices", async ({
  page,
}) => {
  let unavailableNow = true;
  await open(page);
  await page.route("**/api/settings/sessions", (route) =>
    route.fulfill(
      unavailableNow ? { status: 503, json: unavailable } : { json: { sessions, has_more: false } }
    )
  );
  const modal = page.getByRole("dialog", { name: "Settings", exact: true });
  await modal.getByRole("button", { name: "Security", exact: true }).click();
  await expect(modal.getByRole("alert")).toHaveText("Something went wrong. Please try again.");
  await expect(modal.locator("tbody tr")).toHaveCount(0);
  unavailableNow = false;
  await modal.getByRole("button", { name: "Retry devices", exact: true }).click();
  await expect(modal.locator("tbody tr")).toHaveCount(2);
  await expect(modal.getByRole("alert")).toHaveCount(0);
});

test("device loading uses a spinner without visible loading prose", async ({ page }) => {
  const modal = await open(page);
  let held;
  await page.route("**/api/settings/sessions", (route) => {
    held = route;
  });
  await modal.getByRole("button", { name: "Security", exact: true }).click();
  const spinner = modal.getByRole("status", { name: "Loading devices", exact: true });
  await expect(spinner).toBeVisible();
  await expect(spinner.locator("svg")).toHaveCount(1);
  await expect(spinner).toHaveText("");
  await expect(modal.locator("table")).toHaveAttribute("aria-busy", "true");
  await expect.poll(() => !!held).toBe(true);
  await held.fulfill({ json: { sessions, has_more: false } });
  await expect(spinner).not.toBeVisible();
  await expect(modal.locator("tbody tr")).toHaveCount(2);
});

test("current-session menu logs out locally and failed logout shows a toast", async ({ page }) => {
  await page.addInitScript(() => {
    window.__previewSignOutFails = true;
  });
  const modal = await security(page);
  const trigger = modal.getByRole("button", {
    name: "Session options for Chrome (Windows)",
    exact: true,
  });
  await trigger.click();
  const menu = page.getByRole("menu", {
    name: "Session actions for Chrome (Windows)",
    exact: true,
  });
  await expect(menu.getByRole("menuitem")).toHaveText("Log out");
  await page.screenshot({ path: test.info().outputPath("settings-current-session-menu.png") });
  await menu.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page.locator("[data-sonner-toast]")).toContainText(
    "Couldn't log out. Please try again."
  );
  await expect(modal).toBeVisible();
  expect(await page.evaluate(() => window.__previewSignOutCalls)).toEqual(["local"]);
  await page.evaluate(() => {
    window.__previewSignOutFails = false;
  });
  await trigger.click();
  await menu.getByRole("menuitem", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => window.__previewSignOutCalls)).toEqual(["local", "local"]);
});
