import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";
import { messageSources } from "../preview/message-source-data";
import { messagePrimitiveSources } from "../preview/message-primitive-source-data";

test("all 47 messaging specimens preserve Figma frames and native SVG geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1100 });
  await openPreview(page, "/?section=messages");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
  const mismatches: string[] = [];
  for (const source of [
    ...messageSources,
    ...messagePrimitiveSources.flatMap((family) => [...family.variants]),
  ]) {
    const frame = await page.locator(`[data-message-source-id="${source.id}"]`).boundingBox();
    if (
      !frame ||
      Math.abs(frame.width - source.width) > 0.15 ||
      Math.abs(frame.height - source.height) > 0.15
    )
      mismatches.push(
        `${source.id} ${source.name}: ${frame?.width}×${frame?.height}; expected ${source.width}×${source.height}`
      );
  }
  expect(mismatches).toEqual([]);
  for (const image of await page.locator('img[src$=".svg"]:visible').all()) {
    const geometry = await image.evaluate((element: HTMLImageElement) => ({
      loaded: element.complete && element.naturalWidth > 0,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      nativeWidth: element.naturalWidth,
      nativeHeight: element.naturalHeight,
    }));
    expect(geometry.loaded).toBe(true);
    const original = await image.evaluate(async (element: HTMLImageElement) => {
      const svg = new DOMParser().parseFromString(
        await (await fetch(element.src)).text(),
        "image/svg+xml"
      ).documentElement;
      return {
        width: Number.parseFloat(svg.getAttribute("width") ?? "0"),
        height: Number.parseFloat(svg.getAttribute("height") ?? "0"),
      };
    });
    expect(geometry.width).toBeCloseTo(original.width, 1);
    expect(geometry.height).toBeCloseTo(original.height, 1);
  }
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.screenshot({ path: `test-results/messages-${theme}.png`, fullPage: true });
  }
});

test("message sending, failure recovery, replies and reactions support keyboard use", async ({
  page,
}) => {
  await openPreview(page, "/?section=messages");
  const live = page.getByRole("textbox", { name: "Live message", exact: true });
  const log = page.getByRole("log", { name: "Sent messages" });
  await live.fill("   ");
  await live.press("Enter");
  await expect(log.locator("article")).toHaveCount(0);
  await live.fill("First line");
  await live.press("Shift+Enter");
  await live.press("a");
  await expect(live).toHaveValue("First line\na");
  await live.press("Enter");
  await expect(log).toContainText("First line");
  await expect(live).toHaveValue("");
  await page.getByLabel("Simulate send failure").check();
  await live.fill("Retry draft");
  await live.press("Enter");
  await expect(page.getByRole("alert")).toContainText("not delivered");
  await expect(live).toHaveValue("Retry draft");
  await page.getByLabel("Simulate send failure").uncheck();
  await live.press("Enter");
  await expect(log).toContainText("Retry draft");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const reaction = page
    .locator('[data-message-source-id="1244:352"]')
    .getByRole("button", { name: "Heart", exact: true });
  await reaction.focus();
  await reaction.press("Space");
  await expect(reaction).toHaveAttribute("aria-pressed", "true");
  await reaction.press("Enter");
  await expect(reaction).toHaveAttribute("aria-pressed", "false");
  await page
    .locator('[data-message-source-id="9241:555098"]')
    .getByRole("button", { name: "Open replied message" })
    .click();
  await expect(page.getByTestId("message-selection")).toHaveText("Open replied message");
  await page
    .locator('[data-message-source-id="9206:602526"]')
    .getByRole("button", { name: "Shortcuts" })
    .click();
  await expect(page.getByTestId("message-selection")).toHaveText("Shortcuts");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".p-message-typing img").first()).toHaveCSS("animation-name", "none");
  await page.getByLabel("Appearance").selectOption("dark");
  await page.setViewportSize({ width: 375, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});

test("native audio playback, seek, completion and media error remain truthful", async ({
  page,
}) => {
  await openPreview(page, "/?section=messages");
  const wav = Buffer.alloc(44 + 44100 * 2 * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(44100, 24);
  wav.writeUInt32LE(88200, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(wav.length - 44, 40);
  await page
    .getByLabel("Choose local audio")
    .setInputFiles({ name: "silence.wav", mimeType: "audio/wav", buffer: wav });
  const player = page.getByRole("region", { name: "Local audio player" });
  const seek = player.getByRole("slider", { name: "Seek audio" });
  await expect(seek).toHaveAttribute("max", "2");
  await player.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect(player.getByRole("button", { name: "Pause audio", exact: true })).toBeVisible();
  await expect
    .poll(() => player.locator("audio").evaluate((media: HTMLAudioElement) => media.currentTime))
    .toBeGreaterThan(0);
  await player.getByRole("button", { name: "Pause audio", exact: true }).click();
  await expect(player.getByRole("button", { name: "Play audio", exact: true })).toBeVisible();
  await seek.focus();
  await seek.press("End");
  await expect
    .poll(() => player.locator("audio").evaluate((media: HTMLAudioElement) => media.currentTime))
    .toBeCloseTo(2, 1);
  await page
    .getByLabel("Choose local audio")
    .setInputFiles({
      name: "broken.wav",
      mimeType: "audio/wav",
      buffer: Buffer.from("invalid audio"),
    });
  await expect(player.getByRole("alert")).toContainText("could not be loaded");
});
