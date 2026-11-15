const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const doc = "01900000-0000-7000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000001";
const chat = "01900000-0000-7000-8000-000000000005";
const pdf = fs.readFileSync(path.join(__dirname, "fixtures/synthetic-reader.pdf"));
const document = {
  id: doc,
  title: "Synthetic study material",
  course_code: "PCL 401",
  course_title: "Synthetic course",
  topic: "Receptors and responses",
  lecturer_name: "Synthetic lecturer",
  page_count: 24,
  file_size_bytes: pdf.length,
  mime_type: "application/pdf",
  status: "active",
  embedding_status: "completed",
  target_levels: ["400"],
  academic_session: "2026/2027",
  semester: "first",
  created_at: "2026-11-11T00:00:00Z",
  updated_at: "2026-11-11T00:00:00Z",
  last_opened_at: "2026-11-11T00:00:00Z",
  last_page_read: 3,
};
async function setup(page, options = {}) {
  const state = {
    highlights: [],
    page: 3,
    posts: [],
    progress: [],
    failPdf: false,
    failProgress: false,
    failHighlights: false,
    tree: [],
    blockStorage: false,
    failProxy: false,
    storageAuth: [],
    proxyAuth: [],
    sessions: [],
    trees: {},
    historyCalls: [],
    failHistory: false,
    creates: 0,
    uploads: [],
    readerStatus: 200,
    readerDelay: 0,
    readerCalls: 0,
    pdfLinks: 0,
    revision: document.updated_at,
    ...options,
  };
  await page.addInitScript(
    ({ owner, accepted, firstGuide }) => {
      localStorage.setItem("pansgpt-theme", "dark");
      if (accepted) localStorage.setItem(`pansgpt_disclaimer_accepted_${owner}`, "true");
      if (!firstGuide) localStorage.setItem(`pansgpt_reader_guide_seen_${owner}`, "true");
    },
    { owner, accepted: options.accepted !== false, firstGuide: options.firstGuide === true }
  );
  await page.route("https://files.example.test/**", (route) => {
    state.storageAuth.push(route.request().headers().authorization);
    return state.blockStorage
      ? route.abort("failed")
      : route.fulfill({
          body: pdf,
          contentType: "application/pdf",
          headers: { "Access-Control-Allow-Origin": "*" },
        });
  });
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const endpoint = url.pathname;
    if (endpoint.endsWith("/conversations")) {
      state.historyCalls.push(url.search);
      if (state.failHistory)
        return route.fulfill({ status: 503, json: { detail: "Synthetic history outage" } });
      const query = url.searchParams.get("q")?.toLowerCase();
      const sessions = query
        ? state.sessions.filter((item) => item.title.toLowerCase().includes(query))
        : state.sessions;
      return route.fulfill({ json: { sessions, next_offset: null } });
    }
    if (endpoint === `/api/v1/library/catalog/${doc}/pdf`) {
      state.proxyAuth.push(request.headers().authorization);
      return state.failProxy
        ? route.fulfill({ status: 503, json: { detail: "Storage unavailable" } })
        : route.fulfill({
            body: pdf,
            contentType: "application/pdf",
            headers: { "Cache-Control": "private, no-store" },
          });
    }
    if (endpoint.endsWith("/reader")) {
      state.readerCalls++;
      if (state.readerDelay) await new Promise((resolve) => setTimeout(resolve, state.readerDelay));
      if (state.readerStatus !== 200)
        return route.fulfill({
          status: state.readerStatus,
          json: { detail: "Synthetic document unavailable" },
        });
      return route.fulfill({
        json: {
          document: { ...document, updated_at: state.revision, last_page_read: state.page },
          chat_session_id: state.tree.length ? chat : null,
        },
      });
    }
    if (endpoint.endsWith("/pdf-url")) {
      state.pdfLinks++;
      return state.failPdf
        ? route.fulfill({ status: 503, json: { detail: "Synthetic storage failure" } })
        : route.fulfill({
            json: {
              document_id: doc,
              presigned_url: "https://files.example.test/synthetic-study.pdf",
              expires_in_seconds: 900,
            },
          });
    }
    if (endpoint.endsWith("/progress")) {
      state.progress.push(request.postDataJSON());
      if (state.failProgress)
        return route.fulfill({ status: 503, json: { detail: "Synthetic progress failure" } });
      state.page = request.postDataJSON().page;
      return route.fulfill({
        json: {
          document_id: doc,
          last_page_read: state.page,
          total_pages: 24,
          last_opened_at: "2026-11-11T00:00:00Z",
        },
      });
    }
    if (endpoint.endsWith("/highlights")) {
      if (state.failHighlights)
        return route.fulfill({ status: 503, json: { detail: "Synthetic highlights failure" } });
      if (request.method() === "POST") {
        const item = {
          ...request.postDataJSON(),
          id: "01900000-0000-7000-8000-000000000006",
          document_id: doc,
          created_at: "2026-11-11T00:00:00Z",
        };
        state.highlights.push(item);
        return route.fulfill({ status: 201, json: item });
      }
      return route.fulfill({ json: { items: state.highlights, next_offset: null } });
    }
    if (request.method() === "DELETE" && endpoint.includes("/highlights/")) {
      state.highlights = state.highlights.filter((item) => item.id !== endpoint.split("/").at(-1));
      return route.fulfill({ status: 204 });
    }
    if (endpoint.endsWith("/document-snip")) {
      state.posts.push({ endpoint: "snip", ...request.postDataJSON() });
      if (state.snipDelay) await new Promise((resolve) => setTimeout(resolve, state.snipDelay));
      state.snipResponseReady = true;
      if (state.failSnip)
        return route.fulfill({ status: 503, json: { detail: "Synthetic snip failure" } });
      return route.fulfill({
        status: 201,
        json: {
          id: "01900000-0000-7000-8000-000000000011",
          name: "Snippet.png",
          content_type: "image/png",
          size: 100,
        },
      });
    }
    if (endpoint.endsWith("/attachments") && request.method() === "POST") {
      const multipart = request.postDataBuffer().toString("latin1");
      const name = /filename="([^"]+)"/.exec(multipart)?.[1] || "Attachment";
      const content_type = /Content-Type: ([^\r\n]+)/i.exec(multipart)?.[1] || "text/plain";
      if (state.failUpload)
        return route.fulfill({
          status: 503,
          json: { detail: "Synthetic supporting upload unavailable" },
        });
      const uploaded = {
        id: `01900000-0000-7000-8000-${String(21 + state.uploads.length).padStart(12, "0")}`,
        name,
        content_type,
        size: 100,
      };
      state.uploads.push(uploaded);
      return route.fulfill({ status: 201, json: uploaded });
    }
    if (endpoint.includes("/attachments/") && endpoint.endsWith("/preview"))
      return route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==",
          "base64"
        ),
      });
    if (endpoint.endsWith("/sessions") && request.method() === "POST") {
      state.posts.push({ endpoint: "create", ...request.postDataJSON() });
      const id = state.creates++ ? "01900000-0000-7000-8000-000000000012" : chat;
      state.sessions.unshift({
        id,
        user_id: owner,
        document_id: doc,
        title: "New synthetic study chat",
        created_at: "2026-11-14T00:00:00Z",
        updated_at: "2026-11-14T00:00:00Z",
        last_message_at: "2026-11-14T00:00:00Z",
        title_source: "pending",
        is_pinned: false,
        archived_at: null,
      });
      return route.fulfill({ json: { id, user_id: owner, document_id: doc } });
    }
    if (endpoint.endsWith("/stream")) {
      const currentChat = endpoint.split("/").at(-2);
      const body = request.postDataJSON();
      state.posts.push({ endpoint: "stream", ...body });
      const user = "01900000-0000-7000-8000-000000000007",
        assistant = "01900000-0000-7000-8000-000000000008";
      const answer = "This synthetic passage describes a signal and a response.";
      const citations = [
        {
          document_id: doc,
          chunk_id: "01900000-0000-7000-8000-000000000010",
          title: document.title,
          source_type: "document",
          page_start: 3,
          page_end: 3,
          snippet: "A fictional signal reaches a fictional receptor.",
          bounding_box: {
            page: 3,
            bbox: [0.078, 0.2, 0.9, 0.28],
            rects: [[0.078, 0.2, 0.9, 0.23]],
          },
        },
      ];
      citations.push(
        ...state.uploads
          .filter((upload) => body.attachment_ids.includes(upload.id))
          .map((upload) => ({
            source_type: "attachment",
            attachment_id: upload.id,
            title: upload.name,
            snippet: "Synthetic uploaded evidence",
            page_start: null,
            page_end: null,
          }))
      );
      state.tree = [
        {
          id: user,
          role: "user",
          content: body.message,
          parent_message_id: null,
          is_active_branch: true,
          attachment_metadata: {
            attachments: state.uploads.filter((upload) => body.attachment_ids.includes(upload.id)),
          },
        },
        {
          id: assistant,
          role: "assistant",
          content: answer,
          parent_message_id: user,
          is_active_branch: true,
          citations,
        },
      ];
      state.trees[currentChat] = state.tree;
      const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      if (state.streamMode === "slow") await new Promise((resolve) => setTimeout(resolve, 14000));
      if (["failure", "tool_failure", "saved_disconnect"].includes(state.streamMode)) {
        const mode = state.streamMode;
        const prefix = frame("init", {
          session_id: currentChat,
          user_message_id: user,
          assistant_message_id: assistant,
        });
        if (mode !== "saved_disconnect") {
          state.tree = state.tree.slice(0, 1);
          state.trees[currentChat] = state.tree;
        }
        return route.fulfill({
          contentType: "text/event-stream",
          body:
            prefix +
            (mode === "tool_failure"
              ? frame("tool_start", {
                  call_id: "synthetic-tool",
                  tool_name: "create_pptx",
                  arguments: {},
                })
              : "") +
            frame("text_chunk", { token: "Synthetic partial answer." }) +
            (mode === "saved_disconnect"
              ? ""
              : frame("error", {
                  code: "TIMEOUT",
                  retryable: true,
                  error: "Synthetic internal provider timeout details",
                }) + frame("done", { full_text: "" })),
        });
      }
      return route.fulfill({
        contentType: "text/event-stream",
        body:
          frame("init", {
            session_id: currentChat,
            user_message_id: user,
            assistant_message_id: assistant,
          }) +
          frame("text_chunk", { token: answer }) +
          frame("citations", citations) +
          frame("done", { full_text: answer }),
      });
    }
    if (/\/sessions\/[^/]+$/.test(endpoint))
      return route.fulfill({
        json: {
          session: {
            id: endpoint.split("/").at(-1),
            user_id: owner,
            document_id: doc,
            title: "Synthetic document study",
          },
          messages: state.trees[endpoint.split("/").at(-1)] || state.tree,
        },
      });
    if (endpoint.endsWith("/metadata")) {
      const id = endpoint.split("/").at(-2);
      return route.fulfill({
        json: state.sessions.find((item) => item.id === id) || {
          id,
          user_id: owner,
          document_id: doc,
          title: "Synthetic document study",
          is_pinned: false,
          archived_at: null,
          title_source: "generated",
          created_at: "2026-11-14T00:00:00Z",
          updated_at: "2026-11-14T00:00:00Z",
          last_message_at: "2026-11-14T00:00:00Z",
        },
      });
    }
    return route.fulfill({ json: { sessions: [], results: [], next_offset: null } });
  });
  return state;
}
async function ready(page) {
  await page.goto(`/app/library/${doc}/read`);
  await expect(page.locator('[data-page-number="3"] canvas[data-rendered="true"]')).toBeVisible();
  const counter = page.getByRole("textbox", { name: "Page number", exact: true });
  if (await counter.isVisible()) await expect(counter).toHaveValue("3");
  else
    await expect(page.getByRole("button", { name: "Go to page", exact: true })).toContainText(
      "3/24"
    );
}
async function selectPassage(page) {
  const span = page
    .locator('[data-page-number="3"] .textLayer span')
    .filter({ hasText: "A fictional signal" })
    .first();
  await expect(span).toBeVisible();
  // Real selectable PDF text, never a fixture-generated alternate reader layer.
  await span.evaluate((node) => {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect(page.getByRole("toolbar", { name: "Selected passage actions" })).toBeVisible();
}

async function painted(page, number = 3) {
  const canvas = page.locator(`[data-page-number="${number}"] canvas[data-rendered="true"]`);
  await expect(canvas).toBeVisible();
  await expect
    .poll(async () =>
      canvas.evaluate((node) => {
        if (!node.width || !node.height) return false;
        const pixel = node.getContext("2d").getImageData(2, 2, 1, 1).data;
        return pixel[3] === 255 && pixel[0] + pixel[1] + pixel[2] > 700;
      })
    )
    .toBe(true);
}

async function swipeSheet(page, from, to, cancelled = false) {
  // CDP uses screen coordinates, so wait for the sheet's opening motion to settle.
  await expect
    .poll(async () => (await page.locator(".mobile-home-chat-sheet").boundingBox()).y)
    .toBe(14);
  const touch = await page.context().newCDPSession(page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y, id: 1 }],
  });
  for (let step = 1; step <= 6; step++) {
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / 6,
          y: from.y + ((to.y - from.y) * step) / 6,
          id: 1,
        },
      ],
    });
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await touch.send("Input.dispatchTouchEvent", {
    type: cancelled ? "touchCancel" : "touchEnd",
    touchPoints: [],
  });
  await touch.detach();
}

