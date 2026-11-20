const { test, expect } = require("@playwright/test");
const owner = "00000000-0000-4000-8000-000000000001";
const a = "00000000-0000-4000-8000-000000000021",
  b = "00000000-0000-4000-8000-000000000022";
async function setup(page) {
  await page.addInitScript(
    ({ owner, a, b }) => {
      localStorage.setItem(`pansgpt_disclaimer_accepted_${owner}`, "true");
      localStorage.setItem("pansgpt-theme", "dark");
      const state = JSON.parse(sessionStorage.getItem("audit-backend") || "null") || {
        messages: { [a]: [], [b]: [] },
        runs: {},
        posts: [],
        cancels: 0,
      };
      const connections = {};
      const persist = () => sessionStorage.setItem("audit-backend", JSON.stringify(state));
      const meta = (id) => ({
        id,
        user_id: owner,
        title: id === a ? "Synthetic A" : "Synthetic B",
        title_source: "manual",
        is_pinned: false,
        archived_at: null,
        document_id: null,
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-18T00:00:00Z",
        ...(state.metadata?.[id] || {}),
      });
      window.__chatSessions = [meta(a), meta(b)];
      const frame = (event, data) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      const json = (body, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      window.__auditState = state;
      window.__auditActivity = (id) => {
        connections[id]?.enqueue(
          new TextEncoder().encode(frame("activity", { stage: "generation" }))
        );
      };
      window.__auditProgress = (id, code, label) => {
        const update = { code, label, source: "model" };
        state.runs[id].activity = code;
        state.runs[id].public_progress.push(update);
        connections[id]?.enqueue(
          new TextEncoder().encode(
            frame("thinking_chunk", { code }) + frame("public_progress", update)
          )
        );
        persist();
      };
      window.__auditRecovery = (id) => {
        connections[id]?.enqueue(
          new TextEncoder().encode(
            frame("recovery", {
              state: "retrying",
              attempt: 1,
              retry_after_ms: 5000,
            })
          )
        );
      };
      window.__auditFailTool = (id, toolName) => {
        const run = state.runs[id];
        const data = { call_id: "synthetic-search", tool_name: toolName, arguments: {} };
        run.tools = [{ ...data, status: "success" }];
        run.tool_started = true;
        run.retry_blocked = !["rag_search", "web_search", "read_document"].includes(toolName);
        run.status = "error";
        run.error_code = "PROVIDER_ERROR";
        const question = state.messages[id].find((item) => item.id === run.user_message_id);
        question.attachment_metadata = {
          ...question.attachment_metadata,
          chat_run: { ...run, status: "error" },
        };
        connections[id]?.enqueue(
          new TextEncoder().encode(
            frame("tool_start", data) +
              frame("tool_end", { ...data, status: "success", result: {} }) +
              frame("error", { code: "PROVIDER_ERROR", retryable: true })
          )
        );
        connections[id]?.close();
        persist();
      };
      window.__auditLimitReads = () => {
        state.throttled = 2;
        state.readTimes = [];
        persist();
      };
      window.__auditComplete = (id, text = "Finished synthetic answer") => {
        const run = state.runs[id];
        if (!run || run.status !== "running") return;
        run.status = "complete";
        run.content = text;
        state.messages[id].push({
          id: run.assistant_message_id,
          role: "assistant",
          content: text,
          parent_message_id: run.user_message_id,
          is_active_branch: true,
        });
        const connection = connections[id];
        if (connection) {
          try {
            connection.enqueue(new TextEncoder().encode(frame("done", { full_text: text })));
            connection.close();
          } catch {}
        }
        persist();
      };
      window.__auditDrop = (id) => {
        try {
          connections[id]?.error(new TypeError("Synthetic connection loss"));
        } catch {}
      };
      const original = window.fetch.bind(window);
      window.fetch = async (input, options = {}) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("/api/v1/ai/chat"))
          return original(
            typeof input === "string"
              ? input.replace("http://127.0.0.1:4178", location.origin)
              : input,
            options
          );
        const path = new URL(url).pathname;
        const id = path.split("/sessions/")[1]?.split("/")[0] || a;
        const body = typeof options.body === "string" ? JSON.parse(options.body) : {};
        if (path.endsWith("/sessions"))
          return options.method === "POST" ? json(meta(a)) : json({ sessions: [meta(a), meta(b)] });
        if (path.endsWith("/metadata")) return json(meta(id));
        if (path.endsWith("/run")) {
          state.readTimes = [...(state.readTimes || []), Date.now()].slice(-100);
          if (state.throttled > 0) {
            state.throttled--;
            persist();
            const response = json({ detail: "Synthetic rate limit" }, 429);
            response.headers.set("Retry-After", "1");
            return response;
          }
          persist();
          return json(state.runs[id] || { status: "idle", run_id: null });
        }
        if (path.endsWith("/cancel")) {
          const run = state.runs[id];
          if (!run || !path.includes(run.run_id)) return json({ detail: "Wrong run" }, 409);
          state.cancels++;
          run.status = "cancelled";
          try {
            connections[id]?.close();
          } catch {}
          persist();
          return json(run);
        }
        if (path.endsWith("/stream")) {
          state.posts.push(body);
          let question =
            body.retry_message_id &&
            state.messages[id].find((item) => item.id === body.retry_message_id);
          if (!question) {
            const edited = state.messages[id].find((item) => item.id === body.edit_message_id);
            question = {
              id: crypto.randomUUID(),
              role: "user",
              content: body.message,
              parent_message_id: edited?.parent_message_id ?? body.parent_message_id ?? null,
              is_active_branch: true,
              context: {
                action_mode: body.action_mode ?? null,
                library_document: body.document_id
                  ? { id: body.document_id, title: "Synthetic surfactant source" }
                  : null,
              },
            };
            state.messages[id].push(question);
          }
          question.attachment_metadata = { message_context: question.context };
          const run = {
            run_id: crypto.randomUUID(),
            request_id: crypto.randomUUID(),
            status: "running",
            user_message_id: question.id,
            assistant_message_id: crypto.randomUUID(),
            content: window.__auditHoldText ? "" : "Partial synthetic answer",
            citations: [],
            tools: [],
            artifacts: [],
            public_progress: [],
            retryable: true,
            tool_started: false,
          };
          state.runs[id] = run;
          const fail = window.__auditFailNext;
          window.__auditFailNext = false;
          if (fail) {
            run.status = "error";
            run.error_code = "TIMEOUT";
            run.content = "";
            question.attachment_metadata = {
              ...question.attachment_metadata,
              chat_run: { ...run, status: "error" },
            };
          }
          persist();
          const stream = new ReadableStream({
            start(controller) {
              connections[id] = controller;
              controller.enqueue(
                new TextEncoder().encode(
                  frame("init", {
                    session_id: id,
                    run_id: run.run_id,
                    request_id: run.request_id,
                    user_message_id: run.user_message_id,
                    assistant_message_id: run.assistant_message_id,
                    context: question.context,
                  })
                )
              );
              if (fail) {
                controller.enqueue(
                  new TextEncoder().encode(
                    frame("error", { code: "TIMEOUT", retryable: true, request_id: run.request_id })
                  )
                );
                controller.close();
              } else
                controller.enqueue(
                  new TextEncoder().encode(frame("text_chunk", { token: run.content }))
                );
              options.signal?.addEventListener(
                "abort",
                () => {
                  try {
                    controller.error(new DOMException("Cancelled", "AbortError"));
                  } catch {}
                },
                { once: true }
              );
            },
          });
          return new Response(stream, {
            headers: { "Content-Type": "text/event-stream", "X-Chat-Run-ID": run.run_id },
          });
        }
        return json({ session: meta(id), messages: state.messages[id] || [] });
      };
    },
    { owner, a, b }
  );
}
const sourceId = "01900000-0000-7000-8000-000000000001";
async function selectSourceAndTool(page) {
  await page.route("**/api/v1/library/catalog?*", (route) =>
    route.fulfill({
      json: {
        items: [
          {
            id: sourceId,
            title: "Synthetic surfactant source",
            course_code: "PCL 401",
            course_title: "Synthetic course",
            topic: "Surfactants",
            lecturer_name: null,
            page_count: 24,
            file_size_bytes: 1000,
            mime_type: "application/pdf",
            status: "active",
            embedding_status: "completed",
            target_levels: ["400"],
            academic_session: "2026/2027",
            semester: "first",
            created_at: "2026-11-11T00:00:00Z",
            updated_at: "2026-11-11T00:00:00Z",
            last_opened_at: null,
            last_page_read: null,
          },
        ],
        total: 1,
        limit: 60,
        offset: 0,
        courses: [],
        academic_sessions: [],
      },
    })
  );
  const menu = page.getByRole("button", { name: "Open uploads and study actions", exact: true });
  await menu.click();
  await page.getByRole("button", { name: "Create flashcards", exact: true }).click();
  await menu.click();
  await page.getByRole("button", { name: /Upload from library/ }).click();
  const picker = page.getByRole("dialog", { name: /^(Add|Upload) from library$/ });
  await picker.getByText("Synthetic surfactant source", { exact: true }).click();
  await picker.getByRole("button", { name: /Add to chat/ }).click();
  await expect(picker).toHaveCount(0);
}

