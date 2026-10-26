const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
test.setTimeout(90000);
const pageImage = fs.readFileSync(path.join(__dirname, "fixtures/library-material.png"));
const documents = Array.from({ length: 58 }, (_, index) => ({
  id: `01900000-0000-7000-8000-${String(index + 1).padStart(12, "0")}`,
  title:
    index === 57
      ? "Late catalog clearance notes"
      : [
          "Autonomic pharmacology",
          "Drug absorption and distribution",
          "Cardiovascular pharmacology",
          "Pharmaceutical calculations",
          "Clinical interactions",
          "Dosage forms",
        ][index % 6] + (index > 5 ? ` ${index + 1}` : ""),
  course_code: index % 2 ? "PCT 402" : "PCL 401",
  course_title: index % 2 ? "Pharmaceutical Technology" : "Clinical Pharmacology",
  topic: null,
  lecturer_name: "Synthetic lecturer",
  page_count: 16,
  file_size_bytes: 245000,
  mime_type: "application/pdf",
  status: "active",
  embedding_status: "completed",
  target_levels: ["400"],
  academic_session: index % 2 ? "2024/2025" : "2025/2026",
  semester: index % 2 ? "second" : "first",
  created_at: "2026-10-20T12:00:00Z",
  updated_at: "2026-10-26T12:00:00Z",
  last_opened_at: index < 8 ? "2026-10-26T12:00:00Z" : null,
  last_page_read: index < 8 ? 3 : null,
}));
const courses = [
  { code: "PCL 401", title: "Clinical Pharmacology", document_count: 29 },
  { code: "PCT 402", title: "Pharmaceutical Technology", document_count: 29 },
];
async function setup(page, { empty = false, failure = false, staff = false } = {}) {
  const state = {
    empty,
    failure,
    requests: [],
    pdfFails: true,
    opened: [],
    thumbnails: 0,
    records: documents,
  };
  await page.addInitScript(
    ({ staff, preview }) => {
      localStorage.setItem("pansgpt-theme", "dark");
      window.__PREVIEW_ACCOUNT__ = {
        ...(staff ? { role: typeof staff === "string" ? staff : "university_admin" } : {}),
      };
      // No real tabs or storage/provider calls are made by synthetic browser journeys.
      window.open = () => null;
      window.__PREVIEW_DOCUMENTS__ = preview;
    },
    { staff, preview: documents.slice(0, 4) }
  );
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === "/api/v1/library/catalog") {
      state.requests.push(url.searchParams.toString());
      if (state.failure)
        return route.fulfill({ status: 503, json: { detail: "Synthetic unavailable" } });
      const p = url.searchParams;
      let items = state.empty
        ? []
        : state.records.filter(
            (item) =>
              (p.get("collection") !== "recent" || item.last_opened_at) &&
              (!p.get("course_code") || item.course_code === p.get("course_code")) &&
              (!p.get("academic_session") || item.academic_session === p.get("academic_session")) &&
              (!p.get("semester") || item.semester === p.get("semester")) &&
              (!p.get("q") ||
                `${item.title} ${item.course_code} ${item.course_title}`
                  .toLowerCase()
                  .includes(p.get("q").toLowerCase()))
          );
      if (p.get("sort") === "title")
        items = items.toSorted((a, b) => a.title.localeCompare(b.title));
      const limit = Number(p.get("limit")),
        offset = Number(p.get("offset"));
      return route.fulfill({
        json: {
          items: items.slice(offset, offset + limit),
          total: items.length,
          limit,
          offset,
          courses: state.empty ? [] : courses,
          academic_sessions: ["2025/2026", "2024/2025"],
        },
      });
    }
    if (url.pathname.endsWith("/thumbnail")) {
      state.thumbnails += 1;
      return route.fulfill({ contentType: "image/png", body: pageImage });
    }
    if (url.pathname.endsWith("/opened")) {
      const id = url.pathname.split("/").at(-2);
      state.opened.push(id);
      return route.fulfill({
        json: {
          document_id: id,
          last_opened_at: "2026-10-26T12:00:00Z",
          last_page_read: 3,
          total_pages: 16,
        },
      });
    }
    if (url.pathname.endsWith("/pdf-url"))
      return state.pdfFails
        ? route.fulfill({ status: 503, json: { detail: "Synthetic storage unavailable" } })
        : route.fulfill({
            json: {
              document_id: url.pathname.split("/").at(-2),
              presigned_url: "https://files.example.test/owned.pdf?synthetic-signature",
              expires_in_seconds: 900,
            },
          });
    return route.fulfill({ status: 404, json: { detail: "No synthetic route" } });
  });
  return state;
}