for (const mobile of [false, true]) {
  test(`study chat supporting uploads keep separate sources and survive reopening on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const state = await setup(page);
    await ready(page);
    await page.getByRole("button", { name: "Open study chat", exact: true }).click();
    await page.getByRole("button", { name: "Open uploads and study actions", exact: true }).click();
    await expect(page.getByRole("button", { name: "Snip from this PDF", exact: true })).toHaveCount(
      0
    );
    await expect(
      page.getByRole("button", { name: "Upload from library", exact: true })
    ).toHaveCount(0);
    if (mobile)
      await expect(page.getByRole("button", { name: "Photos", exact: true })).toBeVisible();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: /^(Upload a file|Files)$/ }).click();
    await (
      await chooser
    ).setFiles([
      {
        name: "supporting-note.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic supporting note"),
      },
      {
        name: "supporting-slides.pptx",
        mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        buffer: fs.readFileSync(path.join(__dirname, "fixtures/synthetic-study.pptx")),
      },
      { name: "supporting.pdf", mimeType: "application/pdf", buffer: pdf },
      {
        name: "supporting-diagram.png",
        mimeType: "image/png",
        buffer: fs.readFileSync(path.join(__dirname, "fixtures/synthetic-diagram.png")),
      },
    ]);
    const composer = page.getByRole("textbox", { name: "Ask about this document" });
    await composer.fill("Compare these supporting materials with the open PDF");
    await expect(
      page.getByRole("button", { name: "Preview supporting-diagram.png", exact: true })
    ).toBeVisible();
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(
      page.getByText("This synthetic passage describes a signal and a response.", { exact: true })
    ).toBeVisible();
    expect(state.uploads).toHaveLength(4);
    expect(state.posts.find((post) => post.endpoint === "stream").attachment_ids).toHaveLength(4);
    expect(state.posts.find((post) => post.endpoint === "stream").document_id).toBe(doc);
    await expect(
      page.locator(
        ".reader-chat-panel .study-chat-sources, .reader-study-sheet .study-chat-sources"
      )
    ).toHaveCount(0);
    expect(
      state.tree[1].citations.filter((item) => item.source_type === "attachment")
    ).toHaveLength(4);
    await page.screenshot({
      path: test
        .info()
        .outputPath(`reader-supporting-uploads-${mobile ? "mobile" : "desktop"}.png`),
    });
    await page.reload();
    await ready(page);
    await page.getByRole("button", { name: "Open study chat", exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: "Ask about this document", exact: true })
    ).toHaveValue("");
    await expect(
      page.getByText("Compare these supporting materials with the open PDF", { exact: true })
    ).toHaveCount(0);
    await page
      .getByRole("button", {
        name: mobile ? "Show chat history" : "Study chat history",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "New synthetic study chat", exact: true }).click();
    await expect(
      page.getByText("Compare these supporting materials with the open PDF", { exact: true })
    ).toBeVisible();
    if (mobile) {
      const sheet = page.getByRole("dialog", { name: "Document study chat", exact: true });
      await expect(
        sheet
          .locator(".mobile-home-chat-header")
          .getByRole("button", { name: "New chat", exact: true })
      ).toBeVisible();
      await sheet
        .locator(".mobile-home-chat-header")
        .getByRole("button", { name: "Conversation options", exact: true })
        .click();
      await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sheet).toBeVisible();
      await sheet.getByRole("button", { name: "Show chat history", exact: true }).click();
      await expect(sheet.locator(".mobile-home-history-item")).toHaveCount(1);
      await expect(
        sheet.getByRole("button", { name: "Options for New synthetic study chat", exact: true })
      ).toBeVisible();
      await page.screenshot({
        path: test.info().outputPath("reader-mobile-document-history.png"),
        animations: "disabled",
      });
      await sheet.getByRole("button", { name: "Search conversations", exact: true }).click();
      const search = sheet.getByRole("textbox", { name: "Search chat history", exact: true });
      await search.fill("No matching topic");
      await expect(sheet.getByText("No conversations found.", { exact: true })).toBeVisible();
      expect(state.historyCalls.some((url) => url.includes("q=No%20matching%20topic"))).toBe(true);
      await search.fill("New synthetic");
      await expect(sheet.locator(".mobile-home-history-item")).toHaveCount(1);
      await sheet.locator(".mobile-home-history-row").click();
      await expect(
        sheet.getByText("Compare these supporting materials with the open PDF", { exact: true })
      ).toBeVisible();
      await sheet.getByRole("button", { name: "New chat", exact: true }).click();
      await expect(sheet.locator(".mobile-home-chat-actions")).toHaveCount(0);
      await expect(
        sheet.getByRole("textbox", { name: "Ask about this document", exact: true })
      ).toHaveValue("");
    }
  });
}

test("reader fits the pane at 100 percent and night mode preserves image colors", async ({
  page,
}) => {
  await setup(page);
  await ready(page);
  await expect
    .poll(async () =>
      page
        .locator(".reader-scroll")
        .evaluate((node) =>
          Math.abs(
            node.clientWidth -
              node.querySelector('[data-page-number="3"]').getBoundingClientRect().width -
              16
          )
        )
    )
    .toBeLessThan(2);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(page.locator(".reader-study-header button:visible")).toHaveCount(2);
  await expect(page.getByRole("heading", { name: "Study chat", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Close study chat", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tablist", { name: "Study chat views", exact: true })).toHaveCount(0);
  await expect
    .poll(async () =>
      page
        .locator(".reader-scroll")
        .evaluate((node) =>
          Math.abs(
            node.clientWidth -
              node.querySelector('[data-page-number="3"]').getBoundingClientRect().width -
              16
          )
        )
    )
    .toBeLessThan(2);
  await painted(page);
  const canvas = page.locator('[data-page-number="3"] canvas');
  const before = await canvas.evaluate((node) =>
    Array.from(
      node
        .getContext("2d")
        .getImageData(
          Math.floor((node.width * 60) / 612),
          Math.floor((node.height * 245) / 792),
          1,
          1
        ).data
    )
  );
  expect(before[0]).toBeGreaterThan(before[1] + 100);
  await page.getByRole("combobox", { name: "Reading theme" }).selectOption("night");
  await expect(canvas).toHaveCSS("filter", "none");
  const after = await canvas.evaluate((node) =>
    Array.from(
      node
        .getContext("2d")
        .getImageData(
          Math.floor((node.width * 60) / 612),
          Math.floor((node.height * 245) / 792),
          1,
          1
        ).data
    )
  );
  expect(after).toEqual(before);
  await expect(page.getByRole("button", { name: "Show highlights", exact: true })).toHaveCount(0);
  await expect(page.getByText("Position saved", { exact: true })).toHaveCount(0);
  await expect(page.getByText("This document only", { exact: true })).toHaveCount(0);
  await expect(
    page.getByText("Verify clinical facts with your sources.", { exact: true })
  ).toHaveCount(0);
  await expect(
    page.locator(".reader-chat-panel .study-chat-composer.p-study-composer")
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Voice input", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("reader-fit-night-chat.png") });
});

test("mobile uses wide rounded pages and a docked Snip Page Chat bar", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await ready(page);
  const paper = page.locator('[data-page-number="3"]');
  await expect(paper).toHaveCSS("border-radius", "16px");
  await expect.poll(async () => (await paper.boundingBox()).width).toBeGreaterThan(370);
  await expect(page.locator(".reader-toolbar")).not.toContainText("Options");
  const bar = page.locator(".reader-toolbar");
  await expect(bar).toHaveCSS("border-top-left-radius", "16px");
  await expect(bar).toHaveCSS("border-bottom-left-radius", "0px");
  const barBounds = await bar.boundingBox();
  expect(barBounds.x).toBe(0);
  expect(barBounds.width).toBe(390);
  expect(barBounds.height).toBe(60);
  expect(barBounds.y + barBounds.height).toBe(844);
  await expect(page.locator(".reader-progress-track")).toBeHidden();
  await expect(page.locator(".reader-toolbar .reader-tool-start span")).toBeHidden();
  await expect(page.locator(".reader-mobile-chat-toggle span")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Go to page", exact: true }).locator("svg")
  ).toHaveCount(0);
  await expect(
    page.locator(".reader-header").getByRole("button", { name: "Open study chat", exact: true })
  ).toBeHidden();
  const help = page.getByRole("button", { name: "Open reader help", exact: true });
  await help.click();
  const guide = page.getByRole("dialog");
  await expect(guide.getByRole("heading", { name: "AI Chat", exact: true })).toBeVisible();
  await expect(
    guide.getByRole("img", { name: "AI Chat demonstration", exact: true })
  ).toHaveAttribute("src", "/reader-guide/ai-chat.gif");
  await expect.poll(() => guide.locator("img").evaluate((node) => node.naturalWidth)).toBe(634);
  await guide.getByRole("button", { name: "Next", exact: true }).click();
  await expect(guide.getByRole("heading", { name: "Snip Tool", exact: true })).toBeVisible();
  await expect(guide.locator("img")).toHaveAttribute("src", "/reader-guide/snip.gif");
  await page.screenshot({ path: test.info().outputPath("reader-mobile-legacy-help.png") });
  await guide.getByRole("button", { name: "Pause demonstration", exact: true }).click();
  await expect(guide.locator("img")).toHaveCount(0);
  await guide.getByRole("button", { name: "Play demonstration", exact: true }).click();
  await guide.getByRole("button", { name: "Next", exact: true }).click();
  await expect(guide.getByRole("heading", { name: "Text Highlights", exact: true })).toBeVisible();
  await expect(guide.locator("img")).toHaveAttribute("src", "/reader-guide/highlight.gif");
  await guide.getByRole("button", { name: "Get started", exact: true }).click();
  await expect(help).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await help.click();
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Play demonstration", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("dialog").locator("img")).toHaveCount(0);
  await page.getByRole("button", { name: "Close study mode guide", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("button", { name: "Go to page", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("combobox")).toHaveCount(0);
  await expect(page.getByRole("dialog").getByText("Reading controls", { exact: true })).toHaveCount(
    0
  );
  await page.getByRole("spinbutton", { name: "Go to page number", exact: true }).fill("5");
  await page.getByRole("button", { name: "Go", exact: true }).click();
  await expect(page.getByRole("button", { name: "Go to page", exact: true })).toContainText("5/24");
  await painted(page, 5);
  await page.screenshot({ path: test.info().outputPath("reader-mobile-docked-actions.png") });
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "Document study chat", exact: true });
  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveCSS("border-top-left-radius", "28px");
  await expect.poll(async () => (await sheet.boundingBox()).y).toBe(14);
  await expect(sheet.locator(".mobile-home-chat-header")).toHaveCount(1);
  await expect(sheet.getByRole("button", { name: "Show chat history", exact: true })).toBeVisible();
  await expect(
    sheet.getByRole("button", { name: "Conversation options", exact: true })
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Reading options", exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("reader-mobile-chat-header.png") });
  await sheet.getByRole("button", { name: "Show chat history", exact: true }).click();
  await sheet.getByRole("button", { name: "Search conversations", exact: true }).click();
  await expect(
    sheet.getByRole("textbox", { name: "Search chat history", exact: true })
  ).toBeFocused();
  await sheet.getByRole("button", { name: "Back to conversation", exact: true }).click();
  await expect(sheet.locator(".mobile-home-chat-actions")).toHaveCount(0);
  const composer = sheet.getByRole("textbox", { name: "Ask about this document", exact: true });
  await composer.fill("Keep my reader swipe draft");
  await swipeSheet(page, { x: 85, y: 250 }, { x: 260, y: 255 });
  await expect(sheet.locator(".mobile-home-chat-views")).toHaveAttribute("data-history", "true");
  await swipeSheet(page, { x: 270, y: 270 }, { x: 90, y: 273 });
  await expect(composer).toHaveValue("Keep my reader swipe draft");
  await swipeSheet(page, { x: 195, y: 28 }, { x: 195, y: 165 });
  await expect(sheet).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Open study chat", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(composer).toHaveValue("Keep my reader swipe draft");
  await page.setViewportSize({ width: 390, height: 500 });
  await expect
    .poll(async () => {
      const rect = await sheet.locator(".study-chat-composer").boundingBox();
      return rect.y + rect.height;
    })
    .toBeLessThanOrEqual(500);
  await composer.clear();
  await expect(
    sheet.getByRole("textbox", { name: "Ask about this document", exact: true })
  ).toHaveValue("");
});

test("study chat owns its history and creates new document-bound conversations", async ({
  page,
}) => {
  const previous = "01900000-0000-7000-8000-000000000020";
  const old = {
    id: previous,
    user_id: owner,
    document_id: doc,
    title: "Earlier synthetic conversation",
    created_at: "2026-11-13T00:00:00Z",
    updated_at: "2026-11-13T00:00:00Z",
    last_message_at: "2026-11-13T00:00:00Z",
    title_source: "generated",
    is_pinned: false,
    archived_at: null,
  };
  const state = await setup(page, {
    sessions: [old],
    trees: {
      [previous]: [
        {
          id: "01900000-0000-7000-8000-000000000021",
          role: "user",
          content: "Earlier question about this document",
          parent_message_id: null,
          is_active_branch: true,
        },
      ],
    },
  });
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Ask about this document", exact: true });
  await composer.fill("Keep this draft while viewing history");
  await page.getByRole("button", { name: "Study chat history", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Earlier synthetic conversation", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Study chat history", exact: true }).click();
  await expect(composer).toHaveValue("Keep this draft while viewing history");
  await page.getByRole("button", { name: "Study chat history", exact: true }).click();
  await page.getByRole("button", { name: "Earlier synthetic conversation", exact: true }).click();
  await expect(
    page.getByText("Earlier question about this document", { exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "New study chat", exact: true }).click();
  await expect(composer).toHaveValue("");
  await expect(page.getByText("Earlier question about this document", { exact: true })).toHaveCount(
    0
  );
  await composer.fill("A new question about the open PDF");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => state.posts.some((item) => item.endpoint === "stream")).toBe(true);
  expect(state.posts.find((item) => item.endpoint === "create").document_id).toBe(doc);
  await page.getByRole("button", { name: "Study chat history", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "New synthetic study chat", exact: true })
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("reader-document-history.png") });
  state.failHistory = true;
  await page.getByRole("button", { name: "Study chat history", exact: true }).click();
  await page.getByRole("button", { name: "Study chat history", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Chat history is unavailable");
  state.failHistory = false;
  await page.getByRole("button", { name: "Retry history", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

async function snipPage(page, touch = false) {
  await page.getByRole("button", { name: "Snip document area", exact: true }).click();
  await page.locator(".reader-scroll").evaluate((scroll) => {
    const paper = scroll.querySelector('[data-page-number="3"]');
    scroll.scrollTop += paper.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
  });
  await painted(page);
  const layer = page.getByLabel("Snip page 3", { exact: true });
  await expect(layer).toBeVisible();
  const box = await layer.boundingBox();
  if (touch) {
    const input = await page.context().newCDPSession(page);
    await input.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: box.x + box.width * 0.12, y: box.y + box.height * 0.18 }],
    });
    for (let step = 1; step <= 8; step++)
      await input.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: box.x + box.width * (0.12 + (0.66 * step) / 8),
            y: box.y + box.height * (0.18 + (0.16 * step) / 8),
          },
        ],
      });
    await input.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await input.detach();
  } else {
    await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.18);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.78, box.y + box.height * 0.34, { steps: 8 });
    await page.mouse.up();
  }
  await expect(
    page.getByRole("group", { name: "Selected snippet actions", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("img", { name: "Selected area", exact: true })).toHaveJSProperty(
    "complete",
    true
  );
}

test("legacy snip actions preview real pixels, preserve drafts, and send an owned document crop", async ({
  page,
}) => {
  const state = await setup(page);
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Ask about this document", exact: true });
  await composer.fill("My unfinished question");
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await painted(page);
  await snipPage(page);
  await page.screenshot({ path: test.info().outputPath("reader-legacy-snip-actions.png") });
  await page.getByRole("button", { name: "Add to chat input", exact: true }).click();
  await expect(composer).toHaveValue("My unfinished question");
  await expect(
    page.getByRole("button", { name: "Preview Snippet.png", exact: true })
  ).toBeVisible();
  expect(state.posts).toHaveLength(0);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview Snippet.png", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => state.posts.some((item) => item.endpoint === "stream")).toBe(true);
  const crop = state.posts.find((item) => item.endpoint === "snip");
  expect(crop.document_id).toBe(doc);
  expect(crop.page_number).toBe(3);
  expect(crop.rect.x + crop.rect.width).toBeLessThanOrEqual(1);
  expect(Object.keys(crop).toSorted()).toEqual(["document_id", "endpoint", "page_number", "rect"]);
  expect(state.posts.find((item) => item.endpoint === "stream").attachment_ids).toEqual([
    "01900000-0000-7000-8000-000000000011",
  ]);
});

test("mobile snip Ask AI and Escape discard keep the page usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ask about this document", exact: true })
    .fill("My unfinished draft");
  await page.getByRole("button", { name: "Back to reader", exact: true }).click();
  await snipPage(page, true);
  await page.screenshot({ path: test.info().outputPath("reader-mobile-snip-actions.png") });
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect.poll(() => state.posts.filter((item) => item.endpoint === "stream").length).toBe(1);
  expect(state.posts.find((item) => item.endpoint === "stream").message).toBe(
    "Can you explain this snippet for me?"
  );
  await expect(page.getByRole("textbox", { name: "Ask about this document" })).toHaveValue(
    "My unfinished draft"
  );
  await expect(
    page.getByRole("button", { name: "Preview Snippet.png", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to reader", exact: true }).click();
  await page.getByRole("button", { name: "Snip document area", exact: true }).click();
  await page.getByRole("button", { name: "Snip document area", exact: true }).press("Escape");
  await expect(page.getByLabel("Snip page 3", { exact: true })).toHaveCount(0);
  await selectPassage(page);
  await expect(page.getByRole("button", { name: "Explain", exact: true })).toBeVisible();
});

test("failed snip Ask AI keeps the image and draft with its error above the input", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, { failSnip: true });
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Ask about this document", exact: true });
  await input.fill("Keep this draft");
  await page.getByRole("button", { name: "Back to reader", exact: true }).click();
  await snipPage(page, true);
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  const warning = page.getByRole("alert");
  await expect(warning).toHaveText("Couldn't upload. Try again.");
  await expect(input).toHaveValue("Keep this draft");
  await expect(
    page.getByRole("button", { name: "Preview Snippet.png", exact: true })
  ).toBeVisible();
  const box = await warning.boundingBox();
  expect(box.y + box.height).toBeLessThan(
    (await page.locator(".reader-study-sheet .study-chat-composer").boundingBox()).y
  );
  expect(state.posts.filter((item) => item.endpoint === "stream")).toHaveLength(0);
  state.failSnip = false;
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect.poll(() => state.posts.filter((item) => item.endpoint === "stream").length).toBe(1);
});

test("closing study chat during snip upload cancels Ask AI without a late send", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page, { snipDelay: 2000 });
  await ready(page);
  await snipPage(page, true);
  await page.getByRole("button", { name: "Ask AI", exact: true }).click();
  await expect.poll(() => state.posts.filter((item) => item.endpoint === "snip").length).toBe(1);
  await page.getByRole("button", { name: "Back to reader", exact: true }).click();
  await expect.poll(() => state.snipResponseReady).toBe(true);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Ask about this document", exact: true })
  ).toHaveValue("");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(state.posts.filter((item) => item.endpoint === "stream")).toHaveLength(0);
});

test("blocked storage access falls back to authenticated PDF bytes and can retry outages", async ({
  page,
}) => {
  const state = await setup(page, { blockStorage: true, failProxy: true });
  await page.goto(`/app/library/${doc}/read`);
  await expect(page.getByRole("alert")).toContainText("couldn’t be loaded");
  state.failProxy = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await painted(page);
  expect(state.proxyAuth.length).toBeGreaterThan(0);
  expect(state.proxyAuth.every((value) => value?.startsWith("Bearer "))).toBe(true);
  expect(state.storageAuth.every((value) => value === undefined)).toBe(true);
  await selectPassage(page);
  await expect(page.getByRole("toolbar", { name: "Selected passage actions" })).toBeVisible();
});

test("text actions wait until selection finishes, even when a drag pauses", async ({ page }) => {
  await setup(page);
  await ready(page);
  const span = page
    .locator('[data-page-number="3"] .textLayer span')
    .filter({ hasText: "A fictional signal" })
    .first();
  const box = await span.boundingBox();
  const toolbar = page.getByRole("toolbar", { name: "Selected passage actions", exact: true });
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height / 2, { steps: 8 });
  await expect
    .poll(() => page.evaluate(() => window.getSelection()?.toString().length || 0))
    .toBeGreaterThan(0);
  // A paused drag must stay clear even after the selection-settling delay.
  await page.waitForTimeout(220);
  await expect(toolbar).toBeHidden();
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height / 2, { steps: 6 });
  await expect(toolbar).toBeHidden();
  await page.mouse.up();
  await expect(toolbar).toBeVisible();
  await page.getByRole("button", { name: "More study actions", exact: true }).click();
  await expect(page.getByRole("button", { name: "Define", exact: true })).toBeVisible();
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(toolbar).toBeHidden();
  await page.mouse.up();
});

test("reader actions send once, omit page references and reopen with a fresh chat", async ({
  page,
}) => {
  const state = await setup(page);
  await ready(page);
  await selectPassage(page);
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  await expect.poll(() => state.posts.filter((item) => item.endpoint === "stream").length).toBe(1);
  expect(state.posts[0]).toEqual({ endpoint: "create", document_id: doc });
  expect(state.posts[1].message).toContain("A fictional signal");
  expect(state.posts[1].message).not.toMatch(/Selected passage|page 3|> /);
  const composer = page.getByRole("textbox", { name: "Ask about this document", exact: true });
  await expect(composer).toHaveValue("");
  await expect(page.locator(".reader-chat-panel .study-chat-sources")).toHaveCount(0);
  await page.getByRole("separator", { name: "Resize study chat" }).press("ArrowLeft");
  await expect(page.getByRole("separator", { name: "Resize study chat" })).toHaveAttribute(
    "aria-valuenow",
    "424"
  );
  await composer.fill("Keep this question while I read");
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(composer).toHaveValue("Keep this question while I read");
  await page.getByRole("textbox", { name: "Page number", exact: true }).fill("8");
  await page.getByRole("textbox", { name: "Page number", exact: true }).press("Enter");
  await painted(page, 8);
  await page.getByRole("link", { name: "Back to library", exact: true }).click();
  await expect.poll(() => state.page).toBe(8);
  await page.goto(`/app/library/${doc}/read`);
  await painted(page, 8);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(composer).toHaveValue("");
  await expect(
    page.getByText("This synthetic passage describes a signal and a response.", { exact: true })
  ).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("reader-fresh-chat.png") });
});

test("mobile text actions send directly while preserving an unfinished draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  const composer = page.getByRole("textbox", { name: "Ask about this document", exact: true });
  await composer.fill("My unfinished question");
  await page.getByRole("button", { name: "Back to reader", exact: true }).click();
  await selectPassage(page);
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  await expect.poll(() => state.posts.filter((item) => item.endpoint === "stream").length).toBe(1);
  const sent = state.posts.find((item) => item.endpoint === "stream");
  expect(sent.document_id).toBe(doc);
  expect(sent.message).toContain("A fictional signal");
  expect(sent.message).not.toMatch(/Selected passage|page 3|My unfinished/);
  await expect(composer).toHaveValue("My unfinished question");
  await expect(page.locator(".reader-study-sheet .study-chat-sources")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("reader-mobile-direct-action.png") });
  await page.getByRole("button", { name: "Back to reader", exact: true }).click();
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(composer).toHaveValue("My unfinished question");
});

test("PDF and progress failures stay visible and retry without fake content", async ({ page }) => {
  const state = await setup(page, { failPdf: true, failProgress: true });
  await page.goto(`/app/library/${doc}/read`);
  await expect(page.getByRole("alert")).toContainText("PDF file could not be loaded");
  await expect(page.locator(".reader-header")).toBeHidden();
  await expect(page.locator(".reader-toolbar")).toBeHidden();
  await expect(page.locator(".reader-chat-panel")).toBeHidden();
  expect(await page.locator(".reader-page canvas").count()).toBe(0);
  state.failPdf = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.locator('[data-page-number="3"] canvas[data-rendered="true"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Position not saved · Retry" })).toBeVisible();
  state.failProgress = false;
  await page.getByRole("button", { name: "Position not saved · Retry" }).click();
  await expect(page.getByRole("button", { name: "Position not saved \u00b7 Retry" })).toHaveCount(
    0
  );
  await expect(page.getByText("Position saved", { exact: true })).toHaveCount(0);
});

test("account changes clear the prior document chat and selection", async ({ page }) => {
  const state = await setup(page);
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ask about this document", exact: true })
    .fill("Prior private draft");
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await painted(page);
  await snipPage(page);
  await page.getByRole("button", { name: "Add to chat input", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Preview Snippet.png", exact: true })
  ).toBeVisible();
  await page.evaluate(() =>
    window.__changePreviewAccount({ id: "00000000-0000-4000-8000-000000000009" })
  );
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "AI Chat", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Close study mode guide", exact: true }).click();
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Ask about this document" })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Preview Snippet.png", exact: true })).toHaveCount(
    0
  );
  expect(state.posts).toHaveLength(0);
});

test("PDF copies reuse disk bytes, refresh revisions and never bypass revoked access", async ({
  page,
}) => {
  const state = await setup(page);
  await ready(page);
  const downloads = state.storageAuth.length + state.proxyAuth.length;
  const accessChecks = state.readerCalls;
  expect(downloads).toBeGreaterThan(0);
  await page.reload();
  await painted(page);
  expect(state.storageAuth.length + state.proxyAuth.length).toBe(downloads);
  expect(state.readerCalls).toBeGreaterThan(accessChecks);
  state.revision = "2026-11-14T12:00:00Z";
  await page.reload();
  await painted(page);
  expect(state.storageAuth.length + state.proxyAuth.length).toBeGreaterThan(downloads);
  state.readerStatus = 404;
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("We couldn");
  await expect(page.getByRole("complementary", { name: "Workspace sidebar" })).toHaveCount(0);
  await expect(page.locator(".reader-page canvas")).toHaveCount(0);
  const entries = await page.evaluate(async () => {
    const names = (await caches.keys()).filter((name) =>
      name.startsWith("pansgpt-reader-pdfs-v1:")
    );
    return (
      await Promise.all(names.map(async (name) => (await (await caches.open(name)).keys()).length))
    ).reduce((a, b) => a + b, 0);
  });
  expect(entries).toBe(0);
});

test("reader loading and failures stay full page without sidebar or workspace headers", async ({
  page,
}) => {
  const state = await setup(page, { readerDelay: 1000, readerStatus: 503 });
  await page.goto(`/app/library/${doc}/read`);
  await expect(page.getByRole("status")).toContainText("Opening");
  await expect(page.getByRole("complementary", { name: "Workspace sidebar" })).toHaveCount(0);
  await expect(page.locator(".shell-topbar")).toHaveCount(0);
  await expect(page.getByRole("alert")).toBeVisible();
  const bounds = await page.locator(".reader-route").boundingBox();
  expect(bounds.x).toBe(0);
  expect(bounds.width).toBe(1440);
  expect(bounds.height).toBe(975);
  await page.screenshot({ path: test.info().outputPath("reader-full-page-error.png") });
  state.readerStatus = 200;
  state.readerDelay = 0;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await painted(page);
});

test("mobile scrolling hides controls over a fixed PDF and restores them without reflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await ready(page);
  await painted(page);
  const geometry = () =>
    page.locator(".reader-scroll").evaluate((scroll) => {
      const paper = scroll.querySelector('[data-page-number="3"]');
      return {
        height: scroll.clientHeight,
        width: paper.getBoundingClientRect().width,
        anchor: paper.getBoundingClientRect().top + scroll.scrollTop,
      };
    });
  const before = await geometry();
  await page.locator(".reader-scroll").evaluate((scroll) => {
    scroll.scrollTop += 120;
  });
  await expect(page.locator(".reader-header")).toHaveAttribute("data-open", "false");
  await expect(page.locator(".reader-toolbar")).toHaveAttribute("data-open", "false");
  const after = await geometry();
  expect(after.height).toBe(before.height);
  expect(after.width).toBe(before.width);
  expect(Math.abs(after.anchor - before.anchor)).toBeLessThan(2);
  await page.screenshot({ path: test.info().outputPath("reader-immersive-mobile.png") });
  await page.locator(".reader-scroll").evaluate((scroll) => {
    scroll.scrollTop -= 50;
  });
  await expect(page.locator(".reader-header")).toHaveAttribute("data-open", "true");
  expect(await geometry()).toEqual(before);
  await page.getByRole("button", { name: "Go to page", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("combobox")).toHaveCount(0);
  const input = await page.getByRole("spinbutton", { name: "Go to page number" }).boundingBox();
  const total = await page.locator(".reader-go-to-total").boundingBox();
  expect(input.x + input.width).toBeLessThan(total.x);
  await page.screenshot({ path: test.info().outputPath("reader-simple-page-dialog.png") });
});

test("PDF still opens when browser disk storage is unavailable", async ({ page }) => {
  const state = await setup(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, "caches", {
      get() {
        throw new Error("Synthetic disk unavailable");
      },
    });
  });
  await ready(page);
  await painted(page);
  await page.reload();
  await painted(page);
  expect(state.storageAuth.length).toBe(2);
});

test("a text action waits for first-chat consent and sends once after acceptance", async ({
  page,
}) => {
  const state = await setup(page, { accepted: false });
  await ready(page);
  await selectPassage(page);
  await page.getByRole("button", { name: "Explain", exact: true }).click();
  await expect(page.getByRole("button", { name: "I Understand & Agree" })).toBeVisible();
  expect(state.posts.filter((item) => item.endpoint === "stream")).toHaveLength(0);
  await page.locator("#academic-disclaimer-checkbox").check();
  await page.getByRole("button", { name: "I Understand & Agree" }).click();
  await expect(
    page.getByText("This synthetic passage describes a signal and a response.", { exact: true })
  ).toBeVisible();
  expect(state.posts.filter((item) => item.endpoint === "stream")).toHaveLength(1);
});

for (const mobile of [false, true]) {
  test(`failed study responses retry the owned question without duplicating it on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const state = await setup(page, { streamMode: "failure" });
    await ready(page);
    await page.getByRole("button", { name: "Open study chat", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Ask about this document" });
    await input.fill("Synthetic recovery question");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    const failed = page.locator('.study-chat-message[data-role="assistant"]').last();
    await expect(failed.getByRole("alert")).toHaveText(
      mobile ? "Something went wrong. Try again." : "Something went wrong. Please try again."
    );
    await expect(failed).toContainText("Synthetic partial answer.");
    await expect(failed).not.toContainText("internal provider");
    await page.screenshot({
      path: test.info().outputPath(`chat-failure-${mobile ? "mobile" : "desktop"}.png`),
    });
    await failed.getByRole("button", { name: "Dismiss notice", exact: true }).click();
    await expect(failed.getByRole("alert")).toHaveCount(0);
    await expect(failed.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
    await input.fill("Keep my unfinished draft");
    state.streamMode = null;
    await failed.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(failed).toContainText("This synthetic passage describes a signal and a response.");
    expect(state.posts.filter((item) => item.endpoint === "stream")).toHaveLength(2);
    expect(state.posts.at(-1).retry_message_id).toBe("01900000-0000-7000-8000-000000000007");
    expect(state.posts.at(-1).document_id).toBe(doc);
    await expect(page.getByText("Synthetic recovery question", { exact: true })).toHaveCount(1);
    await expect(input).toHaveValue("Keep my unfinished draft");
    await expect(failed.getByRole("alert")).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath(`chat-retry-${mobile ? "mobile" : "desktop"}.png`),
    });
  });
}

