const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const pptxFixture = fs.readFileSync(path.join(__dirname, "fixtures/synthetic-study.pptx"));
const presentationFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/synthetic-study-preview.json"), "utf8")
);
const imageFixture = fs.readFileSync(path.join(__dirname, "fixtures/synthetic-diagram.png"));
const owner = "00000000-0000-4000-8000-000000000001";
const session = "00000000-0000-4000-8000-000000000003";
async function setupChat(page) {
  await page.addInitScript(
    ({ owner, session, pptxBase64, imageBase64, presentationFixture }) => {
      const uploads = JSON.parse(sessionStorage.getItem("image-fixture-uploads") || "{}");
      const savedSessions = JSON.parse(
        sessionStorage.getItem("session-metadata-fixture") || "null"
      );
      window.__chatSessions = savedSessions || [
        {
          id: session,
          user_id: owner,
          title: "Synthetic study conversation",
          title_source: "manual",
          last_message_at: "2026-10-23T00:00:00Z",
          is_pinned: false,
          archived_at: null,
          created_at: "2026-10-23T00:00:00Z",
          updated_at: "2026-10-23T00:00:00Z",
        },
      ];
      const changed = () => {
        window.__chatFixtureRevision = (window.__chatFixtureRevision || 0) + 1;
        sessionStorage.setItem("session-metadata-fixture", JSON.stringify(window.__chatSessions));
        window.dispatchEvent(new Event("fixture-chats-changed"));
      };
      localStorage.setItem(`pansgpt_disclaimer_accepted_${owner}`, "true");
      localStorage.setItem("pansgpt-theme", sessionStorage.getItem("test-theme") || "dark");
      window.__calls = [];
      const initialUser = "00000000-0000-4000-8000-000000000011";
      const initialAssistant = "00000000-0000-4000-8000-000000000012";
      const store = () => sessionStorage.setItem("interaction-tree", JSON.stringify(tree));
      let tree = JSON.parse(sessionStorage.getItem("interaction-tree") || "null") || [
        {
          id: initialUser,
          role: "user",
          content: "Original synthetic question",
          parent_message_id: null,
          is_active_branch: true,
        },
        {
          id: initialAssistant,
          role: "assistant",
          content: "Original synthetic answer",
          parent_message_id: initialUser,
          is_active_branch: true,
        },
      ];
      const select = (id) => {
        const path = new Set();
        while (id) {
          path.add(id);
          id = tree.find((item) => item.id === id)?.parent_message_id;
        }
        tree.forEach((item) => {
          item.is_active_branch = path.has(item.id);
        });
        store();
      };
      const json = (value, status = 200) =>
        new Response(JSON.stringify(value), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      const originalFetch = window.fetch.bind(window);
      window.fetch = async (input, options = {}) => {
        const url = String(input);
        if (url.includes("/api/v1/library/")) {
          window.__calls.push({
            url,
            method: options.method || "GET",
            authorization: options.headers?.Authorization,
          });
          if (url.includes("/artifacts/presentation")) {
            if (window.__holdPresentationPreview)
              await new Promise((resolve, reject) => {
                window.__releasePreview = resolve;
                options.signal?.addEventListener(
                  "abort",
                  () => {
                    window.__previewAborted = true;
                    reject(new DOMException("Cancelled", "AbortError"));
                  },
                  { once: true }
                );
              });
            if (window.__failPresentationPreview)
              return json({ detail: "Synthetic preview unavailable" }, 503);
            return json(presentationFixture);
          }
          if (!url.includes("/artifacts/download"))
            return json({ detail: "Wrong download route" }, 404);
          if (window.__failArtifactDownload) return json({ detail: "File not found" }, 404);
          const data = Uint8Array.from(atob(pptxBase64), (c) => c.charCodeAt(0));
          return new Response(data, {
            headers: {
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            },
          });
        }
        if (!url.includes("/api/v1/ai/chat")) return originalFetch(input, options);
        const body = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
        window.__calls.push({
          url,
          method: options.method || "GET",
          body: typeof options.body === "string" ? body : "multipart",
          authorization: options.headers?.Authorization,
        });
        if (new URL(url).pathname.endsWith("/search")) {
          if (window.__failSearch) return json({ detail: "Synthetic search unavailable" }, 503);
          const params = new URL(url).searchParams,
            query = params.get("q").toLowerCase(),
            offset = Number(params.get("offset") || 0),
            size = window.__searchPageSize || 20;
          const results = (
            window.__searchResults ||
            window.__chatSessions
              .filter((chat) => !chat.deleted)
              .map((chat) => ({
                session_id: chat.id,
                title: chat.title,
                message_id: initialAssistant,
                snippet: "Original synthetic answer",
                is_archived: !!chat.archived_at,
                last_message_at: null,
              }))
          ).filter(
            (item) =>
              (params.get("include_archived") === "true" || !item.is_archived) &&
              `${item.title} ${item.snippet}`.toLowerCase().includes(query)
          );
          return json({
            results: results.slice(offset, offset + size),
            next_offset: offset + size < results.length ? offset + size : null,
          });
        }
        if (new URL(url).pathname.endsWith("/trash"))
          return json({
            sessions: window.__chatSessions.filter((chat) => chat.deleted),
            next_offset: null,
          });
        if (url.endsWith("/restore")) {
          const removed = window.__chatSessions.find(
            (chat) => url.includes(chat.id) && chat.deleted
          );
          if (window.__failRestore || !removed)
            return json({ detail: "Synthetic restore unavailable" }, 503);
          removed.deleted = false;
          removed.deleted_at = null;
          changed();
          return json(removed);
        }
        if (url.endsWith("/sessions") && options.method === "POST")
          return json({ id: session, user_id: owner });
        if (url.includes("/sessions?"))
          return json({
            sessions: window.__chatSessions.filter(
              (chat) => !chat.deleted && !!chat.archived_at === url.includes("archived=true")
            ),
          });
        const target = window.__chatSessions.find((chat) => url.includes(chat.id) && !chat.deleted);
        if (url.endsWith("/metadata"))
          return target ? json(target) : json({ detail: "Conversation not found." }, 404);
        if (options.method === "PATCH") {
          if (window.__failSessionMutation)
            return json({ detail: "Synthetic session update failure" }, 503);
          if (!target) return json({ detail: "Conversation not found." }, 404);
          if ("title" in body) {
            target.title = body.title;
            target.title_source = "manual";
          }
          target.updated_at = new Date().toISOString();
          if ("is_pinned" in body) target.is_pinned = body.is_pinned;
          if ("archived" in body)
            target.archived_at = body.archived ? "2026-10-23T00:01:00Z" : null;
          changed();
          return json(target);
        }
        if (options.method === "DELETE" && !url.includes("/attachments")) {
          if (!target) return json({ detail: "Conversation not found." }, 404);
          target.deleted = true;
          target.deleted_at = new Date().toISOString();
          changed();
          return new Response(null, { status: 204 });
        }
        if (url.endsWith("/transcribe")) return json({ text: "Synthetic spoken question" });
        if (url.includes("/attachments")) {
          if (options.method === "DELETE") return new Response(null, { status: 204 });
          if (new URL(url).pathname.endsWith("/preview")) {
            if (
              window.__failImagePreview ||
              (window.__failLargePreview && url.includes("size=large"))
            )
              return json({ detail: "Preview unavailable" }, 503);
            return new Response(
              Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0)),
              { headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } }
            );
          }
          if (window.__failUpload) return json({ detail: "Synthetic upload unavailable" }, 503);
          const file = options.body.get("file");
          const saved = {
            id: crypto.randomUUID(),
            name: file.name,
            content_type: file.type,
            size: file.size,
          };
          uploads[saved.id] = saved;
          sessionStorage.setItem("image-fixture-uploads", JSON.stringify(uploads));
          return json(saved, 201);
        }
        if (url.endsWith("/feedback")) {
          if (window.__failFeedback)
            return json({ detail: "Synthetic feedback save failure" }, 503);
          const id = url.split("/messages/")[1].split("/")[0];
          tree.find((item) => item.id === id).feedback = body.rating;
          store();
          return json({ rating: body.rating });
        }
        if (url.endsWith("/branch")) {
          if (window.__failBranch) return json({ detail: "Synthetic branch save failure" }, 503);
          select(body.message_id);
          return json({ message_id: body.message_id });
        }
        if (url.endsWith("/stream")) {
          if (window.__failStream) return json({ detail: "Synthetic service unavailable" }, 503);
          let question;
          if (body.regenerate_message_id)
            question = tree.find(
              (item) =>
                item.id ===
                tree.find((item) => item.id === body.regenerate_message_id).parent_message_id
            );
          else {
            const edited =
              body.edit_message_id && tree.find((item) => item.id === body.edit_message_id);
            question = {
              id: crypto.randomUUID(),
              role: "user",
              content: body.message,
              parent_message_id: edited ? edited.parent_message_id : body.parent_message_id,
              is_active_branch: false,
              attachment_metadata: {
                attachments: (body.attachment_ids || []).map((id) => uploads[id]),
              },
            };
            tree.push(question);
          }
          const answer = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: body.edit_message_id
              ? "Edited branch answer"
              : body.regenerate_message_id
                ? "Regenerated synthetic answer"
                : "Attachment synthetic answer",
            parent_message_id: question.id,
            is_active_branch: true,
          };
          tree.push(answer);
          select(answer.id);
          const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          if (window.__webLookupMode) {
            const prefix =
              frame("init", {
                session_id: session,
                user_message_id: question.id,
                assistant_message_id: answer.id,
              }) +
              frame("thinking_chunk", {
                code: "searching_sources",
                token: "Checking external sources.\n",
              });
            if (window.__webLookupMode === "unavailable") {
              tree = tree.filter((item) => item.id !== answer.id);
              select(question.parent_message_id);
              return new Response(
                prefix +
                  frame("error", {
                    error: "Web search is not configured, so I cannot verify current information.",
                    code: "WEB_SEARCH_NOT_CONFIGURED",
                    retryable: false,
                  }) +
                  frame("done", { full_text: "" }),
                { headers: { "Content-Type": "text/event-stream" } }
              );
            }
            answer.content = "The synthetic public report verifies this fixture result.";
            answer.citations = [
              {
                source_type: "web",
                title: "Synthetic public match report",
                url: "https://example.test/report",
                page_start: null,
                page_end: null,
              },
            ];
            return new Response(
              prefix +
                frame("citations", answer.citations) +
                frame("text_chunk", { token: answer.content }) +
                frame("done", { full_text: answer.content }),
              { headers: { "Content-Type": "text/event-stream" } }
            );
          }
          if (window.__artifactMode) {
            answer.content =
              "I've organized the discussion into five slides, pairing four synthetic study topics with concise learning points and revision examples. You can use the outline to review each topic in turn.\n\n**References supplied with this deck**\n- Synthetic course notes\n- [Synthetic study reference](<https://example.test/study>)";
            const artifact = {
              skill_name: "create_pptx",
              title: "Synthetic study presentation",
              file_extension: "pptx",
              storage_key: `artifacts/00000000-0000-4000-8000-000000000002/${owner}/pptx/synthetic-study.pptx`,
              download_url: "/api/v1/library/artifacts/download?key=legacy-fixture",
              content: {
                slides_count: 5,
                slide_titles: presentationFixture.slides.map((slide) => slide.title),
                overview:
                  "I've organized the discussion into five slides, pairing four synthetic study topics with concise learning points and revision examples. You can use the outline to review each topic in turn.",
                sources: [
                  { title: "Synthetic course notes", url: null },
                  { title: "Synthetic study reference", url: "https://example.test/study" },
                ],
              },
            };
            const events =
              frame("init", {
                session_id: session,
                user_message_id: question.id,
                assistant_message_id: answer.id,
              }) +
              frame("thinking_chunk", {
                code: "creating_materials",
                token: "Preparing your study materials.\n",
              }) +
              frame("tool_start", {
                call_id: "synthetic-pptx",
                tool_name: "create_pptx",
                arguments: {},
              }) +
              frame("tool_end", {
                call_id: "synthetic-pptx",
                tool_name: "create_pptx",
                status: "success",
                result: { status: "success" },
              }) +
              frame("artifact_ready", artifact) +
              frame("text_chunk", { token: answer.content }) +
              frame("done", { full_text: answer.content });
            return new Response(events, { headers: { "Content-Type": "text/event-stream" } });
          }
          if (window.__sseTimeoutMode) {
            const partial =
              window.__sseTimeoutMode === "partial" ? "Synthetic partial response." : "";
            tree = tree.filter((item) => item.id !== answer.id);
            select(question.parent_message_id);
            return new Response(
              frame("init", {
                session_id: session,
                user_message_id: question.id,
                assistant_message_id: answer.id,
              }) +
                frame("thinking_chunk", {
                  code: "reviewing_request",
                  token: "Reviewing your request.\n",
                }) +
                (partial ? frame("text_chunk", { token: partial }) : "") +
                frame("error", {
                  error: "The answer timed out. Please try again.",
                  code: "TIMEOUT",
                  retryable: true,
                }) +
                frame("done", { full_text: partial }),
              { headers: { "Content-Type": "text/event-stream" } }
            );
          }
          if (window.__holdReasoning) {
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
              start(controller) {
                let closed = false;
                const emit = (event, data) => {
                  if (!closed) controller.enqueue(encoder.encode(frame(event, data)));
                };
                const close = () => {
                  if (!closed) {
                    closed = true;
                    controller.close();
                  }
                };
                options.signal?.addEventListener(
                  "abort",
                  () => {
                    window.__reasoningAborted = true;
                    close();
                  },
                  { once: true }
                );
                emit("init", {
                  session_id: session,
                  user_message_id: question.id,
                  assistant_message_id: answer.id,
                });
                emit("thinking_chunk", {
                  code: window.__progressCode || "checking_materials",
                  token: "PRIVATE RAW THINKING",
                });
                window.__moreReasoning = () =>
                  emit("thinking_chunk", {
                    code: "checking_materials",
                    token: "PRIVATE REPEATED THINKING",
                  });
                window.__finishReasoning = () => {
                  emit("text_chunk", { token: answer.content });
                  emit("done", { full_text: answer.content });
                  close();
                };
              },
            });
            return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
          }
          return new Response(
            frame("init", {
              session_id: session,
              user_message_id: question.id,
              assistant_message_id: answer.id,
            }) +
              frame("citations", [
                {
                  title: "Synthetic course document",
                  chunk_id: "synthetic-source-chunk",
                  document_id: "00000000-0000-4000-8000-000000000071",
                  page_start: 2,
                },
                {
                  title: "Synthetic course document",
                  chunk_id: "synthetic-source-chunk",
                  document_id: "00000000-0000-4000-8000-000000000071",
                  page_start: 9,
                },
              ]) +
              frame("text_chunk", { token: answer.content }) +
              frame("done", { full_text: answer.content }),
            { headers: { "Content-Type": "text/event-stream" } }
          );
        }
        return json({
          session: target || { id: session, user_id: owner },
          messages: window.__shareSafetyFixture
            ? [
                ...tree.map((item) =>
                  item.role === "assistant"
                    ? { ...item, thinking_text: "PRIVATE INTERNAL REASONING" }
                    : item
                ),
                {
                  id: "00000000-0000-4000-8000-000000000099",
                  role: "assistant",
                  content: "PRIVATE OTHER BRANCH",
                  parent_message_id: initialUser,
                  is_active_branch: false,
                },
              ]
            : tree,
        });
      };
      class FakeRecorder extends EventTarget {
        static isTypeSupported() {
          return true;
        }
        constructor() {
          super();
          this.state = "inactive";
          this.mimeType = "audio/webm";
        }
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          const event = new Event("dataavailable");
          event.data = new Blob(["synthetic audio"], { type: "audio/webm" });
          this.dispatchEvent(event);
          this.dispatchEvent(new Event("stop"));
        }
      }
      window.MediaRecorder = FakeRecorder;
      navigator.mediaDevices.getUserMedia = async () => ({
        getTracks: () => [
          {
            stop: () => {
              window.__trackStopped = true;
            },
          },
        ],
      });
    },
    {
      owner,
      session,
      pptxBase64: pptxFixture.toString("base64"),
      imageBase64: imageFixture.toString("base64"),
      presentationFixture,
    }
  );
}