test("legacy library keeps course navigation, Home-sized document cards and real covers", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/app/library", { waitUntil: "load" });
  await expect(page.locator(".app-shell")).toHaveAttribute("data-collapsed", "true");
  await expect(page.getByRole("heading", { name: "Recent Documents", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Library navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: /All materials/i })).toHaveCount(0);
  const cards = page.locator(".library-materials-grid .dashboard-recent-card");
  await expect(cards).toHaveCount(8);
  await expect(cards.first().locator(".dashboard-recent-cover")).toHaveCSS("height", "88px");
  await expect(cards.first().locator("img")).toHaveAttribute("src", /^blob:/);
  await expect(page.getByRole("button", { name: "Upload material" })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("library-desktop-recent.png") });
  await cards.first().click();
  const details = page.getByRole("complementary", { name: "Document details" });
  await expect(details).toContainText("Clinical Pharmacology");
  await expect(details).toContainText("Saved position: page 3 of 16");
  await details.getByRole("button", { name: "Open PDF", exact: true }).click();
  await expect(details.getByRole("alert")).toContainText("couldn't open this PDF");
  state.pdfFails = false;
  await details.getByRole("button", { name: "Open PDF", exact: true }).click();
  await expect(details.getByRole("link", { name: "Open your PDF", exact: true })).toHaveAttribute(
    "href",
    /^https:\/\/files.example.test/
  );
  await page.screenshot({ path: test.info().outputPath("library-desktop-details.png") });
  expect(state.opened).toEqual([]);
  const fallback = details.getByRole("link", { name: "Open your PDF", exact: true });
  await fallback.evaluate((element) =>
    element.addEventListener("click", (event) => event.preventDefault(), { once: true })
  );
  await fallback.click();
  await expect.poll(() => state.opened.length).toBe(1);
  await details.getByRole("button", { name: "Close document details" }).click();
  await expect(cards.first()).toBeFocused();
});

