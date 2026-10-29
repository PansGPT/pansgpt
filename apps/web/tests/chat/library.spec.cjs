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
  const details = page.getByRole("complementary", { name: "File information" });
  await expect(details).toContainText("PCL 401");
  await expect(details).toContainText("3 / 16 pages");
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
  const details = page.getByRole("dialog", { name: "File information", exact: true });
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
  await expect(page.locator(".library-mobile-course-code")).toBeVisible();
  await expect(page.locator(".library-mobile-course-title")).toHaveText("Clinical Pharmacology");
  await expect(page.locator(".library-header")).not.toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Library sections", exact: true })
  ).not.toBeVisible();
  await page.screenshot({ path: test.info().outputPath("library-mobile-course-header.png") });
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/library");
  await expect(
    page.getByRole("heading", { name: "We couldn't load your library", exact: true })
  ).toBeVisible();
  await expect(page.locator(".library-material")).toHaveCount(0);
  state.failure = false;
  state.empty = true;
  await page.getByRole("button", { name: "Retry library", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No recent documents", exact: true })
  ).toBeVisible();
  await expect(page.locator(".library-recent-empty > svg")).toHaveCount(0);
  await expect(page.locator(".library-recent-empty")).toContainText(
    "Documents you open will appear here."
  );
  await expect(page.locator(".library-recent-empty")).toHaveCSS("border-top-width", "0px");
  await page.screenshot({ path: test.info().outputPath("mobile-library-empty-recent.png") });
  await page.getByRole("button", { name: "Browse courses", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your courses will appear here", exact: true })
  ).toBeVisible();
});

