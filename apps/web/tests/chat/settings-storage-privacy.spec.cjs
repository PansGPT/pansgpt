const { test, expect } = require("@playwright/test");
test.use({ actionTimeout: 15000 });

const sessionId1 = "01900000-0000-7000-8000-000000000001";
const sessionId2 = "01900000-0000-7000-8000-000000000002";
const activeSessions = [
  {
    id: sessionId1,
    user_id: "01900000-0000-7000-8000-000000000099",
    title: "Pharmacokinetics study notes",
    is_pinned: false,
    archived_at: null,
    document_id: null,
    created_at: "2026-11-15T10:00:00Z",
    updated_at: "2026-11-15T10:00:00Z",
    title_source: "manual",
    last_message_at: "2026-11-15T11:00:00Z",
  },
  {
    id: sessionId2,
    user_id: "01900000-0000-7000-8000-000000000099",
    title: "Drug interactions inquiry",
    is_pinned: false,
    archived_at: null,
    document_id: null,
    created_at: "2026-11-14T08:00:00Z",
    updated_at: "2026-11-14T08:00:00Z",
    title_source: "manual",
    last_message_at: "2026-11-14T09:00:00Z",
  },
];

const archivedSessions = [
  {
    id: "01900000-0000-7000-8000-000000000010",
    user_id: "01900000-0000-7000-8000-000000000099",
    title: "Archived cardiology chat",
    is_pinned: false,
    archived_at: "2026-11-10T12:00:00Z",
    document_id: null,
    created_at: "2026-11-09T10:00:00Z",
    updated_at: "2026-11-10T12:00:00Z",
  },
];

const deletedSessions = [
  {
    id: "01900000-0000-7000-8000-000000000020",
    user_id: "01900000-0000-7000-8000-000000000099",
    title: "Old pharmacology quiz review",
    is_pinned: false,
    archived_at: null,
    deleted_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    document_id: null,
    created_at: "2026-11-01T10:00:00Z",
    updated_at: "2026-11-10T10:00:00Z",
  },
];

const sampleUploads = [
  {
    id: "01900000-0000-7000-8000-000000000030",
    name: "lab-report-final.pdf",
    content_type: "application/pdf",
    size: 512000,
    created_at: "2026-11-12T14:00:00Z",
    session_id: sessionId1,
    in_use: true,
  },
  {
    id: "01900000-0000-7000-8000-000000000031",
    name: "draft-notes.png",
    content_type: "image/png",
    size: 128000,
    created_at: "2026-11-13T09:00:00Z",
    session_id: sessionId2,
    in_use: false,
  },
];

const sampleFeedback = [
  {
    id: "01900000-0000-7000-8000-000000000040",
    category: "bug",
    subject: "Feedback: bug",
    status: "open",
    created_at: "2026-11-14T15:30:00Z",
    updated_at: "2026-11-14T15:30:00Z",
    first_message: "The chemical drawer button sometimes misses clicks on mobile.",
  },
];