test("Library reuses Home card dimensions, cover styling and persistent cached thumbnails", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/app?state=r2");
  const sidebar = page.getByRole("complementary", { name: "Workspace sidebar" });
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 975 });
    const home = page.locator(".dashboard-recent-grid .dashboard-recent-card").first();
    await expect(home.locator("img")).toHaveAttribute("src", /^blob:/);
    const metrics = (element) => {
      const cover = element.querySelector(".dashboard-recent-cover");
      const img = element.querySelector("img");
      return {
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
        cover: cover.getBoundingClientRect().height,
        fit: getComputedStyle(img).objectFit,
        position: getComputedStyle(img).objectPosition,
        radius: getComputedStyle(element).borderRadius,
        titleSize: getComputedStyle(element.querySelector("h3")).fontSize,
      };
    };
    const baseline = await home.evaluate(metrics);
    await expect
      .poll(() =>
        page.evaluate(async () =>
          (
            await Promise.all(
              (await caches.keys())
                .filter((name) => name.startsWith("pansgpt-document-thumbnails"))
                .map(async (name) => (await (await caches.open(name)).keys()).length)
            )
          ).reduce((sum, count) => sum + count, 0)
        )
      )
      .toBeGreaterThanOrEqual(4);
    await sidebar.getByRole("link", { name: "Library", exact: true }).click();
    const card = page.locator(".library-materials-grid .dashboard-recent-card").first();
    await expect(card.locator("img")).toHaveAttribute("src", /^blob:/);
    const actual = await card.evaluate(metrics);
    expect(Math.abs(actual.width - baseline.width)).toBeLessThan(1);
    expect(Math.abs(actual.height - baseline.height)).toBeLessThan(1);
    expect(Math.abs(actual.cover - baseline.cover)).toBeLessThan(0.1);
    expect({ ...actual, width: 0, height: 0, cover: 0 }).toEqual({
      ...baseline,
      width: 0,
      height: 0,
      cover: 0,
    });
    const toggle = page.getByRole("button", { name: "Expand sidebar", exact: true });
    expect((await toggle.boundingBox()).x).toBeLessThan((await sidebar.boundingBox()).width);
    await page.locator(".library-main").hover();
    await expect(toggle.locator(".t-icon-swap")).toHaveAttribute("data-state", "a");
    await sidebar.hover();
    await expect(toggle.locator(".t-icon-swap")).toHaveAttribute("data-state", "b");
    await toggle.focus();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(toggle.locator(".t-icon").first()).toHaveCSS("transition-duration", "0s");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator(".library-main").hover();
    await expect(toggle.locator(".t-icon-swap")).toHaveAttribute("data-state", "b");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Collapse sidebar", exact: true })).toBeFocused();
    await sidebar.getByRole("link", { name: "Home", exact: true }).click();
  }
  await sidebar.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page.locator(".library-materials-grid img")).toHaveCount(8);
  await expect
    .poll(() =>
      page.evaluate(async () =>
        (
          await Promise.all(
            (await caches.keys())
              .filter((name) => name.startsWith("pansgpt-document-thumbnails"))
              .map(async (name) => (await (await caches.open(name)).keys()).length)
          )
        ).reduce((sum, count) => sum + count, 0)
      )
    )
    .toBe(8);
  const loaded = state.thumbnails;
  await page.reload();
  await expect(page.locator(".library-materials-grid img")).toHaveCount(8);
  expect(state.thumbnails).toBe(loaded);
});

test("library searches the full catalog and paginates course materials with academic filters", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/app/library");
  await page
    .getByRole("region", { name: "Course navigation", exact: true })
    .getByRole("button", { name: "PCT 402", exact: false })
    .click();
  const docs = page.getByRole("list", { name: "Course documents" });
  await expect(docs.getByRole("button")).toHaveCount(24);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(docs.getByRole("button")).toHaveCount(5);
  expect(state.requests.some((value) => new URLSearchParams(value).get("offset") === "24")).toBe(
    true
  );
  await page.getByLabel("Search your library", { exact: true }).fill("Late catalog clearance");
  await expect(docs.getByRole("button")).toHaveCount(1);
  await expect(docs).toContainText("Late catalog clearance notes");
  expect(new URLSearchParams(state.requests.at(-1)).get("course_code")).toBeNull();
  await page.getByRole("button", { name: "Clear library search" }).click();
  await page.getByLabel("Academic session", { exact: true }).selectOption("2025/2026");
  await expect(
    page.getByRole("heading", { name: "No matching materials", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(docs.getByRole("button")).toHaveCount(24);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".library-materials-list")).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("library-desktop-list.png") });
});