test("Retry restores an already saved response without another generation", async ({ page }) => {
  const state = await setup(page, { streamMode: "saved_disconnect" });
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ask about this document" })
    .fill("Synthetic interrupted response");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Something went wrong. Please try again.");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText("This synthetic passage describes a signal and a response.", { exact: true })
  ).toBeVisible();
  expect(state.posts.filter((item) => item.endpoint === "stream")).toHaveLength(1);
});

test("a failed tool request cannot be replayed through response Retry", async ({ page }) => {
  await setup(page, { streamMode: "tool_failure" });
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ask about this document" })
    .fill("Synthetic tool request");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
});

test("slow responses show gentle waiting feedback before completing", async ({ page }) => {
  await setup(page, { streamMode: "slow" });
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Ask about this document" })
    .fill("Synthetic slow request");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "This is taking longer than usual." }).first()
  ).toBeVisible();
  await expect(
    page.getByText("This synthetic passage describes a signal and a response.", { exact: true })
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("mobile study validation uses a short dismissible banner above a compact composer", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await setup(page);
  await ready(page);
  await page.getByRole("button", { name: "Open study chat", exact: true }).click();
  const composer = page.locator(".reader-study-sheet .study-chat-composer");
  const before = await composer.boundingBox();
  await page.getByRole("button", { name: "Open uploads and study actions", exact: true }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Photos", exact: true }).click();
  await (
    await chooser
  ).setFiles(
    Array.from({ length: 5 }, (_, i) => ({
      name: `synthetic-${i}.png`,
      mimeType: "image/png",
      buffer: Buffer.from("Synthetic image validation fixture"),
    }))
  );
  const warning = page.getByRole("alert");
  await expect(warning).toHaveText("Up to 4 files per message.");
  const warningBox = await warning.boundingBox();
  const bannerBox = await page.locator(".study-chat-notice-banner").boundingBox();
  expect(
    Math.abs(warningBox.y + warningBox.height / 2 - (bannerBox.y + bannerBox.height / 2))
  ).toBeLessThan(1);
  const after = await composer.boundingBox();
  expect(warningBox.y + warningBox.height).toBeLessThan(after.y);
  expect(warningBox.width).toBeGreaterThan(200);
  expect(Math.abs(after.height - before.height)).toBeLessThan(1);
  await page.screenshot({ path: test.info().outputPath("study-short-mobile-notice.png") });
  await page.getByRole("button", { name: "Dismiss notice", exact: true }).click();
  await expect(warning).toHaveCount(0);
  expect(state.posts).toHaveLength(0);
});

for (const mobile of [false, true]) {
  test(`study attachment limit covers Files, paste, drop and snips on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const state = await setup(page);
    await ready(page);
    await page.getByRole("button", { name: "Open study chat", exact: true }).click();
    const input = page.getByRole("textbox", { name: "Ask about this document", exact: true });
    const cards = page.locator(
      '.study-chat-composer [data-removable="true"].study-chat-attachment-card'
    );
    const files = Array.from({ length: 5 }, (_, i) => ({
      name: `synthetic-${i}.txt`,
      mimeType: "text/plain",
      buffer: Buffer.from("Synthetic note"),
    }));
    async function choose(selected) {
      await page
        .getByRole("button", { name: "Open uploads and study actions", exact: true })
        .click();
      const chooser = page.waitForEvent("filechooser");
      await page
        .getByRole("button", { name: mobile ? "Files" : "Upload a file", exact: true })
        .click();
      await (await chooser).setFiles(selected);
    }
    await choose(files);
    await expect(page.getByRole("alert")).toHaveText(
      mobile ? "Up to 4 files per message." : "Attach up to four files at a time."
    );
    await expect(cards).toHaveCount(0);
    await choose(files.slice(0, 4));
    await expect(cards).toHaveCount(4);
    await choose([files[4]]);
    await expect(cards).toHaveCount(4);
    await input.evaluate((node) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["Synthetic paste"], "pasted.txt", { type: "text/plain" }));
      node.dispatchEvent(
        new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true })
      );
      node
        .closest("form")
        .dispatchEvent(
          new DragEvent("drop", { dataTransfer: transfer, bubbles: true, cancelable: true })
        );
    });
    await expect(cards).toHaveCount(4);
    if (mobile) await page.getByRole("button", { name: "Back to reader", exact: true }).click();
    else await page.getByRole("button", { name: "Open study chat", exact: true }).click();
    await painted(page);
    await snipPage(page, mobile);
    await page.getByRole("button", { name: "Add to chat input", exact: true }).click();
    await expect(cards).toHaveCount(4);
    await expect(page.getByRole("alert")).toHaveText(
      mobile ? "Up to 4 files per message." : "Attach up to four files at a time."
    );
    expect(state.posts).toHaveLength(0);
  });

  test(`reader guide appears once before reading and Help reopens it on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page, { firstGuide: true });
    await page.goto(`/app/library/${doc}/read`);
    const guide = page.getByRole("dialog");
    await expect(guide.getByRole("heading", { name: "AI Chat", exact: true })).toBeVisible();
    await expect(page.locator(".reader-canvas-area")).toBeHidden();
    await guide.getByRole("button", { name: "Close study mode guide", exact: true }).click();
    await painted(page);
    await expect
      .poll(() =>
        page.evaluate((owner) => localStorage.getItem(`pansgpt_reader_guide_seen_${owner}`), owner)
      )
      .toBe("true");
    await page.reload();
    await painted(page);
    await expect(guide).toHaveCount(0);
    const another = "01900000-0000-7000-8000-000000000099";
    await page.route(`**/api/v1/library/catalog/${another}/**`, async (route) => {
      if (route.request().url().endsWith("/reader"))
        return route.fulfill({
          json: { document: { ...document, id: another }, chat_session_id: null },
        });
      if (route.request().url().endsWith("/pdf-url"))
        return route.fulfill({
          json: {
            document_id: another,
            presigned_url: "https://files.example.test/synthetic-study.pdf",
            expires_in_seconds: 900,
          },
        });
      return route.fulfill({ json: {} });
    });
    await page.goto(`/app/library/${another}/read`);
    await painted(page);
    await expect(guide).toHaveCount(0);
    const help = page
      .getByRole("button", { name: "Open reader help", exact: true })
      .filter({ visible: true });
    if (!mobile)
      await expect(
        page
          .locator(".reader-toolbar")
          .getByRole("button", { name: "Open reader help", exact: true })
      ).toBeVisible();
    await help.click();
    await expect(guide.getByRole("heading", { name: "AI Chat", exact: true })).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`reader-guide-${mobile ? "mobile" : "desktop"}.png`),
    });
    await guide.getByRole("button", { name: "Close study mode guide", exact: true }).click();
    await expect(help).toBeFocused();
  });
}