async function openSettings(page, mobile = false) {
  if (mobile) await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Route mock API calls
  await page.route(/\/api\/v1\//, (route) => {
    const url = route.request().url();
    if (url.includes("/api/v1/ai/chat/sessions") && url.includes("archived=false")) {
      return route.fulfill({ json: { sessions: activeSessions } });
    }
    if (url.includes("/api/v1/ai/chat/sessions") && url.includes("archived=true")) {
      return route.fulfill({ json: { sessions: archivedSessions } });
    }
    if (url.includes("/api/v1/ai/chat/trash")) {
      return route.fulfill({ json: { sessions: deletedSessions, next_offset: null } });
    }
    return route.fulfill({ status: 200, json: {} });
  });

  await page.route(/\/api\/settings\/uploads/, (route) =>
    route.fulfill({ json: { attachments: sampleUploads, next_offset: null } })
  );
  await page.route(/\/api\/settings\/feedback/, (route) =>
    route.fulfill({ json: { tickets: sampleFeedback, next_offset: null } })
  );

  await page.goto("/app", { waitUntil: "domcontentloaded" });
  if (mobile) {
    await page.getByRole("button", { name: "Open settings", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Account menu", exact: true }).click();
    await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  }
  return page.getByRole("dialog", { name: "Settings", exact: true });
}

test("Settings review: real browser cache measurement and removal preserve other accounts", async ({
  page,
}) => {
  const modal = await openSettings(page);
  await page.evaluate(async () => {
    const put = async (name, path, body, type) => {
      const cache = await caches.open(name);
      await cache.put(
        new URL(path, location.origin),
        new Response(body, {
          headers: {
            "content-type": type,
            "content-length": String(body.length),
            "x-pansgpt-stored-at": String(Date.now()),
          },
        })
      );
    };
    await put(
      "pansgpt-reader-pdfs-v1:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002",
      "/__private-reader-pdf/synthetic?revision=1",
      "%PDF-" + "x".repeat(2043),
      "application/pdf"
    );
    await put(
      "pansgpt-reader-pdfs-v1:other:other",
      "/__private-reader-pdf/other?revision=1",
      "%PDF-other",
      "application/pdf"
    );
    await put(
      "pansgpt-document-thumbnails-v1:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002",
      "/__private-document-thumbnail/synthetic?revision=1",
      "synthetic",
      "image/png"
    );
  });
  await modal.getByRole("button", { name: "Data & Storage", exact: true }).click();
  await expect(
    modal.getByRole("img", {
      name: /Storage breakdown: 2.0 KB downloaded documents, 9 B cached previews/,
    })
  ).toBeVisible();
  const row = modal.locator(".settings-row").filter({ hasText: "Downloaded documents" });
  await row.getByRole("button", { name: "Manage", exact: true }).click();
  const manage = page.getByRole("dialog", { name: "Saved documents", exact: true });
  await expect(manage.getByText("2.0 KB", { exact: false })).toBeVisible();
  // A same-origin second tab changes actual Cache Storage and emits the app's
  // durable notification. Keep the management dialog open throughout.
  const opened = page.waitForEvent("popup");
  await page.evaluate(() => window.open("about:blank"));
  const otherTab = await opened;
  const origin = new URL(page.url()).origin;
  await otherTab.evaluate(async (origin) => {
    const cache = await caches.open(
      "pansgpt-reader-pdfs-v1:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002"
    );
    await cache.put(
      new URL("/__private-reader-pdf/second?revision=1", origin),
      new Response("%PDF-" + "x".repeat(2043), {
        headers: {
          "content-type": "application/pdf",
          "content-length": "2048",
          "x-pansgpt-stored-at": String(Date.now()),
        },
      })
    );
    localStorage.setItem("pansgpt-cache-epoch:changed", crypto.randomUUID());
  }, origin);
  await expect(manage.locator(".settings-pdf-row")).toHaveCount(2);
  await otherTab.evaluate(async (origin) => {
    const cache = await caches.open(
      "pansgpt-reader-pdfs-v1:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002"
    );
    await cache.delete(new URL("/__private-reader-pdf/synthetic?revision=1", origin));
    localStorage.setItem("pansgpt-cache-epoch:changed", crypto.randomUUID());
  }, origin);
  await expect(manage.locator(".settings-pdf-row")).toHaveCount(1);
  await otherTab.close();
  await manage.getByRole("button", { name: "Remove saved copy", exact: true }).click();
  await expect(
    manage.getByText("No saved documents on this device.", { exact: true })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    modal.getByRole("img", {
      name: /Storage breakdown: 0 B downloaded documents, 9 B cached previews/,
    })
  ).toBeVisible();
  await modal.getByRole("button", { name: "Clear cache", exact: true }).click();
  await expect(
    modal.getByRole("img", {
      name: /Storage breakdown: 0 B downloaded documents, 0 B cached previews/,
    })
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await (await caches.open("pansgpt-reader-pdfs-v1:other:other")).keys()).length
    )
  ).toBe(1);
  await expect(modal.locator(".settings-storage-documents")).toHaveCSS("width", "0px");
});