test("mobile library preserves Recent/Courses, filters, focused details and theme layouts", async ({
  page,
}) => {
  await setup(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/library");
  const docs = page.getByRole("list", { name: "Course documents" });
  await expect(docs.getByRole("button")).toHaveCount(8);
  await expect(page.getByLabel("Search your library", { exact: true })).toHaveCSS(
    "font-size",
    "16px"
  );
  await expect
    .poll(() =>
      docs
        .locator(".dashboard-recent-cover img")
        .evaluateAll(
          (images) => images.filter((image) => image.complete && image.naturalWidth > 0).length
        )
    )
    .toBeGreaterThanOrEqual(4);
  await page.screenshot({ path: test.info().outputPath("library-mobile-recent.png") });
  await docs.getByRole("button").first().click();
  const details = page.getByRole("dialog", { name: "Document details", exact: true });
  await expect(details).toContainText("Autonomic pharmacology");
  await page.keyboard.press("Escape");
  await expect(docs.getByRole("button").first()).toBeFocused();
  await page
    .getByRole("navigation", { name: "Library sections", exact: true })
    .getByRole("button", { name: "Courses", exact: true })
    .click();
  await expect(
    page.getByRole("list", { name: "Courses", exact: true }).getByRole("button")
  ).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath("library-mobile-courses.png") });
  await page
    .getByRole("list", { name: "Courses", exact: true })
    .getByRole("button")
    .first()
    .click();
  await expect(page.getByRole("heading", { name: "PCL 401", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Academic filters", exact: true }).click();
  await page.getByLabel("Semester", { exact: true }).selectOption("second");
  await expect(
    page.getByRole("heading", { name: "No matching materials", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(docs.getByRole("button")).toHaveCount(24);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  for (const theme of ["dark", "light", "sepia"]) {
    await page.evaluate((value) => window.__setChatTestTheme(value), theme);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await page.setViewportSize({ width: 375, height: 500 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    expect(
      await page.evaluate(() => document.scrollingElement.scrollHeight <= innerHeight + 1)
    ).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`library-mobile-short-${theme}.png`) });
  }
});

test("library failures remain visible and retry can reach a genuine empty university library", async ({
  page,
}) => {
  const state = await setup(page, { failure: true });
  await page.goto("/app/library");
  await expect(
    page.getByRole("heading", { name: "We couldn't load your library", exact: true })
  ).toBeVisible();
  await expect(page.locator(".library-material")).toHaveCount(0);
  state.failure = false;
  state.empty = true;
  await page.getByRole("button", { name: "Retry library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Explore courses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your courses will appear here", exact: true })
  ).toBeVisible();
});

test("mobile Library follows the legacy header-to-footer flow with real date groups and a details sheet", async ({
  page,
}) => {
  const state = await setup(page);
  state.records = documents.slice(0, 6).map((item, index) => ({
    ...item,
    last_opened_at: ["2026-10-27T08:00:00Z", "2026-10-26T10:00:00Z", "2026-10-15T10:00:00Z"][
      Math.floor(index / 2)
    ],
  }));
  await page.clock.setFixedTime(new Date("2026-10-27T12:00:00+01:00"));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/library");
  const header = page.locator(".library-mobile-topbar");
  const search = page.getByLabel("Search your library", { exact: true });
  const tabs = page.getByRole("navigation", { name: "Library sections", exact: true });
  const actions = page.locator(".library-header");
  const results = page.locator(".library-results");
  const footer = page.locator(".shell-mobile-composer");
  const docs = page.getByRole("list", { name: "Course documents", exact: true });
  await expect(docs.getByRole("button")).toHaveCount(6);
  await expect(page.locator(".library-date-group")).toHaveText(["Today", "Yesterday", "Earlier"]);
  await expect(header.getByText("Library", { exact: true })).toBeVisible();
  await expect(page.locator(".shell-mobile-brand")).not.toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    const bounds = await Promise.all(
      [header, search, tabs, actions, results, footer].map((item) => item.boundingBox())
    );
    expect(bounds[0].y + bounds[0].height).toBeLessThanOrEqual(bounds[1].y + 1);
    expect(bounds[1].y + bounds[1].height).toBeLessThanOrEqual(bounds[2].y + 1);
    expect(bounds[2].y + bounds[2].height).toBeLessThanOrEqual(bounds[3].y + 1);
    expect(bounds[4].y + bounds[4].height).toBeLessThanOrEqual(bounds[5].y + 1);
    expect(
      await page.evaluate(
        () =>
          document.scrollingElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await expect(footer).toBeInViewport();
    if (width === 390) {
      await expect
        .poll(() =>
          docs
            .locator("img")
            .evaluateAll(
              (images) => images.filter((image) => image.complete && image.naturalWidth > 0).length
            )
        )
        .toBeGreaterThanOrEqual(2);
      await page.screenshot({ path: test.info().outputPath("mobile-library-complete-390.png") });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const lastDocument = docs.getByRole("button").last();
  await lastDocument.focus();
  await expect(lastDocument).toBeInViewport();
  const lastBox = await lastDocument.boundingBox();
  const footerBox = await footer.boundingBox();
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(footerBox.y + 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await results.evaluate((element) => {
    element.scrollTop = 0;
  });
  const nav = header.getByRole("button", { name: "Open navigation", exact: true });
  await nav.click();
  await expect(
    page.getByRole("dialog", { name: "Workspace navigation", exact: true })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeFocused();
  await nav.click();
  await page
    .getByRole("dialog", { name: "Workspace navigation", exact: true })
    .getByRole("button", { name: "Account menu", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Help", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Help", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(nav).toBeFocused();
  await docs.getByRole("button").first().click();
  const sheet = page.getByRole("dialog", { name: "Document details", exact: true });
  await expect(sheet).toHaveCSS("border-top-left-radius", "24px");
  const sheetBox = await sheet.boundingBox();
  expect(sheetBox.y).toBeGreaterThan(20);
  expect(Math.abs(sheetBox.y + sheetBox.height - 844)).toBeLessThan(1);
  await expect(sheet.getByRole("button", { name: "Open PDF", exact: true })).toBeInViewport();
  await expect(sheet.locator(".dashboard-document-thumbnail img")).toHaveAttribute("src", /^blob:/);
  await page.screenshot({ path: test.info().outputPath("mobile-library-document-sheet.png") });
  await page.keyboard.press("Escape");
  await expect(docs.getByRole("button").first()).toBeFocused();
  await tabs.getByRole("button", { name: "Courses", exact: true }).click();
  const courseCards = page.getByRole("list", { name: "Courses", exact: true });
  await expect(page.getByRole("group", { name: "Document layout", exact: true })).not.toBeVisible();
  await expect(courseCards.getByRole("button")).toHaveCount(2);
  const a = await courseCards.getByRole("button").first().boundingBox();
  const b = await courseCards.getByRole("button").nth(1).boundingBox();
  expect(Math.abs(a.y - b.y)).toBeLessThan(1);
  await page.screenshot({ path: test.info().outputPath("mobile-library-course-folders.png") });
  await courseCards.getByRole("button").first().click();
  await page.getByRole("button", { name: "Academic filters", exact: true }).click();
  await page.getByLabel("Semester", { exact: true }).selectOption("first");
  await expect(page.getByRole("button", { name: "Academic filters", exact: true })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  await expect(
    page.getByRole("button", { name: "Clear semester filter", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear semester filter", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Clear semester filter", exact: true })
  ).toHaveCount(0);
});

for (const role of ["university_admin", "lecturer"]) {
  test(`library ${role} upload follows typed initialization, private PUT and confirmation`, async ({
    page,
  }) => {
    await setup(page, { staff: role });
    const calls = [];
    const id = "01900000-0000-7000-8000-999999999999";
    await page.route("**/api/v1/library/upload", async (route) => {
      calls.push({ stage: "initialize", body: route.request().postDataJSON() });
      return route.fulfill({
        status: 201,
        json: {
          document_id: id,
          storage_key: "synthetic/source.pdf",
          presigned_upload_url: "https://files.example.test/synthetic-upload",
          expires_in_seconds: 900,
        },
      });
    });
    await page.route("https://files.example.test/synthetic-upload", async (route) => {
      expect(route.request().method()).toBe("PUT");
      expect(route.request().headers().authorization).toBeUndefined();
      calls.push({ stage: "transfer" });
      return route.fulfill({ status: 200, body: "" });
    });
    await page.route(`**/api/v1/library/${id}/confirm-upload`, async (route) => {
      calls.push({ stage: "confirm" });
      return route.fulfill({
        json: {
          document_id: id,
          mode: role === "lecturer" ? "awaiting_approval" : "queued",
          message: "Synthetic confirmation",
        },
      });
    });
    await page.goto("/app/library");
    await page.getByRole("button", { name: "Upload material", exact: true }).click();
    const dialog = page.getByRole("dialog", {
      name: role === "lecturer" ? "Submit course material" : "Upload course material",
      exact: true,
    });
    await dialog
      .getByLabel("PDF document", { exact: true })
      .setInputFiles(path.join(__dirname, "fixtures/library-material.pdf"));
    await dialog
      .getByRole("textbox", { name: /^Document title/ })
      .fill("Synthetic course material");
    await dialog.getByRole("textbox", { name: /^Course code/ }).fill("PCL 401");
    await dialog.getByRole("textbox", { name: /^Course title/ }).fill("Clinical Pharmacology");
    await dialog
      .getByRole("button", {
        name: role === "lecturer" ? "Submit for approval" : "Upload material",
        exact: true,
      })
      .click();
    await expect(dialog.getByRole("status")).toContainText(
      role === "lecturer" ? "submitted for university approval" : "Processing will continue"
    );
    expect(calls.map((call) => call.stage)).toEqual(["initialize", "transfer", "confirm"]);
    expect(calls[0].body).toEqual({
      title: "Synthetic course material",
      course_code: "PCL 401",
      course_title: "Clinical Pharmacology",
      target_levels: ["300"],
      file_name: "library-material.pdf",
      mime_type: "application/pdf",
      file_size_bytes: fs.statSync(path.join(__dirname, "fixtures/library-material.pdf")).size,
    });
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });
}

test("switching accounts clears selected library details and rejects an older catalog response", async ({
  page,
}) => {
  await setup(page);
  let delayed;
  let release;
  const barrier = new Promise((resolve) => {
    release = resolve;
  });
  let hold = false;
  let changed = false;
  await page.route("**/api/v1/library/catalog?*", async (route) => {
    if (hold) {
      hold = false;
      delayed = true;
      await barrier;
      await route
        .fulfill({
          json: {
            items: documents.slice(0, 1),
            total: 1,
            limit: 24,
            offset: 0,
            courses,
            academic_sessions: [],
          },
        })
        .catch(() => {});
      delayed = false;
      return;
    }
    if (changed)
      return route.fulfill({
        json: { items: [], total: 0, limit: 24, offset: 0, courses: [], academic_sessions: [] },
      });
    return route.fallback();
  });
  await page.goto("/app/library");
  await page.getByRole("list", { name: "Course documents" }).getByRole("button").first().click();
  await expect(page.getByRole("complementary", { name: "Document details" })).toBeVisible();
  hold = true;
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await expect.poll(() => delayed).toBe(true);
  changed = true;
  await page.evaluate(() =>
    window.__changePreviewAccount({
      id: "01900000-0000-7000-8000-888888888888",
      university_id: "01900000-0000-7000-8000-777777777777",
    })
  );
  await expect(
    page.getByRole("heading", { name: "Your next chapter starts here", exact: true })
  ).toBeVisible();
  release();
  await expect.poll(() => delayed).toBe(false);
  await expect(page.getByRole("complementary", { name: "Document details" })).toHaveCount(0);
  await expect(page.locator(".library-material")).toHaveCount(0);
  await expect(page.getByText("Autonomic pharmacology", { exact: true })).toHaveCount(0);
});
