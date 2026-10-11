import { Buffer } from "node:buffer";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/?section=uploads");
  await page.evaluate(() => document.fonts.ready);
});

test("all source upload layouts and file rows preserve Figma dimensions", async ({ page }) => {
  test.setTimeout(60000);
  await expect(page.locator(".upload-base-fixture")).toHaveCount(3);
  for (const base of await page.locator(".upload-base-fixture").all())
    expect((await base.locator(".p-file-dropzone").boundingBox())?.height).toBe(126);
  await expect(page.locator(".upload-item-fixture")).toHaveCount(12);
  for (const fixture of await page.locator(".upload-item-fixture").all()) {
    const variant = await fixture.getAttribute("data-variant");
    const error = (await fixture.getAttribute("data-status")) === "error";
    expect((await fixture.locator(".p-file-upload-item").boundingBox())?.height).toBe(
      error ? 100 : variant === "fill" ? 74 : 98
    );
    for (const image of await fixture.locator("img").all())
      await image.evaluate(async (node) => {
        const image = node as HTMLImageElement;
        await image.decode();
        if (
          image.getBoundingClientRect().width !== image.naturalWidth ||
          image.getBoundingClientRect().height !== image.naturalHeight
        )
          throw new Error("Original SVG dimensions changed: " + image.src);
      });
  }
  await expect(page.locator(".upload-composed-fixture")).toHaveCount(8);
  for (const fixture of await page.locator(".upload-composed-fixture").all()) {
    const queued = (await fixture.getAttribute("data-queued")) === "true";
    const fill = (await fixture.getAttribute("data-variant")) === "fill";
    expect((await fixture.locator(".p-file-upload").boundingBox())?.height).toBe(
      queued ? (fill ? 388 : 460) : 126
    );
  }
  await page
    .locator('.upload-base-fixture[data-state="hover"] .p-file-dropzone')
    .screenshot({ path: "test-results/upload-hover.png" });
  await page
    .locator(
      '.upload-item-fixture[data-variant="fill"][data-icon-type="file-type"][data-status="error"] .p-file-upload-item'
    )
    .screenshot({ path: "test-results/upload-error.png" });
  await page
    .locator(
      '.upload-composed-fixture[data-variant="bar"][data-breakpoint="mobile"][data-queued="true"] .p-file-upload'
    )
    .screenshot({ path: "test-results/upload-queue-mobile.png" });
});

test("native file selection rejects invalid files, permits reselection, and supports retry/removal", async ({
  page,
}) => {
  const demo = page.getByRole("group", { name: "Interactive upload example" });
  const input = demo.getByLabel("Demo upload files");
  await input.setInputFiles([
    { name: "bad.png", mimeType: "image/png", buffer: Buffer.from("png") },
    { name: "large.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(1025) },
  ]);
  await expect(demo.getByRole("alert")).toContainText("unsupported file type");
  await expect(demo.getByRole("alert")).toContainText("exceeds the size limit");
  await expect(demo.getByRole("listitem")).toHaveCount(0);
  const file = { name: "notes.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF") };
  const chooserPromise = page.waitForEvent("filechooser");
  await demo.getByRole("button", { name: "Click to upload" }).click();
  await (await chooserPromise).setFiles(file);
  await expect(demo.getByRole("listitem")).toHaveCount(1);
  await expect(demo.getByRole("alert")).toHaveCount(0);
  await demo.getByRole("button", { name: "Simulate failure" }).click();
  await expect(demo.getByRole("alert")).toHaveText("Failed");
  await demo.getByRole("button", { name: "Try again" }).click();
  await expect(demo.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  await demo.getByRole("button", { name: "Simulate completion" }).click();
  await expect(demo.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  await demo.getByRole("button", { name: "Remove notes.pdf" }).click();
  await expect(demo.getByRole("listitem")).toHaveCount(0);
  await input.setInputFiles(file);
  await expect(demo.getByRole("status", { name: "Selection events" })).toHaveText("2");
});

test("dragging files selects only accepted files and disabled dropzones remain inactive", async ({
  page,
}) => {
  const data = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["pdf"], "dropped.pdf", { type: "application/pdf" }));
    transfer.items.add(new File(["png"], "invalid.png", { type: "image/png" }));
    return transfer;
  });
  const demo = page.getByRole("group", { name: "Interactive upload example" });
  const zone = demo.locator(".p-file-dropzone");
  await zone.dispatchEvent("dragenter", { dataTransfer: data });
  await expect(zone).toHaveAttribute("data-state", "hover");
  await zone.dispatchEvent("drop", { dataTransfer: data });
  await expect(zone).toHaveAttribute("data-state", "default");
  await expect(demo.getByRole("listitem")).toHaveCount(1);
  await expect(demo.getByRole("alert")).toContainText("invalid.png");
  const disabled = page.locator('.upload-base-fixture[data-state="disabled"] .p-file-dropzone');
  await expect(disabled.getByRole("button", { name: "Click to upload" })).toBeDisabled();
  await disabled.dispatchEvent("dragenter", { dataTransfer: data });
  await expect(disabled).toHaveAttribute("data-state", "disabled");
  await disabled.dispatchEvent("drop", { dataTransfer: data });
  await expect(page.getByRole("status", { name: "Last upload action" })).toHaveText("");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await demo.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
  await data.dispose();
});
