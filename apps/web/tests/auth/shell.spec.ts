import { test, expect } from "@playwright/test";
import { emailLink, openProfile, accountMenu, openNavigation, startNewChat } from "./support";
test.skip(process.env.AUTH_E2E_LIVE !== "1", "Requires disposable Supabase, Mailpit and FastAPI.");

test("verified workspace navigation, profile, account themes, failures and mobile keyboard access", async ({
  page,
  request,
}) => {
  test.setTimeout(240000);
  const email = `shell-${Date.now()}@example.test`;
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/^Password\s*\*?$/).fill("Synthetic-Shell-86!");
  await page.getByLabel(/^Confirm password\s*\*?$/).fill("Synthetic-Shell-86!");
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.goto(await emailLink(request, email, "Confirm"));
  await page.getByLabel("First name").fill("Shell");
  await page.getByLabel("Last name").fill("Student");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("combobox", { name: "University", exact: true }).click();
  await page.getByRole("option", { name: /University of Jos/ }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "200 Level", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Complete profile" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(
    page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Shell$/ })
  ).toBeVisible();

  await expect(page.locator(".dashboard-recent-card")).toHaveCount(6);
  await expect(page.locator(".dashboard-recent-grid")).toHaveCSS("display", "grid");
  await expect(
    page.getByRole("heading", { name: "Recently opened documents", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learn", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Activities", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Notifications", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open profile", exact: true })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Study streak", exact: true })).toContainText(
    "Sample study time"
  );
  await page.locator(".study-activity-grid button:not(:disabled)").first().click();
  await expect(page.locator(".study-activity-detail")).toContainText("tasks completed");
  const sidebar = page.getByRole("complementary", { name: "Workspace sidebar" });
  await expect(sidebar.getByRole("heading", { name: "Recent chats Sample" })).toBeVisible();
  await expect(sidebar.getByText("Teamspaces", { exact: true })).toHaveCount(0);
  await expect(sidebar.getByText("Private", { exact: true })).toHaveCount(0);
  await expect(sidebar.getByText("PansGPT Workspace", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Message PansGPT", exact: true })).toHaveCount(0);
  const newChat = sidebar.getByRole("link", { name: "New chat", exact: true });
  await newChat.focus();
  await expect(newChat).toBeFocused();
  await expect(newChat).toHaveAttribute("href", "/app/chat");
  await page.locator(".dashboard-recent-card").first().click();
  await expect(page.getByRole("dialog", { name: "Pharmacology Notes", exact: true })).toContainText(
    "Sample content"
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".dashboard-recent-card").first()).toBeFocused();

  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "Expand sidebar" })).toBeVisible();
  expect(
    await page
      .locator(".shell-sidebar .p-app-nav-panel-top")
      .evaluate((element) => element.scrollHeight <= element.clientHeight)
  ).toBe(true);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await accountMenu(page);
  await page.getByRole("menuitem", { name: "Help", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Help", exact: true })).toContainText(
    "Find your conversations"
  );
  await page.keyboard.press("Escape");
  await openProfile(page);
  const profile = page.getByRole("dialog", { name: "Your profile", exact: true });
  await expect(profile.getByText("University of Jos", { exact: true })).toBeVisible();
  await expect(profile.getByText("200 Level", { exact: true })).toBeVisible();
  let failPreference = true;
  await page.route("**/rest/v1/user_preferences*", (route) => {
    if (route.request().method() === "POST" && failPreference)
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "Synthetic unavailable" }),
      });
    return route.continue();
  });
  await profile.getByLabel("Workspace theme").selectOption("dark");
  await expect(profile.getByRole("status")).toContainText("Account sync is unavailable");
  expect(await page.evaluate(() => localStorage.getItem("pansgpt-theme"))).toBe("dark");
  failPreference = false;
  const saved = page.waitForResponse(
    (response) =>
      response.url().includes("/rest/v1/user_preferences") && response.request().method() === "POST"
  );
  await profile.getByRole("button", { name: "Retry theme sync" }).click();
  expect((await saved).ok()).toBe(true);
  expect((await saved).request().postDataJSON()).toMatchObject({ theme: "oled_dark" });
  await expect(profile.getByRole("status")).toContainText("Your theme is saved");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Account menu", exact: true })).toBeFocused();
  // Prove the authenticated database preference wins over a stale device value.
  await page.evaluate(() => localStorage.setItem("pansgpt-theme", "light"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await openProfile(page);
  await expect(profile.getByLabel("Workspace theme")).toHaveValue("dark");
  for (const [value, name] of [
    ["dark", "Dark"],
    ["sepia", "Sepia"],
    ["light", "Light"],
  ] as const) {
    await profile.getByLabel("Workspace theme").selectOption(value);
    await expect(profile.getByRole("status")).toContainText("Your theme is saved");
    await expect(page.locator("html")).toHaveAttribute("data-theme", value);
    await page.keyboard.press("Escape");
    for (const width of [1764, 1440, 375]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/shell-home-${width}-${name}.png`,
        fullPage: true,
        animations: "disabled",
      });
      await page.goto("/app/chat");
      await expect(
        page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Shell$/ })
      ).toBeVisible();
      const consent = page.getByRole("checkbox", { name: /I understand that PansGPT/ });
      if (await consent.isVisible()) {
        await consent.check();
        await page.getByRole("button", { name: "I Understand & Agree" }).click();
      }
      if (width > 860) {
        await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
        await expect(page.locator(".study-chat-tool-card")).toHaveCount(4);
      } else await expect(page.locator(".study-chat-recent-card")).toHaveCount(4);
      await expect(page.locator(".study-chat-suggestions button")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Voice input", exact: true })).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Attach study material", exact: true })
      ).toBeEnabled();
      await expect(page.locator("html")).toHaveAttribute("data-theme", value);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
      ).toBe(true);
      await page.screenshot({
        path: `test-results/chat-welcome-${width}-${name}.png`,
        fullPage: true,
        animations: "disabled",
      });
      if (width === 1764 && value === "dark") {
        await page.getByRole("button", { name: "See all", exact: true }).click();
        await expect(page.locator(".study-chat-tool-card")).toHaveCount(8);
        await page.getByRole("button", { name: "Show less", exact: true }).click();
        await expect(page.locator(".study-chat-tool-card")).toHaveCount(4);
        await page
          .getByRole("button", {
            name: "Create a document Word documents and assignments",
            exact: true,
          })
          .click();
        await expect(page.getByLabel("Study question")).toHaveValue(
          "Create a downloadable Word document about: "
        );
        await expect(page.getByLabel("Study question")).toBeFocused();
      }
      await page.goto("/app");
      await expect(page.locator(".dashboard-recent-card")).toHaveCount(6);
    }
    await openProfile(page);
  }
  await page.screenshot({ path: "test-results/shell-profile-375.png", fullPage: true });
  await page.keyboard.press("Escape");

  // Create only a conversation record; inference remains disabled for this entire journey.
  const historyRequest = page.waitForRequest(
    (outgoing) =>
      outgoing.url().includes("/api/v1/ai/chat/sessions?") && outgoing.method() === "GET"
  );
  await page.reload();
  const listRequest = await historyRequest;
  const authorization = listRequest.headers()["authorization"];
  const apiRoot = new URL(listRequest.url()).origin;
  const created = await request.post(`${apiRoot}/api/v1/ai/chat/sessions`, {
    headers: { Authorization: authorization! },
    data: { title: "My saved revision chat" },
  });
  expect(created.ok()).toBe(true);
  const conversation: { id: string; user_id: string } = await created.json();
  await page.reload();
  await openNavigation(page);
  await page
    .getByRole("dialog", { name: "Workspace navigation", exact: true })
    .getByRole("link", { name: "My saved revision chat", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/app/chat\\?session=${conversation.id}$`));
  await expect(page.getByLabel("Study question")).toBeEnabled();
  let inferenceRequests = 0;
  page.on("request", (outgoing) => {
    if (outgoing.url().endsWith("/stream")) inferenceRequests += 1;
  });
  await page.goto("/app");
  await page.getByRole("textbox", { name: "Message PansGPT", exact: true }).click();
  const homeChat = page.getByRole("dialog", { name: "PansGPT chat", exact: true });
  await expect(homeChat).toBeVisible();
  await homeChat.getByLabel("Study question").fill("Keep this draft private");
  await homeChat.getByRole("button", { name: "Close chat", exact: true }).click();
  await page.getByRole("textbox", { name: "Message PansGPT", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByLabel("Study question")).toHaveValue("Keep this draft private");
  expect(inferenceRequests).toBe(0);
  expect(page.url()).not.toContain("Keep");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Keep this draft private"
  );
  const syntheticAnswer = [
    "Synthetic stream response.",
    "## Synthetic study outline",
    "| Item | Meaning |\n| --- | --- |\n| A | Sample |",
    "$$C_0 = \\frac{D}{V}$$",
    "```text\nsynthetic study example\n```",
  ].join("\n\n");
  const syntheticEvents = [
    ["thinking_chunk", { code: "creating_materials" }],
    ["tool_start", { call_id: "synthetic-tool", tool_name: "create_doc", arguments: {} }],
    ["tool_end", { call_id: "synthetic-tool", tool_name: "create_doc", status: "success" }],
    ["text_chunk", { token: syntheticAnswer }],
    ["done", { full_text: syntheticAnswer }],
  ]
    .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
    .join("");
  let fakeStreamError = false;
  await page.route("**/api/v1/ai/chat/sessions/*/stream", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: fakeStreamError
        ? 'event: error\ndata: {"error":"Synthetic provider unavailable"}\n\n'
        : syntheticEvents,
    })
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText("Synthetic stream response.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Synthetic study outline" })).toBeVisible();
  await expect(page.locator(".study-chat-markdown table")).toHaveCount(1);
  await expect(page.locator(".study-chat-markdown .katex")).toBeVisible();
  await expect(page.getByRole("button", { name: "Steps", exact: true })).toHaveCount(0);
  await expect(
    page.locator('.study-chat-message[data-role="assistant"]').getByRole("button", {
      name: "More message actions",
      exact: true,
    })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy code", exact: true })).toBeEnabled();
  await expect(
    page
      .locator('.study-chat-message[data-role="assistant"]')
      .getByRole("button", { name: "Copy message", exact: true })
  ).toBeEnabled();

  await expect(page.getByLabel("Study question")).toBeEnabled();
  await page.screenshot({
    path: "test-results/chat-conversation-375.png",
    fullPage: true,
    animations: "disabled",
  });
  await homeChat.getByRole("button", { name: "Close chat", exact: true }).click();
  await startNewChat(page);
  await expect(
    page.getByRole("heading", { name: /^Good (morning|afternoon|evening), Shell$/ })
  ).toBeVisible();
  await expect(page.getByLabel("Study question")).toHaveValue("");
  await expect(page.getByText("Synthetic stream response.", { exact: true })).toHaveCount(0);
  expect(inferenceRequests).toBe(1);
  fakeStreamError = true;
  await page.getByLabel("Study question").fill("Exercise a handled failure");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Synthetic provider unavailable"
  );
  await expect(page.getByText("No response was returned.", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Generating response...", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Study question")).toBeEnabled();
  await startNewChat(page);
  await expect(page.getByText("Synthetic provider unavailable", { exact: true })).toHaveCount(0);
  expect(inferenceRequests).toBe(2);
  // Hold creation until New chat aborts the old runtime. It must never dispatch inference afterwards.
  let releaseCreation: () => void = () => {};
  let creationStarted: () => void = () => {};
  let creationSettled: () => void = () => {};
  const started = new Promise<void>((resolve) => {
    creationStarted = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    creationSettled = resolve;
  });
  await page.route("**/api/v1/ai/chat/sessions", async (route) => {
    creationStarted();
    await new Promise<void>((resolve) => {
      releaseCreation = resolve;
    });
    await route
      .fulfill({ json: { id: conversation.id, user_id: conversation.user_id } })
      .catch(() => undefined);
    creationSettled();
  });
  await page.getByLabel("Study question").fill("Cancel before a session is ready");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await started;
  await startNewChat(page);
  releaseCreation();
  await settled;
  await expect(page.getByLabel("Study question")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Stop generating", exact: true })).toHaveCount(0);
  expect(inferenceRequests).toBe(2);
  await page.unroute("**/api/v1/ai/chat/sessions");
  await page.unroute("**/api/v1/ai/chat/sessions/*/stream");
  await page.goto("/app");

  await openNavigation(page);
  const mobile = page.getByRole("dialog", { name: "Workspace navigation", exact: true });
  await expect(mobile.getByRole("link", { name: "Home", exact: true })).toHaveAttribute(
    "aria-current",
    "page"
  );
  await page.screenshot({ path: "test-results/shell-navigation-375.png", fullPage: true });
  await mobile.getByRole("link", { name: "Notes", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/notes$/);
  await expect(mobile).not.toBeVisible();
  await expect(page.getByRole("heading", { name: "Make room for your ideas" })).toBeVisible();
  await expect(page.getByRole("main")).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Open chat for voice input", exact: true })
  ).toBeEnabled();
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search conversations", exact: true });
  await search.getByLabel("Search conversations", { exact: true }).fill("zzzz");
  await expect(search.getByRole("status")).toContainText("No matching conversations");
  await page.keyboard.press("Escape");
  await openNavigation(page);
  await mobile.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/library$/);
  await expect(page.getByRole("heading", { name: "Your library", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload material" })).toHaveCount(0);
  await page.route(
    "**/api/v1/library/documents",
    (route) => route.fulfill({ status: 503, body: "Synthetic unavailable" }),
    { times: 1 }
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect(page.getByRole("heading", { name: "We couldn't load your library" })).toBeVisible();
  await page.getByRole("button", { name: "Retry library" }).click();
  await expect(
    page.getByRole("heading", { name: "We couldn't load your library" })
  ).not.toBeVisible();
  await page.goto("/app/a-page-that-does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This page has moved out of reach" })
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to home", exact: true }).click();

  let libraryRequests = 0;
  page.on("request", (outgoing) => {
    if (outgoing.url().includes("/api/v1/library/documents")) libraryRequests += 1;
  });
  let profileRequests = 0;
  await page.route("**/api/v1/auth/me", (route) => {
    profileRequests += 1;
    return route.fulfill({ status: 503, body: "Synthetic profile failure" });
  });
  await page.goto("/app/library");
  await expect(
    page.getByRole("heading", { name: "Your study service is temporarily unavailable" })
  ).toBeVisible();
  expect(libraryRequests).toBe(0);
  expect(profileRequests).toBe(1);
  await page.unroute("**/api/v1/auth/me");
  await page.getByRole("button", { name: "Retry profile verification" }).click();
  await expect(page.getByRole("heading", { name: "Your library", exact: true })).toBeVisible();
  await openProfile(page);
  await profile.getByRole("button", { name: "Sign Out", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/app/notes");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fnotes/);
});
