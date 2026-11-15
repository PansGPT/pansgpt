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
  await expect(deleteDialog.getByText("Deleted conversations can be restored within 30 days")).toBeVisible();
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
  await expect(feedbackDialog.getByText("The chemical drawer button sometimes misses clicks on mobile.")).toBeVisible();
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
