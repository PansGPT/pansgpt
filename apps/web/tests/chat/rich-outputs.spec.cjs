const { test, expect } = require("@playwright/test");
const owner = "00000000-0000-4000-8000-000000000001";
const session = "00000000-0000-4000-8000-000000000003";
const artifacts = [
  {
    skill_name: "generate_flashcards",
    title: "Synthetic recall",
    content: {
      topic: "Synthetic recall",
      total: 2,
      cards: [
        { front: "First question", back: "First answer", hint: "First hint", difficulty: "easy" },
        { front: "Second question", back: "Second answer" },
      ],
    },
  },
  {
    skill_name: "plot_graph",
    title: "Synthetic trend",
    content: {
      type: "line",
      title: "Synthetic trend",
      data: {
        labels: ["One", "Two", "Three"],
        datasets: [
          { label: "Group A", data: [1, 3, 2] },
          { label: "Group B", data: [2, 1, 4] },
        ],
        x_label: "Time",
        y_label: "Value",
      },
    },
  },
  {
    skill_name: "plot_graph",
    title: "Synthetic flow",
    content: {
      type: "mermaid",
      title: "Synthetic flow",
      data: { code: "flowchart LR\n A[Read] --> B[Recall] --> C[Review]" },
    },
  },
  {
    skill_name: "generate_mnemonics",
    title: "Synthetic mnemonic",
    content: {
      concept: "Synthetic mnemonic",
      mnemonic: "READ",
      breakdown: ["Read the topic", "Explain it", "Ask questions", "Discuss"],
      clinical_notes: "Synthetic clinical note",
    },
  },
  {
    skill_name: "draw_chemical_structure",
    title: "Synthetic structure",
    content: {
      compound_name: "Synthetic compound",
      smiles: "CCO",
      formula: "C2H6O",
      notes: "Synthetic structure note",
      depiction_url: "https://must-not-load.example.test/image.png",
    },
  },
  {
    skill_name: "create_md",
    title: "Synthetic notes",
    file_extension: "md",
    storage_key: null,
    download_url: null,
    content:
      "# Revision notes\n\n- First point\n- Second point\n\n[Unsafe](javascript:alert(1))\n\n![Private image](https://must-not-load.example.test/notes.png)",
  },
  {
    skill_name: "create_doc",
    title: "Synthetic document",
    file_extension: "docx",
    content: { sections_count: 3 },
  },
  {
    skill_name: "create_pdf",
    title: "Synthetic revision sheet",
    file_extension: "pdf",
    content: { length: 120 },
  },
  {
    skill_name: "plot_graph",
    title: "Broken graph",
    content: { type: "line", data: { datasets: [{ data: ["bad"] }] } },
  },
];
async function setup(page, saved = true, outputArtifacts = artifacts, partial = false) {
  await page.addInitScript(
    ({ owner, session, artifacts, saved, partial }) => {
      localStorage.setItem(`pansgpt_disclaimer_accepted_${owner}`, "true");
      localStorage.setItem("pansgpt-theme", "dark");
      const original = window.fetch.bind(window);
      const meta = {
        id: session,
        user_id: owner,
        title: "Synthetic rich outputs",
        title_source: "manual",
        is_pinned: false,
        archived_at: null,
        created_at: "2026-11-18T00:00:00Z",
        updated_at: "2026-11-18T00:00:00Z",
      };
      const user = "00000000-0000-4000-8000-000000000011",
        assistant = "00000000-0000-4000-8000-000000000012";
      const tools = [
        {
          call_id: "search",
          tool_name: "web_search",
          status: "success",
          arguments: { query: "PRIVATE ARGUMENT" },
          result: { secret: "PRIVATE RESULT" },
        },
        { call_id: "cards", tool_name: "generate_flashcards", status: "success" },
      ];
      const messages = [
        {
          id: user,
          role: "user",
          content: "Show synthetic study outputs",
          parent_message_id: null,
          is_active_branch: true,
        },
        {
          id: assistant,
          role: "assistant",
          content: "Your synthetic study materials are ready.",
          parent_message_id: user,
          is_active_branch: true,
          extra_parts: {
            artifacts,
            tools,
            completion_warning: partial ? "additional_work_incomplete" : undefined,
          },
        },
      ];
      window.fetch = async (input, options = {}) => {
        const url = typeof input === "string" ? input : input.url;
        if (!url.includes("/api/v1/ai/chat"))
          return original(
            typeof input === "string"
              ? input.replace("http://127.0.0.1:4178", location.origin)
              : input,
            options
          );
        const json = (value) =>
          new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
        if (url.includes("/stream")) {
          sessionStorage.setItem("artifact-output-submitted", "true");
          sessionStorage.setItem(
            "artifact-output-posts",
            String(Number(sessionStorage.getItem("artifact-output-posts") || 0) + 1)
          );
          const frames = [
            [
              "init",
              { session_id: session, user_message_id: user, assistant_message_id: assistant },
            ],
            ["tool_start", { call_id: "cards", tool_name: "generate_flashcards", arguments: {} }],
            ...artifacts.map((a) => ["artifact_ready", a]),
            ["tool_end", tools[1]],
            ["text_chunk", { token: messages[1].content }],
            [
              "done",
              {
                full_text: messages[1].content,
                completion_warning: partial ? "additional_work_incomplete" : undefined,
              },
            ],
          ];
          return new Response(
            frames
              .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
              .join(""),
            { headers: { "Content-Type": "text/event-stream" } }
          );
        }
        if (url.includes("/metadata")) return json(meta);
        const path = new URL(url).pathname;
        if (path.endsWith("/sessions")) return json({ sessions: [meta] });
        return json({
          session: meta,
          messages: saved || sessionStorage.getItem("artifact-output-submitted") ? messages : [],
        });
      };
    },
    { owner, session, artifacts: outputArtifacts, saved, partial }
  );
}
for (const mobile of [false, true]) {
  test(`rich saved chat outputs support recall, graphs, notes and safe diagrams on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    const external = [];
    page.on("request", (req) => {
      if (req.url().includes("must-not-load")) external.push(req.url());
    });
    await setup(page);
    await page.goto(`/app/chat?session=${session}`, { waitUntil: "domcontentloaded" });
    const deck = page.getByRole("region", { name: "Synthetic recall", exact: true });
    await expect(deck).toBeVisible();
    await deck.getByRole("button", { name: "Show hint" }).click();
    await expect(deck.getByText("First hint")).toBeVisible();
    await deck.getByRole("button", { name: "Show answer", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(deck.getByText("First answer", { exact: true })).toBeVisible();
    await deck.getByRole("button", { name: "Got it" }).click();
    await expect(deck.getByRole("status")).toHaveText("1 of 2 reviewed");
    await deck.getByRole("button", { name: "Next card" }).click();
    await expect(deck.getByText("Second question")).toBeVisible();
    await deck.getByRole("button", { name: "Restart" }).click();
    await expect(deck.getByRole("status")).toHaveText("0 of 2 reviewed");
    const graph = page.getByRole("region", { name: "Synthetic trend", exact: true });
    await graph.getByRole("button", { name: "Group B" }).click();
    await expect(graph.getByRole("button", { name: "Group B" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(
      await graph
        .getByRole("button", { name: "Group A" })
        .evaluate((node) => Number(getComputedStyle(node).opacity))
    ).toBe(1);
    if (mobile)
      expect((await graph.locator("svg text").first().boundingBox()).height).toBeGreaterThanOrEqual(
        9
      );
    await graph.getByRole("button", { name: "View data" }).click();
    await expect(graph.getByRole("table")).toBeVisible();
    await graph.screenshot({
      path: test.info().outputPath(`graph-${mobile ? "mobile" : "desktop"}.png`),
    });
    await expect(page.getByTitle("Study diagram")).toHaveCount(1);
    await expect(page.getByTitle("Study diagram")).toHaveAttribute("sandbox", "");
    const frame = page.frameLocator('iframe[title="Study diagram"]');
    await expect(frame.locator("svg")).toBeVisible();
    await page.getByRole("button", { name: "Read study notes" }).click();
    await expect(page.getByRole("heading", { name: "Revision notes" })).toBeVisible();
    await expect(page.getByText("This preview isn’t available.", { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Used 2 study tools" }).click();
    await expect(page.getByText("Web search", { exact: true })).toBeVisible();
    await expect(page.getByText("PRIVATE ARGUMENT")).toHaveCount(0);
    await expect(page.getByText("PRIVATE RESULT")).toHaveCount(0);
    expect(external).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true
    );
    await deck.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: test.info().outputPath(`rich-${mobile ? "mobile" : "desktop"}.png`),
    });
    await page.reload();
    await expect(page.getByRole("region", { name: "Synthetic recall", exact: true })).toBeVisible();
  });
}
test("chart variants and blocked diagrams remain readable across themes", async ({ page }) => {
  await setup(page, true, [
    {
      skill_name: "plot_graph",
      title: "Synthetic bars",
      content: {
        type: "bar",
        title: "Synthetic bars",
        data: { labels: ["A", "B"], datasets: [{ label: "Values", data: [-2, 3] }] },
      },
    },
    {
      skill_name: "plot_graph",
      title: "Synthetic scatter",
      content: {
        type: "scatter",
        title: "Synthetic scatter",
        data: {
          datasets: [
            {
              label: "Samples",
              data: [
                { x: 1, y: 2 },
                { x: 2, y: 4 },
              ],
            },
          ],
        },
      },
    },
    {
      skill_name: "plot_graph",
      title: "Blocked diagram",
      content: {
        type: "mermaid",
        title: "Blocked diagram",
        data: { code: "flowchart LR\n A[<img src=https://must-not-load.example.test/image> ]" },
      },
    },
  ]);
  await page.goto(`/app/chat?session=${session}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("img", { name: /Synthetic bars/ })).toBeVisible();
  await expect(page.getByRole("img", { name: /Synthetic scatter/ })).toBeVisible();
  await expect(
    page.getByText("This diagram couldn’t be displayed.", { exact: false })
  ).toBeVisible();
  await expect(page.getByTitle("Study diagram")).toHaveCount(0);
  for (const theme of ["light", "sepia", "dark"]) {
    await page.evaluate((theme) => window.__setChatTestTheme(theme), theme);
    await expect(page.getByRole("region", { name: "Synthetic bars", exact: true })).toBeVisible();
    const colors = await page
      .locator(".chat-rich-card")
      .first()
      .evaluate((node) => ({
        background: getComputedStyle(node).backgroundColor,
        text: getComputedStyle(node).color,
      }));
    expect(colors.background).not.toBe(colors.text);
  }
});
test("live artifact events use the same rich cards", async ({ page }) => {
  await setup(page, false);
  await page.goto(`/app/chat?session=${session}`);
  await page.getByRole("textbox").fill("Create synthetic recall materials");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByRole("region", { name: "Synthetic recall", exact: true })).toBeVisible();
  await expect(page.getByRole("img", { name: /Synthetic trend/ })).toBeVisible();
});

for (const mobile of [false, true]) {
  test(`a saved graph stays usable when later work fails on ${mobile ? "mobile" : "desktop"}`, async ({
    page,
  }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await setup(page, false, [artifacts[1]], true);
    await page.goto(`/app/chat?session=${session}`);
    await page.getByRole("textbox").fill("Plot a synthetic graph");
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    const chart = page.getByRole("img", { name: /Synthetic trend/ });
    const notice = page.getByText(
      "Your material is ready. The rest of the response couldn’t finish.",
      { exact: true }
    );
    await expect(chart).toBeVisible();
    await expect(notice).toBeVisible();
    await expect(page.locator(".study-chat-error-row")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry", exact: true })).toHaveCount(0);
    const series = page.getByRole("button", { name: "Group A", exact: true });
    await series.click();
    await expect(series).toHaveAttribute("aria-pressed", "false");
    await page.screenshot({
      path: test.info().outputPath(`partial-graph-${mobile ? "mobile" : "desktop"}.png`),
    });
    await page.reload();
    await expect(chart).toBeVisible();
    await expect(notice).toBeVisible();
    expect(await page.evaluate(() => Number(sessionStorage.getItem("artifact-output-posts")))).toBe(
      1
    );
  });
}