test("Settings review: privacy uploads paginate without losing the first page", async ({
  page,
}) => {
  const modal = await openSettings(page);
  await page.route(/\/api\/settings\/uploads/, (route) => {
    const offset = Number(new URL(route.request().url()).searchParams.get("offset"));
    return route.fulfill({
      json: {
        attachments: [
          {
            ...sampleUploads[0],
            id: offset ? "01900000-0000-7000-8000-000000000090" : sampleUploads[0].id,
            name: offset ? "second-page.png" : "first-page.png",
          },
        ],
        next_offset: offset ? null : 50,
      },
    });
  });
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  await modal
    .locator(".settings-row")
    .filter({ hasText: "Uploaded files" })
    .getByRole("button", { name: "Manage", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Uploaded files", exact: true });
  await expect(dialog.getByText("first-page.png", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Load more", exact: true }).click();
  await expect(dialog.getByText("second-page.png", { exact: true })).toBeVisible();
  await expect(dialog.getByText("first-page.png", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Load more", exact: true })).toHaveCount(0);
});

test("Settings review: account changes discard a delayed private list", async ({ page }) => {
  const modal = await openSettings(page);
  let release,
    started = false,
    requests = 0;
  const held = new Promise((resolve) => {
    release = resolve;
  });
  await page.route(/\/api\/settings\/uploads/, async (route) => {
    const first = requests++ === 0;
    if (first) {
      started = true;
      await held;
    }
    await route
      .fulfill({
        json: {
          attachments: [
            { ...sampleUploads[0], name: first ? "old-account-private.pdf" : "new-account.pdf" },
          ],
          next_offset: null,
        },
      })
      .catch(() => {});
  });
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  await modal
    .locator(".settings-row")
    .filter({ hasText: "Uploaded files" })
    .getByRole("button", { name: "Manage", exact: true })
    .click();
  await expect.poll(() => started).toBe(true);
  await page.evaluate(() =>
    globalThis.__changePreviewAccount({ id: "00000000-0000-4000-8000-000000000099" })
  );
  await expect(page.getByRole("dialog", { name: "Uploaded files", exact: true })).toHaveCount(0);
  release();
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  await page.getByRole("menuitem", { name: "Settings", exact: true }).click();
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  await modal
    .locator(".settings-row")
    .filter({ hasText: "Uploaded files" })
    .getByRole("button", { name: "Manage", exact: true })
    .click();
  await expect(page.getByText("new-account.pdf", { exact: true })).toBeVisible();
  await expect(page.getByText("old-account-private.pdf", { exact: true })).toHaveCount(0);
});

test("Settings review: partial bulk deletion retries only the conversations that failed", async ({
  page,
}) => {
  const modal = await openSettings(page);
  const attempts = new Map();
  await page.route("**/api/v1/ai/chat/sessions/*", async (route) => {
    const id = new URL(route.request().url()).pathname.split("/").at(-1);
    if (route.request().method() !== "DELETE") return route.fallback();
    attempts.set(id, (attempts.get(id) ?? 0) + 1);
    if (id === sessionId2 && attempts.get(id) === 1)
      return route.fulfill({ status: 503, json: { detail: "Synthetic outage" } });
    return route.fulfill({ status: 204, body: "" });
  });
  await modal.getByRole("button", { name: "Data & Storage", exact: true }).click();
  await modal.getByRole("button", { name: "Delete history", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Delete conversation history?", exact: true });
  await dialog.getByRole("button", { name: "Delete 2 chats", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Could not delete 1 conversation");
  await expect(dialog.getByText(activeSessions[0].title, { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Delete 1 chat", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(attempts.get(sessionId1)).toBe(1);
  expect(attempts.get(sessionId2)).toBe(2);
});

test("mobile privacy details use pages with working Back and Escape navigation", async ({
  page,
}) => {
  const modal = await openSettings(page, true);
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  for (const [label, title, back] of [
    ["How we protect your data", "How we protect your data", "page"],
    ["How we use your data", "How we use your data", "escape"],
    ["Privacy policy", "Privacy policy summary", "page"],
  ]) {
    await modal.locator(`[data-settings-label="${label}"]`).click();
    const view = modal.getByRole("region", { name: title, exact: true });
    await expect(view).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect((await view.boundingBox()).width).toBeGreaterThan(330);
    if (back === "escape") await page.keyboard.press("Escape");
    else await view.getByRole("button", { name: "Back", exact: true }).click();
    await expect(modal.locator('[data-settings-label="How we protect your data"]')).toBeVisible();
  }
  for (const [label, button, title] of [
    ["Uploaded files", "Manage", "Uploaded files"],
    ["Your feedback", "Manage", "Your feedback history"],
    ["Archived chats", "View archived", "Archived conversations"],
    ["Deleted chats", "View deleted", "Deleted conversations"],
  ]) {
    await modal
      .locator(`.settings-row[data-settings-label="${label}"]`)
      .getByRole("button", { name: button, exact: true })
      .click();
    const view = modal.getByRole("region", { name: title, exact: true });
    await expect(view).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(view.locator(".settings-confirm-overlay")).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath(`mobile-${title.replaceAll(" ", "-")}.png`),
    });
    await view.getByRole("button", { name: "Back", exact: true }).click();
    await expect(modal.locator('[data-settings-label="How we protect your data"]')).toBeVisible();
  }
});

for (const [slowAuth, noUniversity] of [
  [false, false],
  [true, false],
  [false, true],
])
  test(
    noUniversity
      ? "verified removal of university access clears saved material copies"
      : `two saved PDFs including 7.8 MB survive ${slowAuth ? "a slow auth startup" : "transient profile failure"}`,
    async ({ page }) => {
      let unavailable = !slowAuth && !noUniversity;
      if (slowAuth) await page.clock.install();
      const owner = "00000000-0000-4000-8000-000000000001";
      const university = "00000000-0000-4000-8000-000000000002";
      await page.route("**/api/v1/auth/me", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return unavailable
          ? route.fulfill({
              status: 503,
              headers: { "Retry-After": "0" },
              json: { detail: "Synthetic profile outage" },
            })
          : route.fulfill({
              json: {
                id: owner,
                email: "synthetic@example.test",
                role: "student",
                roles: ["student"],
                university_id: noUniversity ? null : university,
                first_name: "Synthetic",
                last_name: "Student",
                current_level: "200",
                terms_accepted_at: "2026-11-16T00:00:00Z",
                is_onboarded: true,
                client_type: "web",
                dev_bypass: false,
              },
            });
      });
      await page.goto(`/?auth_cache_recovery=1${slowAuth ? "&slow_auth=1" : ""}`);
      if (noUniversity) {
        await expect(
          page.getByRole("heading", { name: "Synthetic profile verified", exact: true })
        ).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              async ({ owner, university }) =>
                (await (await caches.open(`pansgpt-reader-pdfs-v1:${owner}:${university}`)).keys())
                  .length,
              { owner, university }
            )
          )
          .toBe(0);
        return;
      }
      if (slowAuth) {
        await expect(
          page.getByRole("heading", { name: "Checking synthetic profile", exact: true })
        ).toBeVisible();
        await page.clock.pauseAt(new Date(Date.now() + 500));
        await page.clock.runFor(2100);
        await expect(
          page.getByRole("heading", { name: "Synthetic signed out", exact: true })
        ).toBeVisible();
        await page.evaluate(() => globalThis.__completeSyntheticAuth());
      } else {
        await expect(
          page.getByRole("heading", { name: "Synthetic profile unavailable", exact: true })
        ).toBeVisible();
        unavailable = false;
        await page.getByRole("button", { name: "Retry synthetic profile", exact: true }).click();
      }
      await expect(
        page.getByRole("heading", { name: "Synthetic profile verified", exact: true })
      ).toBeVisible();
      expect(
        await page.evaluate(
          async ({ owner, university }) =>
            (await (await caches.open(`pansgpt-reader-pdfs-v1:${owner}:${university}`)).keys())
              .length,
          { owner, university }
        )
      ).toBe(2);
      if (slowAuth) {
        await page.getByRole("button", { name: "Sign out synthetic session", exact: true }).click();
        await expect(
          page.getByRole("heading", { name: "Synthetic signed out", exact: true })
        ).toBeVisible();
        expect(
          await page.evaluate(
            async ({ owner, university }) =>
              (await (await caches.open(`pansgpt-reader-pdfs-v1:${owner}:${university}`)).keys())
                .length,
            { owner, university }
          )
        ).toBe(0);
        return;
      }
      // Verify the actual Settings measurement after recovering identity.
      const modal = await openSettings(page);
      await modal.getByRole("button", { name: "Data & Storage", exact: true }).click();
      await expect(
        modal.getByRole("img", { name: /Storage breakdown: 8.3 MB downloaded documents/ })
      ).toBeVisible();
      await expect(modal.getByText("2 files", { exact: true })).toBeVisible();
    }
  );

test("mobile saved copies and history review use the same Settings page navigation", async ({
  page,
}) => {
  const modal = await openSettings(page, true);
  await page.evaluate(async () => {
    const cache = await caches.open(
      "pansgpt-reader-pdfs-v1:00000000-0000-4000-8000-000000000001:00000000-0000-4000-8000-000000000002"
    );
    await cache.put(
      new URL("/__private-reader-pdf/synthetic-copy?revision=1", location.origin),
      new Response("%PDF-synthetic mobile copy", {
        headers: { "content-type": "application/pdf", "x-pansgpt-stored-at": String(Date.now()) },
      })
    );
  });
  await modal.getByRole("button", { name: "Data & Storage", exact: true }).click();
  await modal
    .locator('[data-settings-label="Downloaded documents"]')
    .getByRole("button", { name: "Manage", exact: true })
    .click();
  const copies = modal.getByRole("region", { name: "Saved documents", exact: true });
  await expect(copies).toBeVisible();
  await expect(
    copies.getByRole("button", { name: "Remove saved copy", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await copies.getByRole("button", { name: "Back", exact: true }).click();
  await modal.getByRole("button", { name: "Delete history", exact: true }).click();
  const review = modal.getByRole("region", { name: "Delete conversation history?", exact: true });
  await expect(review).toBeVisible();
  await expect(review.getByRole("button", { name: "Delete 2 chats", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modal.getByRole("button", { name: "Delete history", exact: true })).toBeVisible();
});

for (const mobile of [false, true]) {
  test(`owned upload previews and downloads work on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    const modal = await openSettings(page, mobile);
    const png = require("node:fs").readFileSync(
      require("node:path").join(__dirname, "fixtures/library-material.png")
    );
    let failPreview = true;
    await page.route("**/api/v1/ai/chat/sessions/*/attachments/*/preview?size=large", (route) =>
      failPreview
        ? route.fulfill({ status: 503, json: { detail: "Synthetic private error" } })
        : route.fulfill({ contentType: "image/png", body: png })
    );
    const data = Buffer.from("%PDF-synthetic owned download");
    await page.route("**/api/v1/ai/chat/sessions/*/attachments/*/download", (route) =>
      route.fulfill({ contentType: "application/octet-stream", body: data })
    );
    await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
    await modal
      .locator('[data-settings-label="Uploaded files"]')
      .getByRole("button", { name: "Manage", exact: true })
      .click();
    const uploads = page.getByRole(mobile ? "region" : "dialog", {
      name: "Uploaded files",
      exact: true,
    });
    const fileDownload = page.waitForEvent("download");
    await uploads
      .getByRole("button", { name: "Download lab-report-final.pdf", exact: true })
      .click();
    const saved = await fileDownload;
    expect(saved.suggestedFilename()).toBe("lab-report-final.pdf");
    expect(require("node:fs").readFileSync(await saved.path())).toEqual(data);
    await uploads.getByRole("button", { name: "Preview draft-notes.png", exact: true }).click();
    const preview = page.getByRole(mobile ? "region" : "dialog", {
      name: "Image preview",
      exact: true,
    });
    await expect(preview.getByRole("alert")).toContainText("Couldn't preview");
    failPreview = false;
    await preview.getByRole("button", { name: "Retry image preview", exact: true }).click();
    const image = preview.getByRole("img", { name: "draft-notes.png", exact: true });
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
    const url = await image.getAttribute("src");
    expect(url.startsWith("blob:")).toBe(true);
    await preview.getByRole("button", { name: mobile ? "Back" : "Close", exact: true }).click();
    await expect(uploads).toBeVisible();
    expect(
      await page.evaluate(
        (url) =>
          fetch(url)
            .then(() => "available")
            .catch(() => "revoked"),
        url
      )
    ).toBe("revoked");
    await page.screenshot({
      path: test.info().outputPath(`uploads-${mobile ? "mobile" : "desktop"}.png`),
    });
  });
}

test("archived Open preserves document context and closes Settings", async ({ page }) => {
  const modal = await openSettings(page);
  const doc = "01900000-0000-7000-8000-000000000001";
  await page.route("**/api/v1/ai/chat/sessions?*", (route) =>
    route.fulfill({
      json: {
        sessions: [
          ...archivedSessions,
          {
            ...archivedSessions[0],
            id: "01900000-0000-7000-8000-000000000080",
            document_id: doc,
            title: "Archived synthetic document chat",
          },
        ],
      },
    })
  );
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  await modal.getByRole("button", { name: "View archived", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Archived conversations", exact: true });
  const links = dialog.getByRole("link", { name: "Open", exact: true });
  await expect(links.nth(0)).toHaveAttribute("href", `/app/chat?session=${archivedSessions[0].id}`);
  await expect(links.nth(1)).toHaveAttribute(
    "href",
    `/app/library/${doc}/read?session=01900000-0000-7000-8000-000000000080`
  );
  await links.nth(1).click();
  await expect(modal).toHaveCount(0);
  expect(new URL(page.url()).searchParams.get("session")).toBe(
    "01900000-0000-7000-8000-000000000080"
  );
  expect(new URL(page.url()).pathname).toBe(`/app/library/${doc}/read`);
});

test("desktop Data & Storage renders measured layout, opens review-before-delete, and clears cache", async ({
  page,
}) => {
  const modal = await openSettings(page, false);
  await modal.getByRole("button", { name: "Data & Storage", exact: true }).click();

  // Overview and breakdown meter should be visible
  await expect(modal.getByRole("img", { name: /storage breakdown/i })).toBeVisible();
  await expect(modal.getByText("Storage on this device", { exact: true })).toBeVisible();
  await expect(modal.getByText("Downloaded documents", { exact: true })).toBeVisible();

  // Review before delete dialog
  const deleteBtn = modal.getByRole("button", { name: "Delete history", exact: true });
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();

  const deleteDialog = page.getByRole("dialog", { name: "Delete conversation history?" });
  await expect(deleteDialog).toBeVisible();
  await expect(
    deleteDialog.getByText("Deleted conversations can be restored within 30 days")
  ).toBeVisible();
  await expect(deleteDialog.getByText("Pharmacokinetics study notes")).toBeVisible();

  // Cancel deletion
  await deleteDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(deleteDialog).not.toBeVisible();

  // Clear cache button
  const clearBtn = modal.getByRole("button", { name: "Clear cache", exact: true });
  await expect(clearBtn).toBeVisible();
  await clearBtn.click();

  await page.screenshot({ path: "test-results/settings-storage-desktop.png" });
});

test("desktop Privacy & Data opens info dialogs, uploads, feedback, archived, and deleted chats", async ({
  page,
}) => {
  const modal = await openSettings(page, false);
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();

  // 1. Data protection info
  await modal.getByRole("button", { name: "How we protect your data" }).click();
  const infoDialog = page.getByRole("dialog", { name: "How we protect your data" });
  await expect(infoDialog).toBeVisible();
  await expect(infoDialog.getByText("Backend AI routing")).toBeVisible();
  await infoDialog.getByRole("button", { name: "Close" }).click();
  await expect(infoDialog).not.toBeVisible();

  // 2. Uploaded files
  const manageUploadsBtn = modal
    .locator(".settings-row")
    .filter({ hasText: "Uploaded files" })
    .getByRole("button", { name: "Manage" });
  await manageUploadsBtn.click();

  const uploadsDialog = page.getByRole("dialog", { name: "Uploaded files" });
  await expect(uploadsDialog).toBeVisible();
  await expect(uploadsDialog.getByText("lab-report-final.pdf")).toBeVisible();
  await expect(uploadsDialog.getByText("In use", { exact: true })).toBeVisible();
  await expect(uploadsDialog.getByText("draft-notes.png")).toBeVisible();
  await uploadsDialog.getByRole("button", { name: "Close" }).click();

  // 3. Feedback history
  const manageFeedbackBtn = modal
    .locator(".settings-row")
    .filter({ hasText: "Your feedback" })
    .getByRole("button", { name: "Manage" });
  await manageFeedbackBtn.click();

  const feedbackDialog = page.getByRole("dialog", { name: "Your feedback history" });
  await expect(feedbackDialog).toBeVisible();
  await expect(
    feedbackDialog.getByText("The chemical drawer button sometimes misses clicks on mobile.")
  ).toBeVisible();
  await feedbackDialog.getByRole("button", { name: "Close" }).click();

  // 4. Archived chats
  const viewArchivedBtn = modal.getByRole("button", { name: "View archived" });
  await viewArchivedBtn.click();

  const archivedDialog = page.getByRole("dialog", { name: "Archived conversations" });
  await expect(archivedDialog).toBeVisible();
  await expect(archivedDialog.getByText("Archived cardiology chat")).toBeVisible();
  await archivedDialog.getByRole("button", { name: "Close" }).click();

  // 5. Deleted chats
  const viewDeletedBtn = modal.getByRole("button", { name: "View deleted" });
  await viewDeletedBtn.click();

  const deletedDialog = page.getByRole("dialog", { name: "Deleted conversations" });
  await expect(deletedDialog).toBeVisible();
  await expect(deletedDialog.getByText("Old pharmacology quiz review")).toBeVisible();
  await expect(deletedDialog.getByText(/Expires in \d+ days/)).toBeVisible();
  await deletedDialog.getByRole("button", { name: "Close" }).click();

  await page.screenshot({ path: "test-results/settings-privacy-desktop.png" });
});

test("mobile settings shows usable storage and privacy rows and handles escape", async ({
  page,
}) => {
  const modal = await openSettings(page, true);

  // Navigate to Data & Storage on mobile
  await modal.getByRole("button", { name: "Data & Storage", exact: true }).click();
  await expect(modal.getByRole("img", { name: /storage breakdown/i })).toBeVisible();
  await page.screenshot({ path: "test-results/settings-storage-mobile.png" });

  await page.keyboard.press("Escape");

  // Navigate to Privacy & Data on mobile
  await modal.getByRole("button", { name: "Privacy & Data", exact: true }).click();
  await expect(modal.getByText("Data protection", { exact: true })).toBeVisible();
  await expect(modal.getByText("My feedback", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/settings-privacy-mobile.png" });
});
