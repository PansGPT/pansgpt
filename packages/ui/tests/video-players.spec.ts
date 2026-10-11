import { test, expect } from "@playwright/test";
import { videoSources } from "../preview/video-source-data";

test("all sixty-two video specimens preserve native frames and original SVG dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1900, height: 1100 });
  await page.goto("/?section=video");
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
  await page.goto("/?section=video");
  // Record a real local video and add its known duration to the WebM Info element.
  // MediaRecorder's streaming WebM omits duration; no remote asset or fake media API is used.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 54;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas unavailable");
    const stream = canvas.captureStream(15);
    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp8" });
    recorder.ondataavailable = (event) => chunks.push(event.data);
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.start();
    let frame = 0;
    const interval = window.setInterval(() => {
      context.fillStyle = frame++ % 2 ? "#163c28" : "#397b51";
      context.fillRect(0, 0, 96, 54);
    }, 60);
    await new Promise((resolve) => window.setTimeout(resolve, 1800));
    recorder.stop();
    await stopped;
    window.clearInterval(interval);
    stream.getTracks().forEach((track) => track.stop());
    const recorded = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let info = -1;
    for (let i = 0; i < recorded.length - 4; i++)
      if (
        recorded[i] === 0x15 &&
        recorded[i + 1] === 0x49 &&
        recorded[i + 2] === 0xa9 &&
        recorded[i + 3] === 0x66
      ) {
        info = i;
        break;
      }
    if (info < 0) throw new Error("WebM Info missing");
    const sizeIndex = info + 4;
    let sizeLength = 1;
    while (!(recorded[sizeIndex]! & (1 << (8 - sizeLength)))) sizeLength++;
    let size = recorded[sizeIndex]! & ((1 << (8 - sizeLength)) - 1);
    for (let i = 1; i < sizeLength; i++) size = size * 256 + recorded[sizeIndex + i]!;
    let end = sizeIndex + sizeLength + size;
    if (end > recorded.length || !Number.isSafeInteger(end)) {
      // Some Chromium recorder builds encode Info with an unknown EBML size.
      // Its following Tracks element gives the actual metadata boundary.
      end = -1;
      for (let i = sizeIndex + sizeLength; i < recorded.length - 4; i++)
        if (
          recorded[i] === 0x16 &&
          recorded[i + 1] === 0x54 &&
          recorded[i + 2] === 0xae &&
          recorded[i + 3] === 0x6b
        ) {
          end = i;
          break;
        }
      if (end < 0) throw new Error("WebM Tracks boundary missing");
      size = end - sizeIndex - sizeLength;
    }
    const duration = new Uint8Array(11);
    duration.set([0x44, 0x89, 0x88]);
    new DataView(duration.buffer).setFloat64(3, 1800, false);
    const output = new Uint8Array(recorded.length + duration.length);
    output.set(recorded.slice(0, end));
    output.set(duration, end);
    output.set(recorded.slice(end), end + duration.length);
    let adjusted = size + duration.length;
    for (let i = sizeLength - 1; i >= 0; i--) {
      output[sizeIndex + i] = adjusted & 255;
      adjusted = Math.floor(adjusted / 256);
    }
    output[sizeIndex] = output[sizeIndex]! | (1 << (8 - sizeLength));
    return Array.from(output);
  });
  await page
    .getByLabel("Choose local video")
    .setInputFiles({ name: "local-test.webm", mimeType: "video/webm", buffer: Buffer.from(bytes) });
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