for (const mobile of [false, true]) {
  test(`saved tool and library attachment survive failure reload retry and edit on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto(`/app/chat?session=${a}`);
    await selectSourceAndTool(page);
    await expect(page.locator(".study-chat-input-prefix")).toContainText("Create flashcards");
    await page.evaluate(() => {
      window.__auditFailNext = true;
    });
    await page
      .getByRole("textbox", { name: "Study question", exact: true })
      .fill("from this source");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    const tags = page.getByRole("group", { name: "Message selections" });
    const attachment = page.getByRole("group", {
      name: "Document attachment Synthetic surfactant source",
      exact: true,
    });
    await expect(tags).toContainText("Create flashcards");
    const inline = await tags.evaluate((element) => {
      const text = element.parentElement.querySelector(".study-chat-user-text");
      const range = document.createRange();
      range.setStart(text.firstChild, 0);
      range.setEnd(text.firstChild, 1);
      return {
        prefixTop: element.getClientRects()[0].top,
        textTop: range.getBoundingClientRect().top,
      };
    });
    expect(Math.abs(inline.prefixTop - inline.textTop)).toBeLessThan(4);
    await expect(attachment).toBeVisible();
    await expect(page.locator(".study-chat-composer .study-chat-library-context")).toHaveCount(0);
    await expect(tags).not.toContainText("Synthetic surfactant source");
    expect(
      await attachment.evaluate(
        (element) =>
          !!element.closest(".study-chat-message-attachments") &&
          !element.closest(".study-chat-bubble")
      )
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`library-attachment-${mobile ? "mobile" : "desktop"}.png`),
      animations: "disabled",
    });
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
    await page.reload();
    await expect(tags).toContainText("Create flashcards");
    await expect(attachment).toBeVisible();
    await expect(page.locator(".study-chat-composer .study-chat-library-context")).toHaveCount(0);
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__auditState.posts.length)).toBe(2);
    const retry = await page.evaluate(() => window.__auditState.posts.at(-1));
    expect(retry.action_mode).toBe("create_flashcards");
    expect(retry.document_id).toBe(sourceId);
    expect(
      await page.evaluate(
        (id) => window.__auditState.messages[id].filter((m) => m.role === "user").length,
        a
      )
    ).toBe(1);
    await page.evaluate((id) => window.__auditComplete(id), a);
    await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Edit question", exact: true }).click();
    const editor = page.locator(
      mobile ? '.study-chat-composer[data-editing="true"]' : ".study-chat-edit"
    );
    const tool = editor.locator(".study-chat-input-prefix");
    await expect(tool).toContainText("Create flashcards");
    await expect(page.getByRole("combobox", { name: "Tool for edited message" })).toHaveCount(0);
    await expect(
      editor.getByRole("group", {
        name: "Document attachment Synthetic surfactant source",
        exact: true,
      })
    ).toBeVisible();
    await expect(tool.locator("button")).toHaveCount(0);
    const editedInput = editor.getByRole("textbox", { name: "Edit question", exact: true });
    await editedInput.focus();
    await editedInput.evaluate((input) => input.setSelectionRange(4, 4));
    await editedInput.press("Backspace");
    await expect(tool).toBeVisible();
    await editedInput.evaluate((input) => input.setSelectionRange(0, 0));
    if (mobile)
      await editedInput.evaluate((input) =>
        input.dispatchEvent(
          new InputEvent("beforeinput", {
            inputType: "deleteContentBackward",
            bubbles: true,
            cancelable: true,
          })
        )
      );
    else await editedInput.press("Backspace");
    await expect(tool).toHaveCount(0);
    await page
      .getByRole("button", { name: mobile ? "Cancel editing" : "Cancel", exact: true })
      .click();
    await page.getByRole("button", { name: "Edit question", exact: true }).click();
    await expect(tool).toContainText("Create flashcards");
    await expect(
      editor.getByRole("group", {
        name: "Document attachment Synthetic surfactant source",
        exact: true,
      })
    ).toBeVisible();
    await page.screenshot({
      path: test.info().outputPath(`inline-edit-${mobile ? "mobile" : "desktop"}.png`),
      animations: "disabled",
    });
    await page
      .getByRole("textbox", { name: "Edit question", exact: true })
      .fill("from this revised source");
    await page
      .getByRole("button", { name: mobile ? "Send edited message" : "Send", exact: true })
      .click();
    await expect.poll(() => page.evaluate(() => window.__auditState.posts.length)).toBe(3);
    const edit = await page.evaluate(() => window.__auditState.posts.at(-1));
    expect(edit.action_mode).toBe("create_flashcards");
    expect(edit.document_id).toBe(sourceId);
    expect(edit.edit_message_id).toBeTruthy();
    await expect(tags).toContainText("Create flashcards");
    await expect(tags).not.toContainText("Synthetic surfactant source");
    await expect(attachment).toBeVisible();
    await page.evaluate((id) => window.__auditComplete(id), a);
    await page.screenshot({
      path: test.info().outputPath(`message-context-${mobile ? "mobile" : "desktop"}.png`),
      animations: "disabled",
    });
  });
}

async function send(page, text = "Explain this synthetic topic") {
  await page.getByRole("textbox", { name: "Study question", exact: true }).fill(text);
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText("Partial synthetic answer", { exact: true })).toBeVisible();
}
test("switching conversations preserves an offscreen run and reattaches without reposting", async ({
  page,
}) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await send(page);
  await page.locator(`a[href="/app/chat?session=${b}"]`).first().click();
  await expect(page.getByText("Partial synthetic answer", { exact: true })).toHaveCount(0);
  await page.locator(`a[href="/app/chat?session=${a}"]`).first().click();
  await expect(page.getByText("Partial synthetic answer", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__auditState.posts.length)).toBe(1);
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__auditState.cancels)).toBe(0);
});
for (const mobile of [false, true])
  test(`reload recovers a running response on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
    await send(page);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("Partial synthetic answer", { exact: true })).toBeVisible();
    await page.evaluate((id) => window.__auditComplete(id), a);
    await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.__auditState.posts.length)).toBe(1);
  });