test("home and chat share aligned navigation, docked toggle and polished account menus", async ({
  page,
}) => {
  await setupChat(page);
  await page.goto("http://127.0.0.1:4178/?surface=home", { waitUntil: "commit", timeout: 60000 });
  const sidebar = page.getByRole("complementary", { name: "Workspace sidebar" });
  const newChat = sidebar.getByRole("link", { name: "New chat", exact: true });
  await expect(newChat).toBeVisible({ timeout: 60000 });
  const sectionBounds = await sidebar.locator(".shell-new-chat-section").boundingBox();
  const newChatBounds = await newChat.boundingBox();
  expect(newChatBounds.y - sectionBounds.y).toBe(13);
  expect(sectionBounds.y + sectionBounds.height - newChatBounds.y - newChatBounds.height).toBe(13);
  await expect(sidebar.locator(".study-chat-archive-icon")).toHaveCount(1);
  await expect(page.locator(".shell-assistant-launcher")).toHaveCount(0);
  const iconPositions = await sidebar.locator(".shell-nav-link > svg").evaluateAll((icons) =>
    icons.map((icon) => ({
      x: icon.getBoundingClientRect().x,
      width: icon.getBoundingClientRect().width,
    }))
  );
  expect(new Set(iconPositions.map((icon) => icon.x)).size).toBe(1);
  expect(iconPositions.every((icon) => icon.width === 19)).toBe(true);
  await page.getByRole("button", { name: "Account menu", exact: true }).click();
  const account = page.getByRole("menu", { name: "Account options" });
  await expect(account.getByRole("menuitem", { name: "Log out", exact: true })).toBeVisible();
  await expect(account.getByRole("separator")).toHaveCount(1);
  expect(await account.evaluate((element) => getComputedStyle(element).borderRadius)).toBe("14px");
  await page.screenshot({ path: test.info().outputPath("profile-menu-desktop.png") });
  await account.getByRole("menuitem", { name: "Help", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Help", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Account menu", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
  const toggle = page.getByRole("button", { name: "Expand sidebar", exact: true });
  await expect(toggle).toBeFocused();
  const railBounds = await sidebar.boundingBox();
  const toggleBounds = await toggle.boundingBox();
  const logoBounds = await sidebar.getByRole("link", { name: "PansGPT home" }).boundingBox();
  expect(toggleBounds.x).toBeGreaterThanOrEqual(railBounds.x + railBounds.width);
  expect(
    Math.abs(toggleBounds.y + toggleBounds.height / 2 - logoBounds.y - logoBounds.height / 2)
  ).toBeLessThan(4);
  expect(
    await sidebar
      .locator(".p-app-nav-panel-top")
      .evaluate((element) => getComputedStyle(element).scrollbarWidth)
  ).toBe("none");
  await page.screenshot({ path: test.info().outputPath("collapsed-sidebar-home.png") });
  await newChat.click();
  await expect(page).toHaveURL(/\/app\/chat$/);
  await expect(page.getByLabel("Study question")).toBeVisible();
  await toggle.click();
  await expect(page.getByRole("button", { name: "Collapse sidebar", exact: true })).toBeFocused();
  await expect(newChat).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".shell-collapse-docked")).not.toBeVisible();
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  const navigation = page.getByRole("dialog", { name: "Workspace navigation", exact: true });
  await expect(navigation.getByRole("link", { name: "New chat", exact: true })).toBeVisible();
  expect(
    await navigation
      .getByRole("link", { name: "Home", exact: true })
      .evaluate((element) => getComputedStyle(element).textDecorationLine)
  ).toBe("none");
  await navigation.getByRole("button", { name: "Account menu", exact: true }).click();
  await expect(account).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("profile-menu-mobile.png") });
  await page.keyboard.press("Escape");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("conversation search covers history, archives, pagination and matched-message navigation", async ({
  page,
}) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.evaluate(
    ({ session }) => {
      window.__searchPageSize = 1;
      window.__chatSessions.push(
        {
          ...window.__chatSessions[0],
          id: "00000000-0000-4000-8000-000000000091",
          title: "Synthetic renamed empty chat",
          last_message_at: null,
          updated_at: "2026-12-01T00:00:00Z",
        },
        {
          ...window.__chatSessions[0],
          id: "00000000-0000-4000-8000-000000000092",
          title: "Synthetic older pinned chat",
          is_pinned: true,
          last_message_at: "2026-10-20T00:00:00Z",
        }
      );
      window.__chatFixtureRevision = (window.__chatFixtureRevision || 0) + 1;
      window.dispatchEvent(new Event("fixture-chats-changed"));
      window.__searchResults = [
        {
          session_id: session,
          title: "Clearance revision",
          message_id: "00000000-0000-4000-8000-000000000012",
          snippet:
            "## **Clearance** and the *matched explanation* from [course notes](https://example.test)",
          is_archived: false,
          last_message_at: "2026-10-22T12:00:00Z",
        },
        {
          session_id: "00000000-0000-4000-8000-000000000081",
          title: "Clearance kinetics",
          message_id: null,
          snippet: "An older conversation outside the loaded sidebar",
          is_archived: false,
          last_message_at: null,
        },
        {
          session_id: "00000000-0000-4000-8000-000000000082",
          title: "Clearance archived",
          message_id: null,
          snippet: "An archived conversation",
          is_archived: true,
          last_message_at: null,
        },
      ];
    },
    { session }
  );
  await expect(page.getByRole("button", { name: "Quick search", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Quick search", exact: true }).click();
  const search = page.getByRole("dialog", { name: "Search conversations", exact: true });
  const input = search.getByLabel("Search conversations", { exact: true });
  await expect(input).toBeFocused();
  await expect(search.getByRole("heading", { name: "Recent chats" })).toBeVisible();
  await expect(search.getByRole("link", { name: "Synthetic study conversation" })).toBeVisible();
  await expect(search.getByRole("link").first()).toHaveText("Synthetic study conversation");
  await expect(search.getByRole("link").last()).toHaveText("Synthetic renamed empty chat");
  await page.screenshot({ path: test.info().outputPath("search-recent-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Quick search", exact: true })).toBeFocused();
  await page.keyboard.press("Control+k");
  await expect(input).toBeFocused();
  await input.fill("nothing-matches");
  await expect(search.getByRole("status")).toHaveText("No matching conversations.");
  await page.evaluate(() => {
    window.__failSearch = true;
  });
  await input.fill("clearance");
  await expect(search.getByRole("alert")).toContainText("unavailable");
  await page.evaluate(() => {
    window.__failSearch = false;
  });
  await search.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(1);
  await search.getByRole("button", { name: "Load more results", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(2);
  await expect(search.locator("time").first()).toHaveText("Oct 22");
  await expect(search.locator("small").first()).toHaveText(
    "Clearance and the matched explanation from course notes"
  );
  await expect(search.locator("small mark").first()).toHaveText("Clearance");
  await expect(search.locator("small a, small img, small script")).toHaveCount(0);
  await search.getByRole("button", { name: "Chats", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(1);
  await search.getByRole("button", { name: "All", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(1);
  await search.getByRole("button", { name: "Load more results", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(2);
  await search.getByRole("button", { name: "Load more results", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(3);
  await page.screenshot({ path: test.info().outputPath("conversation-search-desktop.png") });
  expect(
    await page.evaluate(() =>
      window.__calls
        .filter((call) => call.url.includes("/chat/search?"))
        .every((call) => call.authorization === "Bearer invalid-fixture-not-an-access-token")
    )
  ).toBe(true);
  await input.focus();
  await input.press("ArrowDown");
  await expect(search.getByRole("link").first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(search).not.toBeVisible();
  await expect(page).toHaveURL(/message=00000000-0000-4000-8000-000000000012/);
  await expect(page.locator("#chat-message-00000000-0000-4000-8000-000000000012")).toHaveAttribute(
    "data-search-match",
    "true"
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Control+k");
  await expect(search).toBeVisible();
  await expect(input).toHaveValue("");
  await input.fill("clearance");
  await expect(search.getByRole("link")).toHaveCount(1);
  await search.getByRole("button", { name: "Load more results", exact: true }).click();
  await expect(search.getByRole("link")).toHaveCount(2);
  await page.screenshot({ path: test.info().outputPath("conversation-search-mobile.png") });
  await search.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(input).toBeFocused();
  await expect(search.getByRole("heading", { name: "Recent chats" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("semantic title arrival, pinned group, centred dialogs and archive/delete undo recovery", async ({
  page,
}) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.evaluate(() => {
    const chat = window.__chatSessions[0];
    chat.title = "New Chat";
    chat.title_source = "pending";
    sessionStorage.setItem("session-metadata-fixture", JSON.stringify(window.__chatSessions));
  });
  await page.reload({ waitUntil: "commit" });
  const title = page.getByRole("button", { name: "Conversation options", exact: true });
  await expect(title).toHaveText("New chat");
  await page.evaluate(() => {
    const chat = window.__chatSessions[0];
    chat.title = "Morning check-in";
    chat.title_source = "pending";
    chat.updated_at = new Date().toISOString();
    sessionStorage.setItem("session-metadata-fixture", JSON.stringify(window.__chatSessions));
  });
  await expect(title).toHaveText("Morning check-in");
  await expect(
    page.locator(".shell-sidebar").getByRole("link", { name: "Morning check-in", exact: true })
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("provisional-chat-title-desktop.png") });
  await page.evaluate(() => {
    const chat = window.__chatSessions[0];
    chat.title = "Drug Clearance Explained";
    chat.title_source = "generated";
    chat.updated_at = new Date().toISOString();
    sessionStorage.setItem("session-metadata-fixture", JSON.stringify(window.__chatSessions));
  });
  await expect(title).toHaveText("Drug Clearance Explained");
  await title.click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "Rename chat", exact: true });
  await expect(rename.getByLabel("Chat name")).toBeFocused();
  const renameBounds = await rename.boundingBox();
  expect(Math.abs(renameBounds.x + renameBounds.width / 2 - 720)).toBeLessThan(2);
  expect(Math.abs(renameBounds.y + renameBounds.height / 2 - 487.5)).toBeLessThan(2);
  await rename.getByLabel("Chat name").fill("My clearance notes");
  await rename.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(title).toHaveText("My clearance notes");
  expect(await page.evaluate(() => window.__chatSessions[0].title_source)).toBe("manual");
  await title.click();
  await page.getByRole("menuitem", { name: "Pin", exact: true }).click();
  await expect(page.locator(".shell-pinned-chats")).toContainText("My clearance notes");
  await title.click();
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  const undo = page.locator(".study-chat-undo");
  await expect(undo).toContainText("archived");
  await undo.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(title).toHaveText("My clearance notes");
  await title.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const remove = page.getByRole("dialog", { name: "Delete chat", exact: true });
  await expect(remove).toContainText("30 days");
  await expect(remove).toContainText("archive icon beside Recent chats → Deleted → Restore");
  await page.screenshot({ path: test.info().outputPath("delete-conversation-desktop.png") });
  await remove.getByRole("button", { name: "Delete conversation", exact: true }).click();
  await expect(undo).toContainText("deleted");
  await page.evaluate(() => {
    window.__failRestore = true;
  });
  await undo.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(undo.getByRole("button", { name: "Retry undo", exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.__failRestore = false;
  });
  await undo.getByRole("button", { name: "Retry undo", exact: true }).click();
  await expect(title).toHaveText("My clearance notes");
  await title.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await remove.getByRole("button", { name: "Delete conversation", exact: true }).click();
  await undo.getByRole("button", { name: "Dismiss conversation update", exact: true }).click();
  await page.getByRole("button", { name: "Show archived chats", exact: true }).click();
  await page.getByRole("tab", { name: "Deleted", exact: true }).click();
  const trash = page.getByRole("dialog", { name: "Deleted chats", exact: true });
  await expect(trash).toContainText("My clearance notes");
  await page.screenshot({ path: test.info().outputPath("deleted-conversations-desktop.png") });
  await trash.getByRole("button", { name: "Restore My clearance notes", exact: true }).click();
  await expect(trash).toContainText("No deleted conversations.");
  await page.keyboard.press("Escape");
  await page
    .locator(".shell-pinned-chats")
    .getByRole("link", { name: /My clearance notes/ })
    .click();
  await expect(title).toHaveText("My clearance notes");
  await page.setViewportSize({ width: 390, height: 844 });
  await title.click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(rename).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("rename-conversation-mobile.png") });
  const mobileDialog = await rename.boundingBox();
  expect(mobileDialog.x).toBeGreaterThanOrEqual(16);
  expect(mobileDialog.x + mobileDialog.width).toBeLessThanOrEqual(374);
  await expect(rename).toHaveCSS("font-family", /Plus Jakarta Sans/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await rename.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 975 });
  await page.getByRole("link", { name: "New chat", exact: true }).click();
  await page.getByLabel("Study question").fill("Explain bioavailability");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText("Attachment synthetic answer", { exact: true })).toBeVisible();
  const created = await page.evaluate(() =>
    window.__calls.find((call) => call.url.endsWith("/sessions") && call.method === "POST")
  );
  expect(created.body).toEqual({});
});

test("artifact preparation is visible before tool execution without exposing private planning", async ({
  page,
}) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.evaluate(() => {
    window.__holdReasoning = true;
    window.__progressCode = "creating_materials";
  });
  await page.getByLabel("Study question").fill("Create a presentation from our discussion");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const progress = page.locator(".aui-reasoning-root");
  await expect(
    progress.getByText("Preparing your study materials.", { exact: true })
  ).toBeVisible();
  await expect(progress.getByRole("button", { name: "Thinking…", exact: true })).toBeVisible();
  await expect(page.getByText("PRIVATE RAW THINKING", { exact: true })).toHaveCount(0);
  await expect(progress).not.toContainText("Working");
  await page.screenshot({ path: test.info().outputPath("artifact-preparation-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    progress.getByText("Preparing your study materials.", { exact: true })
  ).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("artifact-preparation-mobile.png") });
  await page.evaluate(() => window.__finishReasoning());
  await expect(progress.getByRole("button", { name: "Steps", exact: true })).toBeVisible();
});

test("image tiles preview locally, upload securely, reopen and recover", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  const pick = async () => {
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Attach study material", exact: true }).click();
    await (
      await chooser
    ).setFiles({ name: "synthetic-diagram.png", mimeType: "image/png", buffer: imageFixture });
  };
  const preview = page.getByRole("button", { name: "Preview synthetic-diagram.png", exact: true });
  await pick();
  await expect(preview).toBeVisible();
  expect(
    await page.evaluate(() => window.__calls.filter((c) => c.url.endsWith("/attachments")).length)
  ).toBe(0);
  await expect(preview.locator("img")).toHaveJSProperty("naturalWidth", 640);
  await page.screenshot({ path: test.info().outputPath("image-composer-desktop.png") });
  await preview.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  const lightbox = page.getByRole("dialog");
  await expect(lightbox).toHaveAccessibleName("Image preview");
  expect(
    await lightbox.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderWidth,
        padding: style.padding,
        shadow: style.boxShadow,
      };
    })
  ).toEqual({ background: "rgba(0, 0, 0, 0)", border: "0px", padding: "0px", shadow: "none" });
  await page.screenshot({ path: test.info().outputPath("image-lightbox-desktop.png") });
  await page.keyboard.press("Escape");
  await expect(preview).toBeFocused();
  await page.getByRole("button", { name: "Remove synthetic-diagram.png", exact: true }).click();
  await expect(preview).toHaveCount(0);
  await pick();
  await page.evaluate(() => {
    window.__failUpload = true;
  });
  await page.getByLabel("Study question").fill("Which sample does the arrow point to?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText("Upload failed. Remove and retry.", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => window.__calls.filter((c) => c.url.endsWith("/stream")).length)
  ).toBe(0);
  await page.getByRole("button", { name: "Remove synthetic-diagram.png", exact: true }).click();
  await page.evaluate(() => {
    window.__failUpload = false;
  });
  await pick();
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page
      .locator(".study-chat-message-attachments")
      .getByRole("button", { name: "Preview synthetic-diagram.png", exact: true })
  ).toBeVisible();
  const calls = await page.evaluate(() => window.__calls);
  expect(
    calls
      .filter((c) => c.url.endsWith("/preview"))
      .every((c) => c.authorization === "Bearer invalid-fixture-not-an-access-token")
  ).toBe(true);
  const sent = calls.find((c) => c.url.endsWith("/stream")).body;
  expect(sent.attachment_ids).toHaveLength(1);
  expect(JSON.stringify(sent)).not.toContain("base64");
  const userTurn = preview.locator("xpath=ancestor::*[contains(@class,'study-chat-turn')]");
  const bubble = userTurn.locator(".study-chat-bubble");
  await expect(
    bubble.getByRole("button", { name: "Preview synthetic-diagram.png", exact: true })
  ).toHaveCount(0);
  await expect(userTurn).not.toContainText("synthetic-diagram.png");
  const imageBounds = await preview.boundingBox();
  const bubbleBounds = await bubble.boundingBox();
  expect(imageBounds.y + imageBounds.height).toBeLessThanOrEqual(bubbleBounds.y);
  expect(
    Math.abs(imageBounds.x + imageBounds.width - bubbleBounds.x - bubbleBounds.width)
  ).toBeLessThan(1);
  expect(imageBounds.width).toBe(96);
  const copyButton = page.locator(".study-chat-actions > button").first();
  await expect(copyButton).toHaveCSS("min-width", "28px");
  await expect(copyButton.locator("svg")).toHaveCSS("width", "13px");
  expect(await page.evaluate(() => window.__calls.some((c) => c.url.includes("size=large")))).toBe(
    false
  );
  await page.evaluate(() => {
    window.__failLargePreview = true;
  });
  await preview.click();
  await expect(
    page.getByRole("button", { name: "Retry full-size preview", exact: true })
  ).toBeVisible();
  await expect(lightbox.locator("img")).toBeVisible();
  await page.evaluate(() => {
    window.__failLargePreview = false;
  });
  await page.getByRole("button", { name: "Retry full-size preview", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Retry full-size preview", exact: true })
  ).toHaveCount(0);
  expect((await lightbox.locator("img").boundingBox()).width).toBe(1200);
  expect(
    await page.evaluate(() =>
      window.__calls
        .filter((c) => c.url.includes("size=large"))
        .every((c) => c.authorization === "Bearer invalid-fixture-not-an-access-token")
    )
  ).toBe(true);
  await page.screenshot({ path: test.info().outputPath("image-lightbox-desktop.png") });
  await page.keyboard.press("Escape");
  await page.screenshot({ path: test.info().outputPath("image-message-desktop.png") });
  await page.reload({ waitUntil: "commit" });
  await expect(preview).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(copyButton).toHaveCSS("min-width", "32px");
  await preview.scrollIntoViewIfNeeded();
  await expect(preview.locator("img")).toHaveJSProperty("naturalWidth", 640);
  await page.screenshot({ path: test.info().outputPath("image-message-mobile.png") });
  await preview.click();
  await expect(lightbox).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("image-lightbox-mobile.png") });
  await page.getByRole("button", { name: "Close image preview", exact: true }).click();
  await expect(preview).toBeFocused();
  await preview.click();
  await page.locator(".study-chat-lightbox-overlay").click({ position: { x: 5, y: 5 } });
  await expect(lightbox).toHaveCount(0);
  await expect(preview).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.addInitScript(() => {
    window.__failImagePreview = true;
  });
  await page.reload({ waitUntil: "commit" });
  await expect(page.getByRole("button", { name: "Retry preview", exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.__failImagePreview = false;
  });
  await page.getByRole("button", { name: "Retry preview", exact: true }).click();
  await expect(preview).toBeVisible();
  expect(errors).toEqual([]);
});

test("saved branches, feedback, editing, files, voice and virtualized history", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await setupChat(page);
    await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
      waitUntil: "commit",
      timeout: 60000,
    });
    if (!process.env.LONG_ONLY) {
      await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible({
        timeout: 60000,
      });
      await expect(page.getByRole("button", { name: "Edit question", exact: true })).toBeVisible();
      const conversationComposerStyle = await page
        .locator(".study-chat-composer")
        .evaluate((element) => {
          const style = getComputedStyle(element);
          return {
            radius: style.borderRadius,
            padding: style.padding,
            background: style.backgroundColor,
            width: style.width,
          };
        });
      await page.getByRole("button", { name: "Regenerate response", exact: true }).click();
      await expect(page.getByText("Regenerated synthetic answer", { exact: true })).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Previous branch", exact: true })
      ).toBeEnabled();
      await page.getByRole("button", { name: "Previous branch", exact: true }).click();
      await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible();
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible();
      console.log("PASS regeneration, branch switching and selected branch reload");
      await page.getByRole("button", { name: "Helpful response", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Helpful response", exact: true })
      ).toHaveAttribute("aria-pressed", "true");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await expect(
        page.getByRole("button", { name: "Helpful response", exact: true })
      ).toHaveAttribute("aria-pressed", "true");
      console.log("PASS feedback persistence");
      await page.evaluate(() => {
        window.__failFeedback = true;
      });
      await page.getByRole("button", { name: "Unhelpful response", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Synthetic feedback save failure");
      await expect(
        page.getByRole("button", { name: "Unhelpful response", exact: true })
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Unhelpful response", exact: true })
      ).toHaveAttribute("aria-pressed", "false");
      await page.evaluate(() => {
        window.__failFeedback = false;
      });
      await page.getByRole("button", { name: "Unhelpful response", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Unhelpful response", exact: true })
      ).toHaveAttribute("aria-pressed", "true");
      await page.evaluate(() => {
        window.__failBranch = true;
      });
      await page.getByRole("button", { name: "Next branch", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Synthetic branch save failure");
      await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible();
      await page.evaluate(() => {
        window.__failBranch = false;
      });
      console.log(
        "PASS failed feedback can retry and rejected branch selection restores the saved path"
      );
      await page.getByRole("button", { name: "Edit question", exact: true }).click();
      await page.getByLabel("Edit question", { exact: true }).fill("Edited synthetic question");
      await page.getByRole("button", { name: "Save as new branch", exact: true }).click();
      await expect(page.getByText("Edited branch answer", { exact: true })).toBeVisible();
      await expect(page.getByText("Edited synthetic question", { exact: true })).toBeVisible();
      const edited = page
        .locator('.study-chat-message[data-role="user"]')
        .filter({ hasText: "Edited synthetic question" });
      await expect(edited.locator(".study-chat-actions .study-chat-branches")).toBeVisible();
      await expect(edited.locator(":scope > .study-chat-branches")).toHaveCount(0);
      console.log(
        "PASS native edit composer creates a new branch with the original inline branch switcher"
      );
      await page.getByRole("button", { name: "Voice input", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Finish recording", exact: true })
      ).toBeVisible();
      await page.getByRole("button", { name: "Finish recording", exact: true }).click();
      await expect(page.getByLabel("Study question")).toHaveValue("Synthetic spoken question");
      expect(await page.evaluate(() => window.__trackStopped)).toBe(true);
      console.log("PASS microphone lifecycle and API transcription into composer");
      await page.getByLabel("Study question").fill("Explain these attached notes");
      const chooser = page.waitForEvent("filechooser");
      await page.getByRole("button", { name: "Attach study material", exact: true }).click();
      await (
        await chooser
      ).setFiles({
        name: "synthetic-notes.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("Synthetic pharmacy notes"),
      });
      await expect(page.locator(".study-chat-composer-attachments")).toContainText(
        "synthetic-notes.txt"
      );
      const streamsBeforeBlank = await page.evaluate(
        () => window.__calls.filter((item) => item.url.endsWith("/stream")).length
      );
      await page.getByLabel("Study question").fill("   ");
      await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
      await page.getByLabel("Study question").press("Enter");
      await expect(page.getByLabel("Study question")).toHaveValue("   ");
      expect(
        await page.evaluate(
          () => window.__calls.filter((item) => item.url.endsWith("/stream")).length
        )
      ).toBe(streamsBeforeBlank);
      await page.getByLabel("Study question").fill("Explain these attached notes");

      await page.getByRole("button", { name: "Send message", exact: true }).click();
      await expect(page.getByText("Attachment synthetic answer", { exact: true })).toBeVisible();
      expect(
        await page.evaluate(
          () =>
            window.__calls.filter((item) => item.url.endsWith("/stream")).at(-1).body.attachment_ids
              .length
        )
      ).toBe(1);
      await expect(page.locator('.study-chat-message[data-role="user"]').last()).toContainText(
        "synthetic-notes.txt"
      );
      const sources = page
        .locator('.study-chat-message[data-role="assistant"]')
        .last()
        .locator(".study-chat-sources > div");
      await expect(sources.locator("span")).toHaveCount(1);
      await expect(sources).toHaveText("Synthetic course document");
      console.log("PASS attachment picker, authenticated upload and server attachment references");
      for (const theme of ["dark", "light", "sepia"]) {
        await page.evaluate((theme) => window.__setChatTestTheme(theme), theme);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        for (const width of [1440, 375]) {
          await page.setViewportSize({ width, height: 975 });
          await expect(
            page.getByText("Attachment synthetic answer", { exact: true })
          ).toBeVisible();
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)
          ).toBe(true);
          if (theme === "dark")
            await page.screenshot({
              path: test.info().outputPath(`chat-interactions-${width}-dark.png`),
              fullPage: true,
            });
        }
      }
      await page.evaluate(() => window.__setChatTestTheme("dark"));
      await page.setViewportSize({ width: 1440, height: 975 });
      console.log("PASS interaction controls in desktop/mobile Dark, Light and Sepia");
      await page.evaluate(() => {
        window.__failStream = true;
      });
      await page.getByLabel("Study question").fill("Question during an outage");
      await page.getByRole("button", { name: "Send message", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Synthetic service unavailable");
      await page.evaluate(() => {
        window.__failStream = false;
      });
      await page.getByLabel("Study question").fill("Question after recovery");
      await page.getByRole("button", { name: "Send message", exact: true }).click();
      await expect(page.getByRole("alert")).toHaveCount(0);
      expect(
        await page.evaluate(() => {
          const calls = window.__calls.filter((item) => item.url.endsWith("/stream"));
          return calls.at(-1).body.parent_message_id === calls.at(-2).body.parent_message_id;
        })
      ).toBe(true);
      console.log("PASS a failed turn can recover without sending an unsaved parent ID");
      const transcriptions = await page.evaluate(
        () => window.__calls.filter((item) => item.url.endsWith("/transcribe")).length
      );
      await page.getByRole("button", { name: "Voice input", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Finish recording", exact: true })
      ).toBeVisible();
      await page.getByRole("link", { name: "New chat", exact: true }).click();
      await expect(page.getByLabel("Study question")).toHaveValue("");
      await expect(
        page.getByRole("heading", { name: /^Good (morning|afternoon|evening),/ })
      ).toBeVisible();
      await expect(page.getByText("What would you like to learn or work on today?")).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
      await page.getByLabel("Study question").fill("   ");
      await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
      const question = page.getByLabel("Study question");
      await question.fill("First line\nSecond line\nThird line");
      await expect(page.locator(".study-chat-composer")).not.toHaveAttribute("data-compact", "");
      const expanded = await page.locator(".study-chat-composer").evaluate((element) => ({
        input: element.querySelector("textarea").getBoundingClientRect().bottom,
        toolbar: element.querySelector(".p-study-composer-toolbar").getBoundingClientRect().top,
      }));
      expect(expanded.input).toBeLessThanOrEqual(expanded.toolbar);
      await page.screenshot({
        path: test.info().outputPath("chat-composer-expanded-1440-dark.png"),
      });
      await question.fill("");
      await page.getByLabel("Study question").fill("");
      await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
      await expect(page.locator(".study-chat-recent")).toHaveCount(0);
      await expect(page.locator(".study-chat-composer")).toHaveAttribute(
        "data-variant",
        "adaptive"
      );
      const welcomeStyle = await page.locator(".study-chat-composer").evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        width: getComputedStyle(element).width,
        height: element.getBoundingClientRect().height,
      }));
      expect(welcomeStyle.background).toBe(conversationComposerStyle.background);
      expect(welcomeStyle.width).toBe(conversationComposerStyle.width);
      expect(welcomeStyle.height).toBe(53);
      await expect(page.locator(".study-chat-composer")).toHaveAttribute("data-compact", "");
      const welcomeGeometry = await page.locator(".study-chat-welcome").evaluate((element) => {
        const intro = element.querySelector(".study-chat-intro").getBoundingClientRect();
        const tools = element.querySelector(".study-chat-tools").getBoundingClientRect();
        const composer = element.querySelector(".study-chat-composer");
        return {
          center: (intro.top + tools.bottom) / 2,
          viewportCenter: innerHeight / 2,
          radius: parseFloat(getComputedStyle(composer).borderTopLeftRadius),
          height: composer.getBoundingClientRect().height,
        };
      });
      expect(Math.abs(welcomeGeometry.center - welcomeGeometry.viewportCenter)).toBeLessThan(3);
      expect(welcomeGeometry.radius).toBeGreaterThanOrEqual(welcomeGeometry.height / 2);
      await expect(page.locator(".study-chat-suggestions")).toHaveCount(0);
      await expect(page.locator(".study-chat-tool-card")).toHaveCount(4);
      expect(
        await page
          .locator(".study-chat-tool-card")
          .first()
          .evaluate((el) => el.getBoundingClientRect().height)
      ).toBeLessThanOrEqual(48);
      expect(
        await page
          .locator(".study-chat-composer")
          .evaluate((el) => el.getBoundingClientRect().height)
      ).toBe(53);
      await page.getByRole("button", { name: "See all", exact: true }).click();
      await expect(page.locator(".study-chat-tool-card")).toHaveCount(8);
      await expect(
        page.getByRole("button", { name: "Chemical structures Coming later", exact: true })
      ).toBeDisabled();
      const streamsBeforeTool = await page.evaluate(
        () => window.__calls.filter((item) => item.url.endsWith("/stream")).length
      );
      await page
        .getByRole("button", { name: "Make slides Presentation decks for your topic", exact: true })
        .click();
      await expect(page.getByLabel("Study question")).toHaveValue(
        "Create a PowerPoint presentation about: "
      );
      expect(
        await page.evaluate(
          () => window.__calls.filter((item) => item.url.endsWith("/stream")).length
        )
      ).toBe(streamsBeforeTool);
      await page.setViewportSize({ width: 375, height: 975 });
      await expect(page.getByRole("heading", { name: "Recent", exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Tools", exact: true })).toHaveCount(0);
      await expect(page.locator(".study-chat-composer")).toHaveAttribute(
        "data-variant",
        "adaptive"
      );
      await expect(page.getByLabel("Study question")).toHaveValue(
        "Create a PowerPoint presentation about: "
      );
      await page
        .getByLabel("Study question")
        .fill(
          "A naturally wrapped mobile question about pharmacology and clinical reasoning. ".repeat(
            12
          )
        );
      await expect(page.locator(".study-chat-composer")).not.toHaveAttribute("data-compact", "");
      const mobileExpansion = await page.locator(".study-chat-composer").evaluate((element) => ({
        text: element.querySelector("textarea").getBoundingClientRect().bottom,
        controls: element.querySelector(".p-study-composer-toolbar").getBoundingClientRect().top,
      }));
      expect(mobileExpansion.text).toBeLessThanOrEqual(mobileExpansion.controls);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await page.screenshot({
        path: test.info().outputPath("chat-composer-expanded-375-dark.png"),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 975 });
      await page.getByLabel("Study question").fill("");
      await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
      console.log(
        "PASS original compact input restored, centered welcome, removed prompt actions, compact tools, multiline controls and preserved mobile draft"
      );
      await page.screenshot({
        path: test.info().outputPath("chat-welcome-1440-dark.png"),
        fullPage: true,
      });
      // Stream real reasoning parts through the runtime, including manual disclosure ownership.
      for (const manual of [false, true]) {
        await page.evaluate(() => {
          window.__holdReasoning = true;
        });
        await page.getByLabel("Study question").fill("Synthetic reasoning disclosure test");
        await page.getByRole("button", { name: "Send message", exact: true }).click();
        const thinking = page.locator(".aui-reasoning-trigger").last();
        await expect(thinking).toHaveAttribute("aria-expanded", "true");
        await expect(thinking).toContainText("Thinking");
        await expect(page.locator(".aui-reasoning-scroll li").last()).toHaveText(
          "Checking your course materials."
        );
        await expect(
          page.locator(".aui-reasoning-scroll pre, .aui-reasoning-scroll code")
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Stop generating", exact: true })
        ).toHaveClass(/p-study-composer-submit/);
        await expect(page.getByRole("button", { name: "Voice input", exact: true })).toBeDisabled();
        await expect(
          page.getByRole("button", { name: "Stop generating", exact: true })
        ).toBeEnabled();
        if (manual) {
          await thinking.click();
          await page.evaluate(() => window.__moreReasoning());
          await expect(thinking).toHaveAttribute("aria-expanded", "false");
          await thinking.click();
        }
        await page.evaluate(() => window.__finishReasoning());
        await expect(thinking).toHaveText("Steps");
        await expect(thinking).toHaveAttribute("aria-expanded", manual ? "true" : "false");
        if (!manual) await thinking.click();
        await expect(page.locator(".aui-reasoning-scroll li").last()).toHaveText(
          "Checking your course materials."
        );
        await expect(
          page.locator(".aui-reasoning-scroll pre, .aui-reasoning-scroll code")
        ).toHaveCount(0);
        await expect(
          page.getByRole("button", { name: "Stop generating", exact: true })
        ).toHaveCount(0);
        await expect(page.getByRole("button", { name: "Voice input", exact: true })).toBeEnabled();
        await expect(
          page.getByRole("button", { name: "Send message", exact: true })
        ).toBeDisabled();
        await page.screenshot({
          path: test
            .info()
            .outputPath(`reasoning-${manual ? "manual" : "automatic"}-1440-dark.png`),
        });
        await page.getByRole("link", { name: "New chat", exact: true }).click();
      }
      await page.getByLabel("Study question").fill("Cancel synthetic response");
      await page.getByRole("button", { name: "Send message", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Stop generating", exact: true })
      ).toBeVisible();
      await page.getByRole("button", { name: "Stop generating", exact: true }).click();
      await expect(page.getByText("Response stopped.", { exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.__reasoningAborted)).toBe(true);
      await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Voice input", exact: true })).toBeEnabled();
      await page.getByRole("link", { name: "New chat", exact: true }).click();
      await page.evaluate(() => {
        window.__holdReasoning = false;
      });
      console.log(
        "PASS safe deduplicated progress auto-opens/collapses without code blocks, Stop uses the send position, mic stays separate, manual disclosure choices persist"
      );
      expect(
        await page.evaluate(
          () => window.__calls.filter((item) => item.url.endsWith("/transcribe")).length
        )
      ).toBe(transcriptions);
      await page.evaluate(() => {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new Error("Synthetic microphone permission denied");
        };
      });
      await page.getByRole("button", { name: "Voice input", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText("Synthetic microphone permission denied");
      console.log(
        "PASS navigation cancels microphone without late upload; permission failures are visible"
      );
    }
    await page.evaluate(() => {
      const tree = [];
      let parent = null;
      for (let i = 0; i < 240; i++) {
        const id = crypto.randomUUID();
        tree.push({
          id,
          parent_message_id: parent,
          role: i % 2 ? "assistant" : "user",
          content: `Synthetic long-history turn ${i}`,
          is_active_branch: true,
        });
        parent = id;
      }
      sessionStorage.setItem("interaction-tree", JSON.stringify(tree));
    });
    await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await expect(page.locator('[data-virtualized="true"]')).toBeVisible();
    await expect(page.getByText("Synthetic long-history turn 239", { exact: true })).toBeVisible();
    expect(await page.locator(".study-chat-message").count()).toBeLessThan(50);
    await page.locator(".study-chat-conversation").evaluate((element) => {
      element.scrollTop = 0;
    });
    await expect(page.getByText("Synthetic long-history turn 0", { exact: true })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    console.log("PASS long-history virtualization, scroll recovery and mobile overflow");
    expect(errors).toEqual([]);
    console.log("PASS no browser errors");
  } catch (error) {
    console.error("BROWSER ERRORS", errors);
    console.error("ORIGINAL FAILURE", error);
    console.error(
      await page
        .locator("body")
        .innerText({ timeout: 2000 })
        .catch(() => "Page unavailable")
    );
    throw error;
  }
});

test("session menus persist organization and share only the selected conversation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setupChat(page);
  await page.addInitScript(() => {
    window.__shareSafetyFixture = true;
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: async (value) => {
          window.__copiedTranscript = value;
        },
      },
    });
  });
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  const title = page.getByRole("button", { name: "Conversation options", exact: true });
  await expect(title).toHaveText("Synthetic study conversation", { timeout: 60000 });
  await expect(title).toBeEnabled();
  await expect(
    page.locator(".study-chat-thread-heading").getByText("New chat", { exact: true })
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Share", exact: true }).click();
  const share = page.getByRole("dialog", { name: "Share conversation", exact: true });
  await expect(share.getByLabel("Conversation preview")).toContainText("Original synthetic answer");
  expect(await share.getByLabel("Conversation preview").inputValue()).not.toMatch(
    /PRIVATE OTHER BRANCH|PRIVATE INTERNAL REASONING/
  );
  await share.getByRole("button", { name: "Copy conversation", exact: true }).click();
  expect(await page.evaluate(() => window.__copiedTranscript)).toContain(
    "Original synthetic question"
  );
  const download = page.waitForEvent("download");
  await share.getByRole("button", { name: "Download copy", exact: true }).click();
  await (await download).saveAs(test.info().outputPath("shared-conversation.md"));
  await page.keyboard.press("Escape");
  await title.click();
  await page.getByRole("menuitem", { name: "Pin", exact: true }).click();
  await title.click();
  await expect(page.getByRole("menuitem", { name: "Unpin", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await title.click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "Rename chat", exact: true });
  await rename.getByLabel("Chat name").fill("Renamed synthetic revision");
  await page.evaluate(() => {
    window.__failSessionMutation = true;
  });
  await rename.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(rename.getByRole("alert")).toContainText("Synthetic session update failure");
  await expect(page.locator(".study-chat-title-menu")).toContainText(
    "Synthetic study conversation"
  );
  await page.evaluate(() => {
    window.__failSessionMutation = false;
  });
  await rename.getByRole("button", { name: "Save name", exact: true }).click();
  await expect(rename).not.toBeVisible();
  await expect(title).toHaveText("Renamed synthetic revision");
  await expect(title).toBeFocused();
  const row = page
    .locator(".shell-sidebar .shell-chat-row")
    .filter({ hasText: "Renamed synthetic revision" });
  await row
    .getByRole("button", { name: "Options for Renamed synthetic revision", exact: true })
    .click();
  await expect(page.getByRole("menuitem", { name: "Archive", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: test.info().outputPath("chat-title-and-session-menu-1440-dark.png"),
  });
  await title.click();
  await page.screenshot({ path: test.info().outputPath("chat-title-dropdown-1440-dark.png") });
  await page.getByRole("menuitem", { name: "Archive", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^Good / })).toBeVisible();
  await expect(row).toHaveCount(0);
  await page
    .locator(".shell-sidebar")
    .getByRole("button", { name: "Show archived chats", exact: true })
    .click();
  const archive = page.getByRole("dialog", { name: "Archived chats", exact: true });
  await expect(
    archive.getByRole("link", { name: "Renamed synthetic revision", exact: true })
  ).toBeVisible();
  await archive
    .getByRole("button", { name: "Options for Renamed synthetic revision", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
  await expect(archive).toContainText("No archived conversations.");
  await page.keyboard.press("Escape");
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expect(title).toHaveText("Renamed synthetic revision");
  await title.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const remove = page.getByRole("dialog", { name: "Delete chat", exact: true });
  const before = await page.evaluate(
    () => window.__calls.filter((call) => call.method === "DELETE").length
  );
  await remove.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    await page.evaluate(() => window.__calls.filter((call) => call.method === "DELETE").length)
  ).toBe(before);
  await title.click();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await remove.getByRole("button", { name: "Delete conversation", exact: true }).click();
  await expect(page.getByRole("heading", { name: /^Good / })).toBeVisible();
  expect(
    await page.evaluate(() => window.__calls.filter((call) => call.method === "DELETE").length)
  ).toBe(before + 1);
  expect(errors).toEqual([]);
  console.log(
    "PASS owned session metadata, pin/rename failure-retry, sidebar menu, archive/restore, soft-delete confirmation and selected-branch copy/download without reasoning or hidden branches"
  );
});

test("presentation workspace previews actual slides, navigates, retries and clears on navigation", async ({
  page,
}) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await expect(page.getByText("Original synthetic answer", { exact: true })).toBeVisible({
    timeout: 60000,
  });
  await page.evaluate(() => {
    window.__artifactMode = true;
  });
  await page.getByLabel("Study question").fill("Create a five-slide presentation");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const preview = page.getByRole("complementary", { name: "Presentation preview", exact: true });
  const card = page.getByRole("button", {
    name: "Preview Synthetic study presentation",
    exact: true,
  });
  await expect(preview).toBeVisible();
  await expect(
    preview.getByRole("img", { name: "Slide 1: Synthetic study presentation", exact: true })
  ).toBeVisible();
  await expect(
    preview.getByRole("navigation", { name: "Slides", exact: true }).getByRole("button")
  ).toHaveCount(5);
  await expect(page.locator(".study-artifact-extension")).toHaveText("5 slides · pptx");
  await page.screenshot({ path: test.info().outputPath("presentation-workspace-desktop.png") });
  await preview.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(
    preview.getByRole("img", { name: "Slide 2: Study topic 1", exact: true })
  ).toBeVisible();
  await preview.getByRole("button", { name: "Slide 4: Study topic 3", exact: true }).click();
  await expect(preview.getByRole("status")).toContainText("Slide 4 of 5");
  await page.keyboard.press("Home");
  await expect(preview.getByRole("status")).toContainText("Slide 1 of 5");
  await preview.getByLabel("Slide zoom", { exact: true }).selectOption("150");
  expect(
    await preview
      .locator(".study-presentation-stage")
      .evaluate((element) => element.scrollWidth > element.clientWidth)
  ).toBe(true);
  await preview.getByLabel("Slide zoom", { exact: true }).selectOption("fit");
  await preview.getByRole("button", { name: "Close presentation preview", exact: true }).click();
  await expect(page.getByLabel("Study question")).toBeFocused();
  await card.click();
  await expect(preview.locator(".study-presentation-panel")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(card).toBeFocused();
  await page.evaluate(() => {
    window.__failPresentationPreview = true;
  });
  await card.click();
  await expect(preview.getByRole("alert")).toContainText("preview is unavailable");
  await expect(
    preview.getByRole("button", { name: "Download presentation", exact: true })
  ).toBeEnabled();
  await page.evaluate(() => {
    window.__failPresentationPreview = false;
  });
  await preview.getByRole("button", { name: "Retry preview", exact: true }).click();
  await expect(
    preview.getByRole("img", { name: "Slide 1: Synthetic study presentation", exact: true })
  ).toBeVisible();
  await preview.getByRole("button", { name: "Close presentation preview", exact: true }).click();
  await page.evaluate(() => {
    window.__holdPresentationPreview = true;
  });
  await card.click();
  await expect(preview.getByRole("status")).toContainText("Loading presentation");
  await preview.getByRole("button", { name: "Close presentation preview", exact: true }).click();
  expect(await page.evaluate(() => window.__previewAborted)).toBe(true);
  await page.evaluate(() => {
    window.__holdPresentationPreview = false;
  });
  await card.click();
  await expect(
    preview.getByRole("img", { name: "Slide 1: Synthetic study presentation", exact: true })
  ).toBeVisible();
  await page.getByRole("button", { name: "Collapse sidebar", exact: true }).click();
  const dock = await page
    .getByRole("button", { name: "Expand sidebar", exact: true })
    .boundingBox();
  const heading = await page
    .getByRole("button", { name: "Conversation options", exact: true })
    .boundingBox();
  expect(heading.x).toBeGreaterThanOrEqual(dock.x + dock.width + 4);
  await page.getByRole("button", { name: "Expand sidebar", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = page.getByRole("dialog", { name: "Presentation preview", exact: true });
  await expect(mobile).toBeVisible();
  await mobile.getByRole("button", { name: "Next slide", exact: true }).click();
  await expect(mobile.getByRole("status")).toContainText("Slide 2 of 5");
  await page.screenshot({ path: test.info().outputPath("presentation-workspace-mobile.png") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(mobile).not.toBeVisible();
  await expect(card).toBeFocused();
  const requests = await page.evaluate(() =>
    window.__calls.filter((call) => call.url.includes("/artifacts/presentation"))
  );
  expect(requests.length).toBeGreaterThan(0);
  expect(
    requests.every((call) => call.authorization === "Bearer invalid-fixture-not-an-access-token")
  ).toBe(true);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("Study topic");
  await page.setViewportSize({ width: 1440, height: 975 });
  await card.click();
  await page.getByRole("link", { name: "New chat", exact: true }).click();
  await expect(preview).not.toBeVisible();
});

test("presentation download retries and tool status stays inside Steps", async ({ page }) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.evaluate(() => {
    window.__artifactMode = true;
    window.__failArtifactDownload = true;
  });
  await page.getByLabel("Study question").fill("Make a synthetic presentation");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(
    page.getByText(
      "I've organized the discussion into five slides, pairing four synthetic study topics with concise learning points and revision examples. You can use the outline to review each topic in turn.",
      { exact: true }
    )
  ).toBeVisible();
  const reference = page.getByRole("link", { name: "Synthetic study reference", exact: true });
  await expect(reference).toHaveAttribute("href", "https://example.test/study");
  await expect(page.getByText("References supplied with this deck", { exact: true })).toBeVisible();
  await expect(page.locator(".study-chat-tool")).toHaveCount(0);
  await page.getByRole("button", { name: "Steps", exact: true }).click();
  await expect(page.locator(".aui-reasoning-content")).toContainText(
    "Create presentation: Completed"
  );
  await page.getByRole("button", { name: "Download", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("This file is unavailable.");
  await page.screenshot({ path: test.info().outputPath("artifact-download-retry-desktop.png") });
  await page.evaluate(() => {
    window.__failArtifactDownload = false;
  });
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Retry download", exact: true }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("Synthetic study presentation.pptx");
  expect(fs.readFileSync(await download.path())).toEqual(pptxFixture);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const requests = await page.evaluate(() =>
    window.__calls.filter((call) => call.url.includes("/api/v1/library/artifacts/download"))
  );
  expect(requests).toHaveLength(2);
  expect(
    requests.every(
      (call) =>
        new URL(call.url).pathname === "/api/v1/library/artifacts/download" &&
        call.authorization === "Bearer invalid-fixture-not-an-access-token"
    )
  ).toBe(true);
  await page.screenshot({ path: test.info().outputPath("presentation-card-desktop.png") });
  await page.getByRole("button", { name: "Close presentation preview", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("button", { name: "Download", exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath("presentation-card-mobile.png") });
});

test("timeout feedback stays with its response on desktop and mobile", async ({ page }) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  for (const [width, mode] of [
    [1440, "empty"],
    [390, "partial"],
  ]) {
    await page.setViewportSize({ width, height: 975 });
    await page.evaluate((mode) => {
      window.__sseTimeoutMode = mode;
    }, mode);
    await page.getByLabel("Study question").fill(`Synthetic timeout check ${mode}`);
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    const response = page.locator('.study-chat-message[data-role="assistant"]').last();
    const error = response.getByRole("alert");
    await expect(error).toHaveText("The answer timed out. Please try again.");
    await expect(page.locator(".study-chat-footer").getByRole("alert")).toHaveCount(0);
    await expect(response.getByText("No response was returned.", { exact: true })).toHaveCount(0);
    const spacing = await response.evaluate((element) => {
      const alert = element.querySelector('[role="alert"]');
      const previous = alert.previousElementSibling;
      return {
        gap: alert.getBoundingClientRect().top - previous.getBoundingClientRect().bottom,
        fontSize: getComputedStyle(alert).fontSize,
      };
    });
    expect(spacing.gap).toBeGreaterThanOrEqual(0);
    expect(spacing.gap).toBeLessThanOrEqual(20);
    expect(spacing.fontSize).toBe("13px");
    if (mode === "partial") await expect(response).toContainText("Synthetic partial response.");
    await error.scrollIntoViewIfNeeded();
    await page.screenshot({ path: test.info().outputPath(`inline-timeout-${width}.png`) });
    await page.evaluate(() => {
      window.__sseTimeoutMode = null;
    });
    await page.getByLabel("Study question").fill("Synthetic recovered message");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
});

test("general web answers show web references and actionable lookup failures", async ({ page }) => {
  await setupChat(page);
  await page.goto(`http://127.0.0.1:4178/?session=${session}`, {
    waitUntil: "commit",
    timeout: 60000,
  });
  await page.evaluate(() => {
    window.__webLookupMode = "answer";
  });
  await page.getByLabel("Study question").fill("Search for a synthetic public event result");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const response = page.locator('.study-chat-message[data-role="assistant"]').last();
  await expect(response).toContainText("The synthetic public report verifies this fixture result.");
  await expect(response.locator(".study-chat-sources").getByRole("link")).toHaveText(
    "Synthetic public match report — Web source"
  );
  await expect(response.locator(".study-chat-sources").getByRole("link")).toHaveAttribute(
    "href",
    "https://example.test/report"
  );
  await response.getByRole("button", { name: "Steps", exact: true }).click();
  await expect(response).toContainText("Checking external sources.");
  await expect(response).not.toContainText("Checking your course materials.");
  await page.screenshot({ path: test.info().outputPath("general-web-answer-desktop.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    window.__webLookupMode = "unavailable";
  });
  await page.getByLabel("Study question").fill("Another synthetic current fact");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const failed = page.locator('.study-chat-message[data-role="assistant"]').last();
  await expect(failed.getByRole("alert")).toHaveText(
    "Web search is not configured, so I cannot verify current information."
  );
  await expect(failed).not.toContainText("not found in your course materials");
  await expect(page.locator(".study-chat-footer").getByRole("alert")).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("general-web-unavailable-mobile.png") });
});

test("mobile Home Recents shows documents only", async ({ page }) => {
  await setupChat(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__PREVIEW_DOCUMENTS__ = [
      {
        id: "00000000-0000-4000-8000-000000000021",
        title: "Synthetic opened pharmacology",
        created_at: "2026-10-24T12:00:00Z",
      },
    ];
  });
  await page.goto("/?surface=home&state=r2", { waitUntil: "load", timeout: 60000 });
  const recents = page.getByRole("region", { name: "Recents", exact: true });
  await expect(recents.getByRole("button", { name: /Synthetic opened pharmacology/ })).toBeVisible({
    timeout: 60000,
  });
  await expect(recents.getByText("Synthetic study conversation", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: test.info().outputPath("mobile-home-document-recents.png") });
});

test("mobile Home sheet retains draft and attachments, streams, cancels and resets", async ({
  page,
}) => {
  test.setTimeout(90000);
  page.setDefaultTimeout(15000);
  page.setDefaultNavigationTimeout(60000);
  await setupChat(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?surface=home");
  const trigger = page.getByRole("textbox", { name: "Message PansGPT", exact: true });
  await expect(trigger).toHaveCSS("font-size", "16px");
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "PansGPT chat", exact: true });
  await expect(sheet).toBeVisible();
  expect(
    await page.evaluate(() => window.__calls.filter((call) => call.url.endsWith("/stream")).length)
  ).toBe(0);
  await expect
    .poll(async () => {
      const rect = await sheet.boundingBox();
      return rect.y + rect.height;
    })
    .toBeLessThanOrEqual(845);
  expect((await sheet.boundingBox()).y).toBeGreaterThanOrEqual(14);
  await expect(sheet.locator(".mobile-home-chat-header .auth-brand-mark")).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "New chat", exact: true })).toHaveCSS(
    "border-radius",
    "50%"
  );
  const input = sheet.getByLabel("Study question", { exact: true });
  await expect(input).toHaveCSS("font-size", "16px");
  expect(
    (await sheet.getByRole("button", { name: "New chat", exact: true }).boundingBox()).height
  ).toBe(40);
  await input.fill("A private unfinished question");
  await sheet.getByRole("button", { name: "Show chat history", exact: true }).click();
  const history = sheet.getByRole("region", { name: "Chat history", exact: true });
  await expect(
    history.getByRole("button", { name: "Synthetic study conversation", exact: true })
  ).toBeVisible();
  await expect(sheet.getByRole("button", { name: "New chat", exact: true })).toHaveCount(0);
  await expect(
    sheet.getByRole("button", { name: "Conversation options", exact: true })
  ).toHaveCount(0);
  await sheet.getByRole("button", { name: "Search conversations", exact: true }).click();
  await sheet.getByRole("textbox", { name: "Search chat history", exact: true }).fill("synthetic");
  await expect(history.getByText("Original synthetic answer", { exact: true })).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("mobile-home-chat-history.png"),
    animations: "disabled",
  });
  await sheet.getByRole("button", { name: "Back to conversation", exact: true }).click();
  await expect(input).toHaveValue("A private unfinished question");
  await expect
    .poll(async () => {
      const rect = await sheet.locator(".study-chat-composer").boundingBox();
      return rect.x + rect.width;
    })
    .toBeLessThanOrEqual(378);
  const composerBounds = await sheet.locator(".study-chat-composer").boundingBox();
  expect(composerBounds.x + composerBounds.width).toBeLessThanOrEqual(378);
  const chooser = page.waitForEvent("filechooser");
  await sheet.getByRole("button", { name: "Attach study material", exact: true }).click();
  await (
    await chooser
  ).setFiles({
    name: "synthetic-sheet-note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic sheet attachment"),
  });
  await expect(
    sheet.getByRole("group", { name: "Document attachment synthetic-sheet-note.txt", exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("mobile-home-chat-sheet-draft.png"),
    animations: "disabled",
  });
  await sheet.getByRole("button", { name: "Close chat", exact: true }).click();
  await expect(sheet).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(input).toHaveValue("A private unfinished question");
  await expect(
    sheet.getByRole("group", { name: "Document attachment synthetic-sheet-note.txt", exact: true })
  ).toBeVisible();
  await sheet.getByRole("button", { name: "New chat", exact: true }).click();
  await expect(input).toHaveValue("");
  await expect(
    sheet.getByRole("group", { name: "Document attachment synthetic-sheet-note.txt", exact: true })
  ).toHaveCount(0);
  await input.fill("A synthetic sheet question");
  await sheet.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(sheet.getByText("Attachment synthetic answer", { exact: true })).toBeVisible();
  await expect(sheet.getByText(/PansGPT supports your studies/)).toHaveCount(0);
  await expect(sheet.getByRole("button", { name: "New chat", exact: true })).toBeInViewport();
  expect((await sheet.locator(".study-chat").boundingBox()).x).toBeGreaterThanOrEqual(0);
  await page.screenshot({
    path: test.info().outputPath("mobile-home-chat-sheet-answer.png"),
    animations: "disabled",
  });
  await expect(sheet.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  await expect(sheet.locator(".study-chat-thread-heading")).toHaveCount(0);
  await sheet.getByRole("button", { name: "Conversation options", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Pin", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    window.__holdReasoning = true;
  });
  await input.fill("A cancellable synthetic response");
  await sheet.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(sheet.getByRole("button", { name: "Stop generating", exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.__calls.filter((call) => call.url.endsWith("/stream")).length)
    )
    .toBe(2);
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__reasoningAborted)).toBe(true);
  await trigger.click();
  await expect(sheet.getByRole("button", { name: "Stop generating", exact: true })).toHaveCount(0);
  await input.fill("Still private on Home");
  expect(page.url()).not.toContain("private");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "Still private on Home"
  );
  await sheet.getByRole("button", { name: "Close chat", exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 975 });
  await expect(trigger).not.toBeVisible();
  await page.getByRole("link", { name: "New chat", exact: true }).first().click();
  await expect(page.getByLabel("Study question")).toHaveValue("");
});

test("mobile Home sheet opens a saved chat and keeps the first-chat notice usable", async ({
  page,
}) => {
  test.setTimeout(90000);
  await setupChat(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?surface=home", { waitUntil: "commit", timeout: 60000 });
  await page.evaluate((id) => {
    localStorage.removeItem(`pansgpt_disclaimer_accepted_${id}`);
  }, owner);
  await page.getByRole("textbox", { name: "Message PansGPT", exact: true }).click();
  const sheet = page.getByRole("dialog", { name: "PansGPT chat", exact: true });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("checkbox", { name: /I understand that PansGPT/ }).check();
  await sheet.getByRole("button", { name: "I Understand & Agree", exact: true }).click();
  await sheet.evaluate((element) => {
    element.dataset.identityCheck = "stable-sheet";
  });
  await sheet.getByRole("button", { name: "Show chat history", exact: true }).click();
  await sheet
    .getByRole("region", { name: "Chat history", exact: true })
    .getByRole("button", { name: "Synthetic study conversation", exact: true })
    .click();
  await expect(sheet.getByText("Original synthetic answer", { exact: true })).toBeVisible();
  await expect(sheet).toHaveAttribute("data-identity-check", "stable-sheet");
  await expect(sheet.getByRole("button", { name: "Share", exact: true })).toHaveCount(0);
  expect(page.url()).toContain("surface=home");
  await expect(
    sheet.getByRole("button", { name: "Conversation options", exact: true })
  ).toBeEnabled();
  await sheet.getByRole("button", { name: "Conversation options", exact: true }).click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Rename chat", exact: true }).getByLabel("Chat name")
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();
  await page.setViewportSize({ width: 375, height: 500 });
  await expect
    .poll(async () => {
      const rect = await sheet.locator(".study-chat-composer").boundingBox();
      return rect.y + rect.height;
    })
    .toBeLessThanOrEqual(500);
  await page.screenshot({
    path: test.info().outputPath("mobile-home-sheet-short-viewport.png"),
    animations: "disabled",
  });
  await sheet.getByRole("button", { name: "Voice input", exact: true }).click();
  await expect(sheet.getByRole("button", { name: "Finish recording", exact: true })).toBeVisible();
  await sheet.getByRole("button", { name: "Close chat", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__trackStopped)).toBe(true);
});

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

test("mobile Home sheet supports swipes without losing drafts or swallowing normal scrolling", async ({
  page,
}) => {
  test.setTimeout(120000);
  await setupChat(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?surface=home", { waitUntil: "load", timeout: 60000 });
  const trigger = page.getByRole("textbox", { name: "Message PansGPT", exact: true });
  await trigger.click();
  const sheet = page.getByRole("dialog", { name: "PansGPT chat", exact: true });
  const views = sheet.locator(".mobile-home-chat-views");
  await expect(sheet).toBeVisible();
  await expect.poll(async () => (await sheet.boundingBox()).y).toBe(14);
  await sheet.getByLabel("Study question", { exact: true }).fill("Keep my swipe draft");
  await swipeSheet(page, { x: 85, y: 250 }, { x: 260, y: 255 });
  await expect(views).toHaveAttribute("data-history", "true");
  await expect(
    sheet.getByRole("button", { name: "Search conversations", exact: true })
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("sheet-swipe-history.png"),
    animations: "disabled",
  });
  await swipeSheet(page, { x: 195, y: 28 }, { x: 195, y: 165 });
  await expect(sheet).not.toBeVisible();
  await trigger.click();
  await expect(views).toHaveAttribute("data-history", "false");
  await swipeSheet(page, { x: 85, y: 250 }, { x: 260, y: 255 });
  await expect(views).toHaveAttribute("data-history", "true");
  await swipeSheet(page, { x: 270, y: 270 }, { x: 90, y: 273 });
  await expect(views).toHaveAttribute("data-history", "false");
  await expect(sheet.getByLabel("Study question", { exact: true })).toHaveValue(
    "Keep my swipe draft"
  );
  await swipeSheet(page, { x: 80, y: 260 }, { x: 115, y: 260 });
  await expect(views).toHaveAttribute("data-history", "false");
  await swipeSheet(page, { x: 80, y: 260 }, { x: 235, y: 260 }, true);
  await expect(views).toHaveAttribute("data-history", "false");
  const input = await sheet.getByLabel("Study question", { exact: true }).boundingBox();
  await swipeSheet(
    page,
    { x: input.x + 35, y: input.y + 12 },
    { x: input.x + 155, y: input.y + 12 }
  );
  await expect(views).toHaveAttribute("data-history", "false");
  await swipeSheet(page, { x: 195, y: 28 }, { x: 195, y: 165 });
  await expect(sheet).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(sheet.getByLabel("Study question", { exact: true })).toHaveValue(
    "Keep my swipe draft"
  );
  await expect
    .poll(() =>
      page.evaluate(() => window.__calls.filter((call) => call.url.endsWith("/stream")).length)
    )
    .toBe(0);
  // A populated, scrollable conversation must consume a downward scroll instead of dismissing.
  await page.evaluate(() => {
    let parent = null;
    const tree = Array.from({ length: 36 }, (_, index) => {
      const id = crypto.randomUUID();
      const item = {
        id,
        parent_message_id: parent,
        role: index % 2 ? "assistant" : "user",
        content: `Synthetic scroll turn ${index}. ` + "Synthetic study material. ".repeat(12),
        is_active_branch: true,
      };
      parent = id;
      return item;
    });
    sessionStorage.setItem("interaction-tree", JSON.stringify(tree));
  });
  await page.reload();
  await trigger.click();
  await sheet.getByRole("button", { name: "Show chat history", exact: true }).click();
  await sheet
    .getByRole("region", { name: "Chat history", exact: true })
    .getByRole("button", { name: "Synthetic study conversation", exact: true })
    .click();
  const viewport = sheet.locator(".study-chat-conversation");
  await expect(viewport).toBeVisible();
  await viewport.evaluate((element) => {
    element.scrollTop = 450;
  });
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
  const before = await viewport.evaluate((element) => element.scrollTop);
  await swipeSheet(page, { x: 190, y: 290 }, { x: 195, y: 420 });
  await expect(sheet).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeLessThan(before);
  await page.screenshot({
    path: test.info().outputPath("sheet-native-scroll.png"),
    animations: "disabled",
  });
});

test("Home plus selects local attachments instead of opening search", async ({ page }) => {
  test.setTimeout(90000);
  await setupChat(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?surface=home", { waitUntil: "load", timeout: 60000 });
  await page.evaluate((id) => localStorage.removeItem(`pansgpt_disclaimer_accepted_${id}`), owner);
  const chooser = page.waitForEvent("filechooser");
  await page
    .locator(".shell-mobile-composer")
    .getByRole("button", { name: "Attach study material", exact: true })
    .click();
  await (
    await chooser
  ).setFiles({
    name: "synthetic-home-note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Synthetic attachment selected from Home"),
  });
  const sheet = page.getByRole("dialog", { name: "PansGPT chat", exact: true });
  await expect(sheet.getByRole("checkbox", { name: /I understand that PansGPT/ })).toBeVisible();
  expect(
    await page.evaluate(() => window.__calls.filter((call) => call.method === "POST").length)
  ).toBe(0);
  await sheet.getByRole("checkbox", { name: /I understand that PansGPT/ }).check();
  await sheet.getByRole("button", { name: "I Understand & Agree", exact: true }).click();
  await expect(
    sheet.getByRole("group", { name: "Document attachment synthetic-home-note.txt", exact: true })
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Search conversations", exact: true })).toHaveCount(
    0
  );
  expect(
    await page.evaluate(() => window.__calls.filter((call) => call.method === "POST").length)
  ).toBe(0);
  await sheet
    .getByLabel("Study question", { exact: true })
    .fill("Explain this synthetic attachment");
  await sheet.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(sheet.getByText("Attachment synthetic answer", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => window.__calls.find((call) => call.url.endsWith("/stream")).body.attachment_ids.length
    )
  ).toBe(1);
  await page.screenshot({
    path: test.info().outputPath("home-plus-attachment.png"),
    animations: "disabled",
  });
});