test("mobile Library keeps tab actions, a matching course grid and Home navigation", async ({
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
  const actions = page.locator(".library-mobile-browse-actions");
  const panel = page.locator(".library-content-panel");
  const results = page.locator(".library-results");
  await expect(page.locator(".shell-mobile-composer")).toHaveCount(0);
  const docs = page.getByRole("list", { name: "Course documents", exact: true });
  await expect(docs.getByRole("button")).toHaveCount(6);
  await expect(page.locator(".library-date-group")).toHaveText(["Today", "Yesterday", "Earlier"]);
  await expect(header.getByText("Library", { exact: true })).toBeVisible();
  await expect(page.locator(".shell-mobile-brand")).not.toBeVisible();
  await expect(panel).toHaveCSS("border-top-left-radius", "28px");
  await expect(panel).toHaveCSS("border-top-right-radius", "28px");
  await expect(panel.locator(".library-mobile-tabs")).toBeVisible();
  await expect(panel.locator(".library-results")).toBeVisible();
  await expect(page.getByRole("button", { name: "Grid view", exact: true })).not.toBeVisible();
  await expect(page.getByRole("button", { name: "List view", exact: true })).toBeVisible();
  for (const [width, height] of [
    [390, 844],
    [320, 568],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    const bounds = await Promise.all(
      [header, search, tabs, actions, results].map((item) => item.boundingBox())
    );
    expect(bounds[0].y + bounds[0].height).toBeLessThanOrEqual(bounds[1].y + 1);
    expect(bounds[1].y + bounds[1].height).toBeLessThanOrEqual(bounds[2].y + 1);
    expect(
      Math.abs(bounds[2].y + bounds[2].height / 2 - (bounds[3].y + bounds[3].height / 2))
    ).toBeLessThan(8);
    expect(bounds[2].x + bounds[2].width).toBeLessThanOrEqual(bounds[3].x);
    expect(bounds[4].y + bounds[4].height).toBeLessThanOrEqual(height);
    expect(
      await page.evaluate(
        () =>
          document.scrollingElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true);
    await expect(
      actions.getByRole("button", { name: "Academic filters", exact: true })
    ).toBeInViewport();
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
  expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(845); // Allow subpixel scroll rounding.
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await results.evaluate((element) => {
    element.scrollTop = 0;
  });
  await docs.getByRole("button").first().click();
  const sheet = page.getByRole("dialog", { name: "File information", exact: true });
  await expect(sheet).toHaveCSS("border-top-left-radius", "24px");
  const sheetBox = await sheet.boundingBox();
  expect(sheetBox.y).toBeGreaterThan(20);
  expect(Math.abs(sheetBox.y + sheetBox.height - 844)).toBeLessThan(1);
  await expect(sheet.getByRole("button", { name: "Open PDF", exact: true })).toBeInViewport();
  await expect(sheet.locator(".dashboard-document-thumbnail img")).toHaveAttribute("src", /^blob:/);
  await page.screenshot({ path: test.info().outputPath("mobile-library-document-sheet.png") });
  await page.keyboard.press("Escape");
  await expect(docs.getByRole("button").first()).toBeFocused();
  let releaseCourses;
  const courseResponse = new Promise((resolve) => {
    releaseCourses = resolve;
  });
  let holdCourses = true;
  await page.route("**/api/v1/library/catalog?*", async (route) => {
    if (holdCourses && new URL(route.request().url()).searchParams.get("collection") === "all") {
      holdCourses = false;
      await courseResponse;
    }
    await route.fallback();
  });
  await tabs.getByRole("button", { name: "Courses", exact: true }).click();
  const loading = page.getByLabel("Loading library", { exact: true });
  await expect(loading).toBeVisible();
  const skeleton = await loading.locator(".library-card-skeleton").first().boundingBox();
  await page.screenshot({ path: test.info().outputPath("mobile-library-course-skeleton.png") });
  releaseCourses();
  const courseCards = page.getByRole("list", { name: "Courses", exact: true });
  await expect(page.getByRole("group", { name: "Document layout", exact: true })).not.toBeVisible();
  await expect(courseCards.getByRole("button")).toHaveCount(2);
  const a = await courseCards.getByRole("button").first().boundingBox();
  const b = await courseCards.getByRole("button").nth(1).boundingBox();
  expect(Math.abs(a.y - b.y)).toBeLessThan(1);
  expect(a.x + a.width).toBeLessThan(b.x);
  expect(a.width).toBeGreaterThan(150);
  expect(a.height).toBeGreaterThanOrEqual(190);
  expect(Math.abs(a.width - skeleton.width)).toBeLessThan(1);
  expect(Math.abs(a.height - skeleton.height)).toBeLessThan(1);

  expect(Math.abs(a.width - b.width)).toBeLessThan(1);
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
  await header.getByRole("button", { name: "Back to Home", exact: true }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByLabel("Message PansGPT", { exact: true })).toBeVisible();
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
  await expect(page.getByRole("complementary", { name: "File information" })).toBeVisible();
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
    page.getByRole("heading", { name: "No recent documents", exact: true })
  ).toBeVisible();
  release();
  await expect.poll(() => delayed).toBe(false);
  await expect(page.locator(".library-details-empty")).toBeVisible();
  await expect(page.locator(".library-file-preview")).toHaveCount(0);
  await expect(page.locator(".library-material")).toHaveCount(0);
  await expect(page.getByText("Autonomic pharmacology", { exact: true })).toHaveCount(0);
});

test("library URL selection survives reload and browser history", async ({ page }) => {
  await setup(page);
  await page.goto("/app/library?tab=courses");
  const folders = page.getByRole("list", { name: "Courses", exact: true });
  await expect(folders.getByRole("button")).toHaveCount(2);
  await folders.getByRole("button").first().click();
  await expect.poll(() => new URL(page.url()).searchParams.get("course")).toBe("PCL 401");
  await page.reload();
  await expect(page.getByRole("heading", { name: "PCL 401", exact: true })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Course documents" }).getByRole("button")
  ).toHaveCount(24);
  await expect(
    page.getByRole("button", { name: "Back to courses", exact: true })
  ).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Library collections", exact: true })
    .getByRole("button", { name: "Recent Documents", exact: true })
    .click();
  await expect.poll(() => new URL(page.url()).searchParams.get("tab")).toBe("recent");
  expect(new URL(page.url()).searchParams.has("course")).toBe(false);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recent Documents", exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "PCL 401", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page.getByRole("heading", { name: "Recent Documents", exact: true })).toBeVisible();
});

test("library refresh feedback, legacy file information and mobile pull gestures", async ({
  page,
}) => {
  await setup(page);
  let hold = false;
  let release;
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/library/catalog?")) requests++;
  });
  await page.route("**/api/v1/library/catalog?*", async (route) => {
    if (hold) {
      hold = false;
      await new Promise((resolve) => {
        release = resolve;
      });
    }
    await route.fallback();
  });
  await page.goto("/app/library?tab=courses&course=PCL+401");
  const docs = page.getByRole("list", { name: "Course documents", exact: true });
  await expect(docs.getByRole("button")).toHaveCount(24);
  const libraryNav = page.getByRole("complementary", { name: "Library navigation" });
  const navBox = await libraryNav.boundingBox();
  const titleBox = await libraryNav.locator(".library-panel-title").boundingBox();
  expect(Math.abs(navBox.x - titleBox.x)).toBeLessThan(1);
  expect(Math.abs(navBox.width - 1 - titleBox.width)).toBeLessThan(1);
  expect(titleBox.y - navBox.y).toBeLessThan(2);
  await docs.getByRole("button").first().click();
  const info = page.getByRole("complementary", { name: "File information", exact: true });
  const image = info.locator(".library-file-preview img");
  await expect(image).toHaveAttribute("src", /^blob:/);
  await expect(image).toHaveCSS("object-fit", "cover");
  await expect(info.getByRole("progressbar")).toHaveAttribute("value", "3");
  const open = info.getByRole("button", { name: "Open PDF", exact: true });
  const actionBefore = await open.boundingBox();
  await info.locator(".library-file-scroll").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const actionAfter = await open.boundingBox();
  expect(Math.abs(actionBefore.y - actionAfter.y)).toBeLessThan(1);
  await page.screenshot({ path: test.info().outputPath("library-file-information-desktop.png") });
  const refresh = page.getByRole("button", { name: "Refresh", exact: true });
  hold = true;
  await refresh.click();
  await expect(refresh).toHaveAttribute("aria-busy", "true");
  await expect(refresh.locator("svg")).toHaveCSS("animation-name", "library-refresh-spin");
  await expect(docs.getByRole("button")).toHaveCount(24);
  await expect.poll(() => typeof release).toBe("function");
  release();
  await expect(refresh).toHaveAttribute("aria-busy", "false");
  await expect(info).toBeVisible();
  await info.getByRole("button", { name: "Close document details", exact: true }).click();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(docs.locator("img")).toHaveCount(0);
  await expect(docs.locator(".library-list-file-icon")).toHaveCount(24);
  await page.screenshot({ path: test.info().outputPath("library-legacy-list-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Refresh", exact: true })).toHaveCount(0);
  await expect(docs.locator(".library-reading-ring").first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("library-legacy-list-mobile.png") });
  const results = page.locator(".library-results");
  const box = await results.boundingBox();
  const touch = await page.context().newCDPSession(page);
  async function pull(dy, cancelled = false) {
    const start = { x: box.x + 100, y: box.y + 80, id: 1 };
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    for (let step = 1; step <= 6; step++) {
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ ...start, y: start.y + (dy * step) / 6 }],
      });
      await page.evaluate(() => new Promise(requestAnimationFrame));
    }
    await touch.send("Input.dispatchTouchEvent", {
      type: cancelled ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
  }
  await results.evaluate((element) => {
    element.scrollTop = 0;
  });
  const before = requests;
  await pull(50);
  await expect(page.locator(".library-pull-refresh")).toHaveAttribute("data-active", "false");
  expect(requests).toBe(before);
  await pull(180, true);
  await expect(page.locator(".library-pull-refresh")).toHaveAttribute("data-active", "false");
  expect(requests).toBe(before);
  await results.evaluate((element) => {
    element.scrollTop = 180;
  });
  await pull(100);
  expect(requests).toBe(before);
  await results.evaluate((element) => {
    element.scrollTop = 0;
  });
  hold = true;
  release = undefined;
  await pull(180);
  await expect.poll(() => requests).toBe(before + 1);
  await expect(page.getByText("Refreshing library...", { exact: true })).toBeVisible();
  await expect.poll(() => typeof release).toBe("function");
  release();
  await expect(page.locator(".library-pull-refresh")).toHaveAttribute("data-active", "false");
  await expect(docs.getByRole("button")).toHaveCount(24);
  await touch.detach();
});