test("snapshot throttling respects Retry-After and never reposts accepted inference", async ({
  page,
}) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await send(page);
  await page.evaluate(() => window.__auditLimitReads());
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByText("Partial synthetic answer", { exact: true })).toBeVisible();
  const state = await page.evaluate(() => window.__auditState);
  expect(state.readTimes.length).toBeGreaterThanOrEqual(3);
  // Development StrictMode can start two initial probes before either 429
  // arrives. The next read must wait after the most recent throttle response.
  expect(state.readTimes[2] - state.readTimes[1]).toBeGreaterThanOrEqual(900);
  expect(state.posts.length).toBe(1);
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
});

test("explicit Stop targets the owned run and prevents later completion", async ({ page }) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await send(page);
  await page.getByRole("button", { name: "Stop generating", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__auditState.cancels)).toBe(1);
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Response stopped.", { exact: true })).toBeVisible();
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toHaveCount(0);
});
test("lost response connection recovers partial output without replaying inference", async ({
  page,
}) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await send(page);
  await page.evaluate((id) => window.__auditDrop(id), a);
  await expect(page.getByRole("button", { name: "Stop generating", exact: true })).toBeVisible();
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.__auditState.posts.length)).toBe(1);
});
test("a saved failed question restores its Retry action after reload", async ({ page }) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    window.__auditFailNext = true;
  });
  await page
    .getByRole("textbox", { name: "Study question", exact: true })
    .fill("Synthetic recoverable question");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".study-chat-error-row")).toBeVisible();
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText("Partial synthetic answer", { exact: true })).toBeVisible();
  const state = await page.evaluate(() => window.__auditState);
  expect(state.posts).toHaveLength(2);
  expect(state.posts[1].retry_message_id).toBe(state.messages[a][0].id);
  expect(state.messages[a].filter((item) => item.role === "user")).toHaveLength(1);
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
});

