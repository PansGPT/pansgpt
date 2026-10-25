import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect } from "@playwright/test";
import { openPreview } from "./open-preview";
import { videoSources } from "../preview/video-source-data";

test("all sixty-two video specimens preserve native frames and original SVG dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1900, height: 1100 });
  await openPreview(page, "/?section=video");
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: ".preview { max-width: none; }" });
  await page.evaluate(async () => {
    await Promise.all([...document.images].map((image) => image.decode().catch(() => undefined)));
  });
  await expect(page.locator("[data-video-source-id]")).toHaveCount(62);
  for (const family of videoSources)
    for (const source of family.variants) {
      const element = page.locator(`[data-video-source-id="${source.id}"]`);
      const frame = await element.boundingBox();
      expect(frame?.width, source.name).toBeCloseTo(source.width, 1);
      expect(frame?.height, source.name).toBeCloseTo(source.height, 1);
    }
  for (const image of await page.locator('img[src$=".svg"]:visible').all()) {
    const dimensions = await image.evaluate((element: HTMLImageElement) => ({
      loaded: element.complete && element.naturalWidth > 0,
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      nativeWidth: element.naturalWidth,
      nativeHeight: element.naturalHeight,
    }));
    expect(dimensions.loaded).toBe(true);
    expect(dimensions.width).toBeCloseTo(dimensions.nativeWidth, 0);
    expect(dimensions.height).toBeCloseTo(dimensions.nativeHeight, 0);
  }
  for (const theme of ["light", "dark", "sepia"] as const) {
    await page.getByLabel("Appearance").selectOption(theme);
    await page.screenshot({ path: `test-results/video-${theme}.png`, fullPage: true });
  }
});

test("native video playback, seeking, volume, captions, speed and keyboard controls work", async ({
  page,
}) => {
  await openPreview(page, "/?section=video");
  const bytes = readFileSync(resolve(__dirname, "fixtures/local-test.webm"));
  await page
    .getByLabel("Choose local video")
    .setInputFiles({ name: "local-test.webm", mimeType: "video/webm", buffer: bytes });
  const player = page.getByRole("region", { name: "Local video player", exact: true });
  const media = player.locator("video");
  await expect
    .poll(() => media.evaluate((element: HTMLVideoElement) => element.readyState))
    .toBeGreaterThanOrEqual(2);
  await player.getByRole("button", { name: "Play", exact: true }).last().click();
  await expect(player.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect
    .poll(() => media.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0.05);
  await player.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const seek = player.getByRole("slider", { name: "Playback position" });
  await seek.focus();
  await seek.press("End");
  await expect
    .poll(() => media.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(1);
  await seek.press("Home");
  await expect
    .poll(() => media.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeLessThan(0.2);
  const volume = player.getByRole("slider", { name: "Volume", exact: true });
  await volume.focus();
  await volume.press("Home");
  await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.volume)).toBe(0);
  await player.getByRole("button", { name: "Unmute", exact: true }).click();
  await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.volume)).toBe(1);
  await player.getByRole("button", { name: "Subtitles/CC", exact: true }).click();
  await expect(player.getByRole("button", { name: "Subtitles/CC", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  expect(await media.evaluate((element: HTMLVideoElement) => element.textTracks[0]?.mode)).toBe(
    "showing"
  );
  await player.getByRole("button", { name: "Playback speed", exact: true }).click();
  expect(await media.evaluate((element: HTMLVideoElement) => element.playbackRate)).toBe(1.25);
  const fullscreen = player.getByRole("button", { name: "Fullscreen", exact: true });
  if (await fullscreen.isEnabled()) {
    await fullscreen.click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await player.getByRole("button", { name: "Minimize", exact: true }).click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  }
  await player.focus();
  await player.press("m");
  await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.muted)).toBe(true);
  await player.press("ArrowUp");
  await expect.poll(() => media.evaluate((element: HTMLVideoElement) => element.muted)).toBe(false);
  await player.getByRole("button", { name: "Playback speed", exact: true }).focus();
  await expect(page.getByRole("tooltip")).toContainText("Playback speed");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 900 });
  await expect(media).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await page
    .getByLabel("Choose local video")
    .setInputFiles({
      name: "broken.webm",
      mimeType: "video/webm",
      buffer: Buffer.from("invalid media"),
    });
  await expect(player.getByRole("alert")).toContainText("could not be loaded");
});