test("mobile navigation matches the Library back button during real touch presses", async ({
  page,
}) => {
  await setup(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/app/library");
  const back = page.getByRole("button", { name: "Back to Home", exact: true });
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  async function press(locator) {
    const box = await locator.boundingBox();
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }],
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await back.hover();
  await expect(back).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  const reference = await back.evaluate((element) => ({
    background: getComputedStyle(element).backgroundColor,
    tap: getComputedStyle(element).webkitTapHighlightColor,
  }));
  await page.screenshot({ path: test.info().outputPath("library-back-touch-feedback.png") });
  await back.click();
  await expect(page).toHaveURL(/\/app$/);
  const homeLibrary = page
    .getByRole("navigation", { name: "Study tools", exact: true })
    .getByRole("link", { name: "Library", exact: true });
  await press(homeLibrary);
  await expect(homeLibrary).toHaveCSS("background-color", reference.background);
  await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(homeLibrary).toHaveAttribute("data-pressed", "false");
  await page.goto("/app/chat");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  const navigation = page.getByRole("dialog", { name: "Workspace navigation", exact: true });
  const library = navigation.getByRole("link", { name: "Library", exact: true });
  const normal = await library.evaluate((element) => getComputedStyle(element).backgroundColor);
  await press(library);
  await expect(library).toHaveCSS("background-color", reference.background);
  await expect(library).toHaveCSS("-webkit-tap-highlight-color", reference.tap);
  expect(reference.background).not.toBe(normal);
  await page.screenshot({ path: test.info().outputPath("navigation-touch-feedback.png") });
  await touch.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  await expect(library).toHaveAttribute("data-pressed", "false");
  await expect(page).toHaveURL(/\/app\/chat$/);
  await press(library);
  await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page).toHaveURL(/\/app\/library$/);
  await touch.detach();
});