for (const mobile of [false, true])
  test(`read-only document failure keeps Retry before and after reload on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
    await send(page);
    await page.evaluate((id) => window.__auditFailTool(id, "read_document"), a);
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "Retry", exact: true }).click();
    await expect(page.getByText("Partial synthetic answer", { exact: true })).toBeVisible();
    const state = await page.evaluate(() => window.__auditState);
    expect(state.posts).toHaveLength(2);
    expect(state.messages[a].filter((item) => item.role === "user")).toHaveLength(1);
  });

test("conversation title arrives while the answer is still running", async ({ page }) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await page.evaluate((id) => {
    window.__auditState.metadata = { [id]: { title: "New Chat", title_source: "pending" } };
  }, a);
  await send(page);
  const title = page.getByRole("button", { name: "Conversation options", exact: true });
  await expect(title).toHaveText("New chat");
  await page.evaluate((id) => {
    window.__auditState.metadata[id] = {
      title: "Surfactant Study Notes",
      title_source: "generated",
      updated_at: "2026-11-20T00:00:00Z",
    };
  }, a);
  await expect(title).toHaveText("Surfactant Study Notes");
  await expect(page.getByRole("button", { name: "Stop generating", exact: true })).toBeVisible();
  await page.evaluate((id) => window.__auditFailTool(id, "read_document"), a);
  await expect(title).toHaveText("Surfactant Study Notes");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
});

test("state-changing tools retain the replay fence after reload", async ({ page }) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await send(page);
  await page.evaluate((id) => window.__auditFailTool(id, "create_doc"), a);
  await expect(page.locator(".study-chat-error-row")).toBeVisible();
  await expect(page.locator(".study-chat-error-row")).toContainText("Please send a new message.");
  await expect(page.locator(".study-chat-error-row")).not.toContainText("generated results");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".study-chat-error-row")).toBeVisible();
  await expect(page.locator(".study-chat-error-row")).toContainText("Please send a new message.");
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => window.__auditState.posts.length)).toBe(1);
});

test("legacy provider flags restore a working Retry after reopening", async ({ page }) => {
  await setup(page);
  await page.goto(`/app/chat?session=${a}`);
  await page.evaluate(() => {
    window.__auditFailNext = true;
  });
  await page
    .getByRole("textbox", { name: "Study question", exact: true })
    .fill("Synthetic failed question");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("button", { name: "Retry", exact: true })).toBeVisible();
  await page.evaluate((id) => {
    const state = window.__auditState;
    const run = state.runs[id];
    run.error_code = "PROVIDER_ERROR";
    run.retryable = false;
    run.retry_blocked = false;
    state.messages[id].find((row) => row.id === run.user_message_id).attachment_metadata.chat_run =
      { ...run };
    sessionStorage.setItem("audit-backend", JSON.stringify(state));
  }, a);
  await page.reload();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__auditState.posts.length)).toBe(2);
  expect(
    await page.evaluate(
      (id) => window.__auditState.messages[id].filter((row) => row.role === "user").length,
      a
    )
  ).toBe(1);
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
});

test("failover keeps ordinary thinking until the elapsed slow threshold", async ({ page }) => {
  await setup(page);
  await page.clock.install();
  await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
  await send(page);
  await page.evaluate((id) => window.__auditRecovery(id), a);
  await expect(page.getByText("Trying again…", { exact: true })).toHaveCount(0);
  const slow = page.locator(".study-chat-live-status").filter({
    hasText: "This is taking longer than usual.",
  });
  await expect(slow).toHaveCount(0);
  await page.clock.fastForward(11000);
  await expect(slow).toHaveCount(0);
  await page.clock.fastForward(1500);
  await expect(slow).toBeVisible();
  await page.evaluate((id) => window.__auditRecovery(id), a);
  await expect(slow).toBeVisible();
  await page.evaluate((id) => window.__auditComplete(id), a);
  await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
  await expect(slow).toHaveCount(0);
});

for (const mobile of [false, true])
  test(`activity headings remain visible beside a truthful elapsed wait hint on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    await page.clock.install({ time: new Date("2026-11-19T00:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-20T00:00:00Z"));
    await page.goto(`/app/chat?session=${a}`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => {
      window.__auditHoldText = true;
    });
    await page
      .getByRole("textbox", { name: "Study question", exact: true })
      .fill("Create synthetic flashcards");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__auditState.posts.length)).toBe(1);
    await page.evaluate(
      (id) =>
        window.__auditProgress(id, "creating_materials", "Building your surfactant flashcards"),
      a
    );
    const heading = page.locator(".study-chat-live-status .t-think");
    await expect(heading).toContainText("Building your surfactant flashcards");
    const hint = page.locator(".study-chat-wait-hint");
    for (let index = 0; index < 2; index++) {
      await page.clock.fastForward(10000);
      await page.evaluate((id) => window.__auditActivity(id), a);
      await expect(hint).toHaveCount(0);
    }
    await page.clock.fastForward(10500);
    await page.evaluate((id) => window.__auditActivity(id), a);
    await expect(hint).toBeVisible();
    await expect(heading).toContainText("Building your surfactant flashcards");
    await page.evaluate(
      (id) =>
        window.__auditProgress(id, "checking_materials", "Checking the surfactant definitions"),
      a
    );
    await expect(heading).toContainText("Checking the surfactant definitions");
    await expect(hint).toBeVisible();
    await page.clock.fastForward(250);
    await expect(heading.locator(".t-think-text:not(.is-exit)")).toHaveText(
      "Checking the surfactant definitions"
    );
    await page.screenshot({
      path: `../../.tmp/activity-heading-${mobile ? "mobile" : "desktop"}.png`,
      animations: "disabled",
    });
    await page.evaluate((id) => window.__auditComplete(id), a);
    await expect(hint).toHaveCount(0);
    await expect(page.getByText("Finished synthetic answer", { exact: true })).toBeVisible();
  });
